import React, { useState, useEffect, useReducer, useMemo, useCallback, useRef } from 'react';
import { Box } from '@mui/material';
import DesktopWorkspace from './DesktopWorkspace';
import { windowManager,initialState } from '../state/windowManager';
const {getNewId, getNewZ}=windowManager;

const TAB_BAR_HEIGHT = 35;

// Соответствие позиционных аргументов вызовов actions именам полей payload
const ACTION_ARG_NAMES = {
	setViewport: ['rect'],
	setGridViewport: ['rect'],
	setOverviewScrollTop: ['scrollTop'],
	setOverviewTab: ['tab'],
	focusWindow: ['windowId'],
	closeWindow: ['windowId'],
	deleteWindow: ['windowId'],
	animationComplete: ['windowId'],
	unminimizeWindow: ['windowId'],
	maximizeWindow: ['windowId'],
	unmaximizeWindow: ['windowId'],
	minimizeWindow: ['windowId', 'cx', 'cy'],
	setWindowRect: ['windowId', 'cx', 'cy', 'width', 'height'],
};

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

	const [state, dispatch] = useReducer(reducer, undefined, initialState);

	// Всегда актуальное состояние для обработчика обновления вкладок
	const stateRef = useRef(state);
	stateRef.current = state;

	// Действия – обёртка, добавляющая desktopId
	const actions = useMemo(() => {
		const createAction = (type) => (desktopId, ...args) => {
			const argNames = ACTION_ARG_NAMES[type];
			const payload = { desktopId };
			if (argNames) {
				argNames.forEach((name, i) => { payload[name] = args[i]; });
			} else if (args[0] && typeof args[0] === 'object') {
				Object.assign(payload, args[0]);
			}
			dispatch({ type, payload });
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
			Object.keys(stateRef.current.desktops).forEach(id => {
				if (!newDesktopIds.includes(id)) {
					actions.closeDesktop(id);
				}
			});
			// Создаём состояния для новых десктопов
			newDesktopIds.forEach(id => {
				if (!stateRef.current.desktops[id]) {
					actions.createDesktop(id);
				}
			});
			// Если активная вкладка – desktop, переключаем активный десктоп
			const activeTab = data.tabsData[data.activeTabIndex];
			if (activeTab && activeTab.type === 'desktop') {
				if (stateRef.current.activeDesktopId !== activeTab.id) {
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
	}, [actions]);

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