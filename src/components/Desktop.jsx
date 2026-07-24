// Desktop.jsx
import React, { useState, useLayoutEffect, useRef, useCallback, useEffect } from 'react';
import { Box } from '@mui/material';
import Taskbar from './Taskbar';
import Overview from './Overview';
import Window from './Window';

export default function Desktop({ state, actions, config, animations }) {
	const viewportRef = useRef(null);
	const { windows, isOverviewOpened } = state;
	const [apps, setApps] = useState([]);

	useEffect(() => {
		window.electronAPI?.getAppsList?.().then(setApps).catch(() => { });
	}, []);

	useLayoutEffect(() => {
		const el = viewportRef.current;
		if (!el || !actions.setViewport) return;
		const update = () => actions.setViewport(el.getBoundingClientRect());
		update();
		const observer = new ResizeObserver(update);
		observer.observe(el);
		return () => observer.disconnect();
	}, [actions]);

	const toggleOverview = useCallback(() => {
		if (isOverviewOpened) actions.closeOverview?.();
		else actions.openOverview?.();
	}, [isOverviewOpened, actions]);

	return (
		<Box sx={{
			display: 'flex',
			flexDirection: 'column',
			width: '100vw',
			height: '100vh',
			minWidth: '100vw',
			minHeight: '100vh',
			maxWidth: '100vw',
			maxHeight: '100vh',
			overflow:'hidden',
			bgcolor: 'transparent'
		}}>
			<Box
				id="viewport"
				ref={viewportRef}
				sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}
				onClick={(e) => { if (e.target === e.currentTarget) actions.focusWindow?.(null); }}
			>
				<Overview state={state} actions={actions} config={config} apps={apps} />
				{Object.entries(windows || {}).map(([id, win]) => {
					const app = apps.find(a => a.id === win.appId) || null;
					return (
						<Window key={id} windowId={id} app={app} state={state} actions={actions} config={config} animations={animations} />
					);
				})}
			</Box>
			<Taskbar state={state} actions={actions} config={config} menuButtonClick={toggleOverview} apps={apps} />
		</Box>
	);
}