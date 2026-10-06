import React, { useState, useEffect, useReducer, useMemo, useCallback, useRef } from 'react';
import { Box } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import DesktopWorkspace from './DesktopWorkspace';
import TopBar from './TopBar';
import { windowManager, initialState } from '../state/windowManager';
import useViewStateBridge from '../hooks/useViewStateBridge';
import useThemeSync from '../hooks/useThemeSync';
import useScreenDrag from '../hooks/useScreenDrag';
import useNativeWindows from '../hooks/useNativeWindows';

import VoidPoem from './VoidPoem';

const { getNewId } = windowManager;

const ACTION_ARG_NAMES = {
	setViewport: ['rect'],
	setOverviewTab: ['tab'],
	focusWindow: ['windowId'],
	closeWindow: ['windowId'],
	deleteWindow: ['windowId'],
	animationComplete: ['windowId'],
	unminimizeWindow: ['windowId'],
	maximizeWindow: ['windowId'],
	unmaximizeWindow: ['windowId'],
	minimizeWindow: ['windowId', 'cx', 'cy'],
	setWindowRect: ['windowId', 'cx', 'cy', 'width', 'height', 'snap'],
	createDevToolsWindow: ['targetWindowId'],
};

export default function Desktop({ rootBar }) {
	const [config] = useState({ taskbarHeight: 40, overviewColumns: 3, overviewGap: 16 });
	const [apps, setApps] = useState([]);
	const [activeNative, setActiveNative] = useState(null);
	const [mainWinMaximized, setMainWinMaximized] = useState(true);

	const reducer = useCallback((state, action) => {
		const handler = windowManager[action.type];
		if (!handler) return state;
		return handler(state, action.payload, { config, getNewId, getNewZ: windowManager.getNewZ });
	}, [config]);

	const [state, dispatch] = useReducer(reducer, undefined, initialState);

	useViewStateBridge(state, dispatch);
	useThemeSync();

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

	const stateRef = useRef(state);
	stateRef.current = state;
	const actionsRef = useRef(actions);
	actionsRef.current = actions;

	/* ------------------------------------------------------------------ */
	/* Panel event (from floating panel — keep for now)                    */
	/* ------------------------------------------------------------------ */
	useEffect(() => {
		const api = window.electron_desktop_API;
		if (!api) return;
		const off = api.on('shell:panel-event', (msg) => {
			const { windowId, type } = msg || {};
			if (!windowId || !type) return;
			let dId = null, w = null;
			for (const [did, desktop] of Object.entries(stateRef.current.desktops || {})) {
				if (desktop.windows?.[windowId]) { dId = did; w = desktop.windows[windowId]; break; }
			}
			if (!dId || !w) return;

			if (type === 'close') {
				if (!w.closing) actionsRef.current.closeWindow(dId, windowId);
			} else if (type === 'minimize') {
				if (w.closing) return;
				if (w.minimized) actionsRef.current.unminimizeWindow(dId, windowId);
				else actionsRef.current.minimizeWindow(dId, windowId);
			} else if (type === 'toggle-maximize') {
				if (w.closing) return;
				if (w.maximized) actionsRef.current.unmaximizeWindow(dId, windowId);
				else actionsRef.current.maximizeWindow(dId, windowId);
			} else if (type === 'open-devtools') {
				actionsRef.current.createDevToolsWindow(dId, windowId);
			}
		});
		return off;
	}, []);

	useEffect(() => {
		const api = window.electron_desktop_API;
		if (!api) return;

		const off = api.on('shell:open-window-request', (msg) => {
			if (!msg) return;
			const { sourceWindowId, url, disposition } = msg;

			// Найти desktop, в котором лежит sourceWindowId
			let dId = stateRef.current.activeDesktopId;
			let sourceWin = null;

			for (const [did, desktop] of Object.entries(stateRef.current.desktops || {})) {
				if (desktop.windows?.[sourceWindowId]) {
					dId = did;
					sourceWin = desktop.windows[sourceWindowId];
					break;
				}
			}

			if (!dId || !url) return;

			// Позиция: центр исходного окна
			const cx = sourceWin?.ghost?.centerX ?? undefined;
			const cy = sourceWin?.ghost?.centerY ?? undefined;

			const width = 900;
			const height = 600;

			// background-tab (средняя кнопка / Ctrl+Click) — открываем в фоне
			// foreground-tab / new-window — открываем и фокусируем
			const shouldFocus = disposition !== 'background-tab';

			actionsRef.current.createWindow(dId, {
				appId: 'browser',
				url,
				cx,
				cy,
				width,
				height,
				extra: {
					// Передаём флаг — в createWindow он попадёт в state.windows[newId]
					// и потом можно использовать, если захотим открывать без фокуса.
					openInBackground: !shouldFocus,
				},
			});
		});

		return off;
	}, []);

	useScreenDrag(state, actions);

	const nativeWindows = useNativeWindows();

	/* ------------------------------------------------------------------ */
	/* Init first desktop                                                  */
	/* ------------------------------------------------------------------ */
	useEffect(() => {
		if (Object.keys(stateRef.current.desktops).length === 0) {
			const desktopId = getNewId();
			actions.createDesktop(desktopId);
			actions.switchDesktop(desktopId);
		}
	}, [actions]);

	/* ------------------------------------------------------------------ */
	/* Apps list                                                           */
	/* ------------------------------------------------------------------ */
	useEffect(() => {
		window.electron_desktop_API?.getAppsList?.().then(setApps).catch(() => { });
	}, []);

	/* ------------------------------------------------------------------ */
	/* Main window maximize state                                          */
	/* ------------------------------------------------------------------ */
	useEffect(() => {
		if (window.electron_mainWindow_API?.onWindowStateChange) {
			const unsub = window.electron_mainWindow_API.onWindowStateChange((s) => {
				setMainWinMaximized(!!s.maximized);
			});
			return unsub;
		}
	}, []);

	/* ------------------------------------------------------------------ */
	/* Sync activeNative with nativeWindows list                           */
	/* ------------------------------------------------------------------ */
	useEffect(() => {
		if (!activeNative) return;
		const found = nativeWindows.find((w) => w.id === activeNative.id);
		if (!found) {
			setActiveNative(null);
			return;
		}
		// Свёрнутое окно теряет активность
		if (found.isMinimized) {
			setActiveNative(null);
			return;
		}
		if (
			found.x !== activeNative.x ||
			found.y !== activeNative.y ||
			found.width !== activeNative.width ||
			found.height !== activeNative.height ||
			found.title !== activeNative.title ||
			found.isMaximized !== activeNative.isMaximized ||
			found.icon !== activeNative.icon
		) {
			setActiveNative({
				id: found.id,
				title: found.title,
				x: found.x,
				y: found.y,
				width: found.width,
				height: found.height,
				isMaximized: !!found.isMaximized,
				isMinimized: !!found.isMinimized,
				icon: found.icon || null,
			});
		}
	}, [nativeWindows, activeNative]);

	/* ------------------------------------------------------------------ */
	/* Handlers                                                            */
	/* ------------------------------------------------------------------ */
	const handleNativeClick = useCallback((nw) => {
		// Сбрасываем фокус у всех view-окон активного десктопа
		const dId = stateRef.current.activeDesktopId;
		if (dId) {
			actionsRef.current.focusWindow(dId, null);
		}

		setActiveNative({
			id: nw.id,
			title: nw.title,
			x: nw.x,
			y: nw.y,
			width: nw.width,
			height: nw.height,
			isMaximized: !!nw.isMaximized,
			isMinimized: !!nw.isMinimized,
			icon: nw.icon || null,
		});
		window.electron_desktop_API.send('native-window:focus', { id: nw.id });
	}, []);

	const handleFocusView = useCallback((win) => {
		setActiveNative(null);
		const dId = stateRef.current.activeDesktopId;
		if (!dId) return;
		if (win.minimized) actionsRef.current.unminimizeWindow(dId, win.id);
		actionsRef.current.focusWindow(dId, win.id);
	}, []);

	const handleSwitchDesktop = useCallback((desktopId) => {
		setActiveNative(null);
		actionsRef.current.switchDesktop(desktopId);
	}, []);

	const handleToggleOverview = useCallback(() => {
		const dId = stateRef.current.activeDesktopId;
		if (!dId) return;
		const desktop = stateRef.current.desktops[dId];
		if (desktop?.isOverviewOpened) actionsRef.current.closeOverview(dId);
		else actionsRef.current.openOverview(dId);
	}, []);

	/* ------------------------------------------------------------------ */
	/* Render TopBar into rootBar                                          */
	/* ------------------------------------------------------------------ */
	useEffect(() => {
		if (!rootBar) return;

		const desktopsArray = Object.entries(state.desktops).map(([id, desktop], index) => ({
			id,
			index: index + 1,
			desktop,
		}));

		const activeDesktop = state.activeDesktopId ? state.desktops[state.activeDesktopId] : null;
		const focusedWindowId = activeDesktop?.focusedWindowId || null;
		const windowsArrayForBar = Object.values(activeDesktop?.windows || {})
			.filter((w) => w && typeof w === 'object');

		// Active window info for the cross
		let activeWindowInfo = null;
		if (activeNative) {
			activeWindowInfo = {
				mode: 'native',
				id: activeNative.id,
				title: activeNative.title || 'Окно',
				icon: activeNative.icon || null,
				maximized: !!activeNative.isMaximized,
				nativeBounds: {
					x: activeNative.x, y: activeNative.y,
					width: activeNative.width, height: activeNative.height,
				},
			};
		} else if (focusedWindowId) {
			const win = activeDesktop?.windows?.[focusedWindowId];
			if (win && !win.closing) {
				const app = win.appId ? (apps || []).find((a) => a.id === win.appId) : null;
				activeWindowInfo = {
					mode: 'view',
					id: focusedWindowId,
					desktopId: state.activeDesktopId,   // 👈 добавить
					title: win.title || app?.title || 'Окно',
					icon: app?.icon || null,
					maximized: !!win.maximized,
				};
			}
		}

		const barElement = (
			<TopBar
				desktops={desktopsArray}
				activeDesktopId={state.activeDesktopId}
				onCreateDesktop={() => {
					const newId = getNewId();
					actions.createDesktop(newId);
					actions.switchDesktop(newId);
				}}
				onSwitchDesktop={handleSwitchDesktop}
				onDeleteDesktop={(desktopId) => {
					const nextId = desktopsArray.find((d) => d.id !== desktopId)?.id;
					if (state.activeDesktopId === desktopId && nextId) {
						actions.switchDesktop(nextId);
					}
					actions.closeDesktop(desktopId);
				}}
				windows={windowsArrayForBar}
				focusedWindowId={focusedWindowId}
				apps={apps}
				onFocusView={handleFocusView}
				nativeWindows={nativeWindows}
				activeNative={activeNative}
				onNativeClick={handleNativeClick}
				menuButtonClick={handleToggleOverview}
				mainWinMaximized={mainWinMaximized}
				onMainWinMinimize={() => window.electron_mainWindow_API?.window_minimize?.()}
				onMainWinMaximize={() => window.electron_mainWindow_API?.window_maximize?.()}
				onMainWinClose={() => window.electron_mainWindow_API?.window_close?.()}
				activeWindow={activeWindowInfo}
				actions={actions}
				onOpenDevTools={(which) => {
					if (!activeWindowInfo || activeWindowInfo.mode !== 'view') return;
					const dId = state.activeDesktopId;
					if (which === 'devtools') {
						actions.createDevToolsWindow(dId, activeWindowInfo.id);
					}
				}}
				onRequestSearch={() => window.electron_desktop_API.openKRunner()}
				onRequestSettings={() => window.electron_desktop_API.openSystemSettings()}
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
	}, [
		rootBar,
		state.desktops,
		state.activeDesktopId,
		apps,
		nativeWindows,
		activeNative,
		mainWinMaximized,
		actions,
		handleSwitchDesktop,
		handleFocusView,
		handleNativeClick,
		handleToggleOverview,
	]);

	/* ------------------------------------------------------------------ */
	/* Send props to floating panel (keep for now)                         */
	/* ------------------------------------------------------------------ */
	useEffect(() => {
		const api = window.electron_desktop_API;
		if (!api) return;

		const activeDesktopId = state.activeDesktopId;
		const activeDesktop = activeDesktopId ? state.desktops?.[activeDesktopId] : null;
		const activeId = activeDesktop?.focusedWindowId || null;

		let activeWin = null;
		if (activeId && activeDesktop && activeDesktop.windows?.[activeId]) {
			activeWin = activeDesktop.windows[activeId];
		}

		const hasActiveWindow = !!(activeWin && !activeWin.closing);
		const activeApp = activeWin?.appId ? (apps || []).find((a) => a.id === activeWin.appId) : null;

	}, [state.activeDesktopId, state.desktops, apps, activeNative]);

	/* ------------------------------------------------------------------ */
	/* Render                                                              */
	/* ------------------------------------------------------------------ */
	return (
		<Box
			sx={{
				position: 'absolute',
				inset: 0,
				display: 'flex',
				flexDirection: 'column',
				bgcolor: 'transparent',
				overflow: 'hidden',
			}}
		>
			{Object.keys(state.desktops).length > 0 && Object.keys(state.desktops).map((desktopId) => (
				<DesktopWorkspace
					key={desktopId}
					desktopId={desktopId}
					state={state}
					actions={actions}
					config={config}
					apps={apps}
					active={state.activeDesktopId === desktopId}
					nativeWindows={nativeWindows}
					activeNative={activeNative}
					onNativeClick={handleNativeClick}
				/>
			))}
			{Object.keys(state.desktops).length === 0 && (
				<VoidPoem />
			)}
		</Box>
	);
}