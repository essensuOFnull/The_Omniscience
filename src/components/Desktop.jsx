import React, { useState, useEffect, useReducer, useMemo, useCallback, useRef } from 'react';
import { Box } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import DesktopWorkspace from './DesktopWorkspace';
import DesktopBar from './DesktopBar';
import { windowManager, initialState } from '../state/windowManager';
import useViewStateBridge from '../hooks/useViewStateBridge';
import useThemeSync from '../hooks/useThemeSync';
import useScreenDrag from '../hooks/useScreenDrag';

import VoidPoem from './VoidPoem';

const { getNewId, getNewZ } = windowManager;

const TAB_BAR_HEIGHT = 35;

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
	togglePanel: ['windowId'],
};

export default function Desktop({ rootBar }) {
	const [config, setConfig] = useState({ taskbarHeight: 40, overviewColumns: 3, overviewGap: 16 });
	const [apps, setApps] = useState([]);

	const reducer = useCallback((state, action) => {
		const handler = windowManager[action.type];
		if (!handler) return state;
		return handler(state, action.payload, { config, getNewId, getNewZ });
	}, [config]);

	const [state, dispatch] = useReducer(reducer, undefined, initialState);

	// 🔌 Мост shell ↔ views
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

	useScreenDrag(state, actions);

	useEffect(() => {
		if (Object.keys(stateRef.current.desktops).length === 0) {
			const desktopId = getNewId();
			actions.createDesktop(desktopId);
			actions.switchDesktop(desktopId);
		}
	}, [actions]);

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
						const nextId = desktopsArray.find(d => d.id !== desktopId)?.id;
						if (state.activeDesktopId === desktopId && nextId) {
							actions.switchDesktop(nextId);
						}
						actions.closeDesktop(desktopId);
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

	useEffect(() => {
		window.electron_desktop_API?.getAppsList?.().then(setApps).catch(() => { });
	}, []);

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
			{Object.keys(state.desktops).length > 0 && Object.keys(state.desktops).map(desktopId => (
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
			{Object.keys(state.desktops).length === 0 && (
				<VoidPoem />
			)}
		</Box>
	);
}