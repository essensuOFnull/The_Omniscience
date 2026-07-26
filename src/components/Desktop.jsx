import React, { useState, useEffect, useReducer, useMemo, useCallback, useRef } from 'react';
import { Box } from '@mui/material';
import DesktopWorkspace from './DesktopWorkspace';
import { initialState, windowManager } from '../state/windowManager';
import { getNewId, getNewZ } from '../state/windowManagerHelpers'; // предположим, что есть

const TAB_BAR_HEIGHT = 35;

export default function Desktop() {
	const [config, setConfig] = useState({ taskbarHeight: 40, overviewColumns: 3, overviewGap: 16 });
	const [tabs, setTabs] = useState([]);
	const [activeTabIndex, setActiveTabIndex] = useState(-1);
	const [apps, setApps] = useState([]);

	// Редуктор для управления всеми десктопами
	const reducer = useCallback((state, action) => {
		const handler = windowManager[action.type];
		if (!handler) return state;
		return handler(state, action.payload, { config, getNewId, getNewZ });
	}, [config]);

	const [state, dispatch] = useReducer(reducer, initialState);

	// Действия – обёртка, добавляющая desktopId
	const actions = useMemo(() => {
		const createAction = (type) => (desktopId, ...args) => {
			dispatch({ type, payload: { desktopId, ...args[0] } });
		};
		const result = {};
		for (const type of Object.keys(windowManager)) {
			result[type] = createAction(type);
		}
		return result;
	}, []);

	// Подписка на обновление вкладок из main процесса
	useEffect(() => {
		const updateHandler = (data) => {
			setTabs(data.tabsData || []);
			setActiveTabIndex(data.activeTabIndex ?? -1);
			// Синхронизация десктопов: создаём/удаляем состояния
			const newDesktopIds = data.tabsData
				.filter(tab => tab.type === 'desktop')
				.map(tab => tab.id);
			// Удаляем состояния для отсутствующих десктопов
			Object.keys(state.desktops).forEach(id => {
				if (!newDesktopIds.includes(id)) {
					actions.closeDesktop(id);
				}
			});
			// Создаём состояния для новых десктопов
			newDesktopIds.forEach(id => {
				if (!state.desktops[id]) {
					actions.createDesktop(id);
				}
			});
			// Если активная вкладка – desktop, переключаем активный десктоп
			const activeTab = data.tabsData[data.activeTabIndex];
			if (activeTab && activeTab.type === 'desktop') {
				if (state.activeDesktopId !== activeTab.id) {
					actions.switchDesktop(activeTab.id);
				}
			} else {
				// Если активная вкладка не desktop, сбрасываем активный десктоп (или оставляем последний)
				// Можно оставить последний активный, чтобы не терять состояние
			}
		};
		if (window.electron_tabBar_API?.tabs_on_update) {
			window.electron_tabBar_API.tabs_on_update(updateHandler);
		}
		return () => {
			// отписка (если есть)
		};
	}, [actions, state.desktops, state.activeDesktopId]);

	// Получение списка приложений
	useEffect(() => {
		window.electron_desktop_API?.getAppsList?.().then(setApps).catch(() => { });
	}, []);

	// Добавим useEffect для синхронизации размеров при активной веб/терминальной вкладке
	useEffect(() => {
		const activeTab = tabs[activeTabIndex];
		if (!activeTab || activeTab.type === 'desktop') {
			return;
		}
		const updateBounds = () => {
			const container = document.getElementById('web-content-container');
			if (!container) return;
			const rect = container.getBoundingClientRect();
			window.electron_desktop_API.setWebViewBounds(activeTab.id, {
				x: rect.left,
				y: rect.top,
				width: rect.width,
				height: rect.height,
			});
		};
		updateBounds();
		const observer = new ResizeObserver(updateBounds);
		const container = document.getElementById('web-content-container');
		if (container) observer.observe(container);
		return () => observer.disconnect();
	}, [activeTabIndex, tabs]);

	useEffect(() => {
		const handler = (id) => {
			const container = document.getElementById('web-content-container');
			if (!container) return;
			const rect = container.getBoundingClientRect();
			window.electron_desktop_API.setWebViewBounds(id, {
				x: rect.left,
				y: rect.top,
				width: rect.width,
				height: rect.height,
			});
		};
		window.electron_desktop_API.onRequestWebViewBounds(handler);
		return () => {
			// отписка
		};
	}, []);

	// Определяем, какая вкладка активна
	const activeTab = tabs[activeTabIndex] || null;
	const isDesktopActive = activeTab && activeTab.type === 'desktop';

	// Рендерим все десктопы (скрывая неактивные) и активный контент для web/xterm
	return (
		<Box
			sx={{
				position: 'fixed',
				top: TAB_BAR_HEIGHT,
				left: 0,
				right: 0,
				bottom: 0,
				display: 'flex',
				flexDirection: 'column',
				bgcolor: 'transparent',
				overflow: 'hidden',
			}}
		>
			{Object.keys(state.desktops).map(desktopId => (
				<DesktopWorkspace
					key={desktopId}
					desktopId={desktopId}
					state={state}
					actions={actions}
					config={config}
					apps={apps}
					active={state.activeDesktopId === desktopId}
				/>
			))}
			{!isDesktopActive && (
				<Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
					{activeTab && activeTab.type === 'web' && <div>Веб-вкладка: {activeTab.url}</div>}
					{activeTab && activeTab.type === 'xterm' && <div>Терминал</div>}
					{!activeTab && <div>Нет активной вкладки</div>}
				</Box>
			)}
		</Box>
	);
}