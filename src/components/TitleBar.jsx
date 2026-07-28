import React, { useCallback, useState } from 'react';
import { AppBar, Toolbar, Box, IconButton, Typography } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import BaseWindowButtons from './BaseWindowButtons';
import AddressBar from './AddressBar';

export default function TitleBar({
	app, windowId, desktopId, win, isFocused, isGrid, actions, pageTitle, currentUrl, onTitleMouseDown, setCurrentUrl, navigateTo, goBack, goForward, reload, loading, canGoBack, canGoForward
}) {
	const [browserMode, setBrowserMode] = useState(app?.type === 'browser');

	const toggleBrowserMode = useCallback(() => setBrowserMode(prev => !prev), []);

	const closeWindow = useCallback(() => {
		if (!win.closing) actions.closeWindow(desktopId, windowId);
	}, [desktopId, windowId, actions, win.closing]);

	const toggleMinimize = useCallback(() => {
		if (win.closing) return;
		if (win.minimized) {
			actions.unminimizeWindow(desktopId, windowId);
		} else {
			const btn = document.querySelector(`[data-window-id="${windowId}"]`);
			if (btn) {
				const rect = btn.getBoundingClientRect();
				actions.minimizeWindow(desktopId, windowId, rect.left + rect.width / 2, rect.top + rect.height / 2);
			} else {
				actions.minimizeWindow(desktopId, windowId);
			}
		}
	}, [desktopId, windowId, actions, win]);

	const handleMaximize = useCallback(() => {
		if (win.closing) return;
		if (isGrid) actions.closeOverview(desktopId);
		if (win.maximized) actions.unmaximizeWindow(desktopId, windowId);
		else actions.maximizeWindow(desktopId, windowId);
	}, [desktopId, windowId, actions, win, isGrid]);

	return (
		<>
			<AppBar position="static" color="transparent" elevation={0} sx={{ minHeight: 36 }}>
				<Toolbar
					variant="dense"
					onMouseDown={onTitleMouseDown}
					onDoubleClick={handleMaximize}
					sx={{ minHeight: 36, px: 1, cursor: win.maximized || win.closing ? 'default' : 'move' }}
				>
					<Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
						{app?.icon ? <img src={app.icon} width="16" height="16" alt="" /> : <span>📄</span>}
						<Typography variant="body2" noWrap>
							{browserMode ? (pageTitle || currentUrl || 'Новая вкладка') : (app?.title || 'Окно')}
						</Typography>
					</Box>
					<Box sx={{ display: 'flex', gap: 0.5 }}>
						{app && (
							<IconButton
								size="small"
								onClick={toggleBrowserMode}
								sx={{ color: browserMode ? 'primary.main' : 'text.secondary' }}
							>
								<LanguageIcon fontSize="small" />
							</IconButton>
						)}
						<BaseWindowButtons
							onMinimize={toggleMinimize}
							onMaximize={handleMaximize}
							onClose={closeWindow}
							isMaximized={win.maximized}
						/>
					</Box>
				</Toolbar>
			</AppBar>
			{browserMode?<AddressBar
				win={win}
				app={app}
				currentUrl={currentUrl}
				setCurrentUrl={setCurrentUrl}
				navigateTo={navigateTo}
				goBack={goBack}
				goForward={goForward}
				reload={reload}
				loading={loading}
				canGoBack={canGoBack}
				canGoForward={canGoForward}
			/>:<></>}
		</>
	);
}