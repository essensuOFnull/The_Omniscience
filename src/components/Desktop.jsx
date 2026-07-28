import React, { useState, useEffect, useReducer, useMemo, useCallback, useRef } from 'react';
import { Box } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import DesktopWorkspace from './DesktopWorkspace';
import DesktopBar from './DesktopBar';
import { windowManager,initialState } from '../state/windowManager';

import VoidPoem from './VoidPoem';

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

export default function Desktop({ rootBar }) {
	const [config, setConfig] = useState({ taskbarHeight: 40, overviewColumns: 3, overviewGap: 16 });
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

	// Инициализация первого рабочего стола
	useEffect(() => {
		// Создаём первый рабочий стол при загрузке компонента
		if (Object.keys(stateRef.current.desktops).length === 0) {
			const desktopId = getNewId();
			actions.createDesktop(desktopId);
			actions.switchDesktop(desktopId);
		}
	}, [actions]);

	// Управление DesktopBar: обновляем его при изменении десктопов
	useEffect(() => {
		const desktopsArray = Object.entries(state.desktops).map(([id, desktop], index) => ({
			id,
			index: index + 1,
			desktop,
		}));

		if (rootBar) {
			const barElement = (
				<DesktopBar
					desktops={desktopsArray}
					activeDesktopId={state.activeDesktopId}
					onCreateDesktop={() => {
						const newId = getNewId();
						actions.createDesktop(newId);
						actions.switchDesktop(newId);
					}}
					onSwitchDesktop={(desktopId) => {
						actions.switchDesktop(desktopId);
					}}
					onDeleteDesktop={(desktopId) => {
						if (desktopsArray.length > 1) {
							const nextId = desktopsArray.find(d => d.id !== desktopId)?.id;
							if (state.activeDesktopId === desktopId && nextId) {
								actions.switchDesktop(nextId);
							}
							actions.closeDesktop(desktopId);
						}
					}}
				/>
			);
			rootBar.render(
				<React.StrictMode>
					<ThemeProvider theme={createTheme({
						palette: {
							mode: 'dark',
							background: { default: '#1a001a', paper: '#2a002a' },
							primary: { main: '#6f42c1' },
						},
					})}>
						<CssBaseline />
						{barElement}
					</ThemeProvider>
				</React.StrictMode>
			);
		}
	}, [state.desktops, state.activeDesktopId, actions, rootBar]);

	// Получение списка приложений
	useEffect(() => {
		window.electron_desktop_API?.getAppsList?.().then(setApps).catch(() => { });
	}, []);



	// Рендерим все десктопы (скрывая неактивные)
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
		</Box>
	);
}