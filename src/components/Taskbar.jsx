import React from 'react';
import { AppBar, Toolbar, Button, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

export default function Taskbar({ state, actions, apps, config, menuButtonClick, desktopId }) {
	const { windows } = state;
	const windowsArray = Object.values(windows || {});
	const taskbarHeight = config?.taskbarHeight || 40;

	// Определяем максимальный z-индекс для окон
	const maxZ = Math.max(0, ...windowsArray.map(w => w.z || 0));

	const handleTaskbarClick = (win, e) => {
		if (win.minimized) {
			actions.unminimizeWindow(desktopId, win.id);
		} else {
			// Если окно активно – минимизировать, иначе – активировать
			const isActive = !win.minimized && win.z === maxZ;
			if (isActive) {
				const rect = e.target.getBoundingClientRect();
				actions.minimizeWindow(desktopId, win.id, rect.left + rect.width / 2, rect.top + rect.height / 2);
			} else {
				actions.focusWindow(desktopId, win.id);
			}
		}
	};

	return (
		<AppBar
			position="static"
			sx={{
				height: taskbarHeight,
				bgcolor: 'rgba(0,0,0,0.85)',
				backdropFilter: 'blur(12px)',
				borderTop: '1px solid rgba(255,255,255,0.1)',
				boxShadow: 'none',
				top: 'auto',
				bottom: 0,
			}}
		>
			<Toolbar
				variant="dense"
				sx={{
					minHeight: taskbarHeight,
					px: 1,
					gap: 1,
					overflow: 'hidden',
				}}
			>
				<Button
					variant="contained"
					size="small"
					startIcon={<MenuIcon />}
					onClick={menuButtonClick}
					sx={{
						bgcolor: '#6f42c1',
						'&:hover': { bgcolor: '#5a32a3' },
						flexShrink: 0,
						textTransform: 'none',
					}}
				>
					Меню
				</Button>

				<Box
					sx={{
						display: 'flex',
						gap: 0.5,
						overflowX: 'auto',
						flex: 1,
						py: 0.5,
						'&::-webkit-scrollbar': { height: 3 },
						'&::-webkit-scrollbar-thumb': { bgcolor: '#6f42c1', borderRadius: 1 },
					}}
				>
					{windowsArray.map((win) => {
						const app = apps.find((a) => a.id === win.appId);
						const icon = app?.icon;
						const title = win.title || app?.title || 'Окно';
						const isActive = !win.minimized && win.z === maxZ;

						return (
							<Button
								key={win.id}
								data-window-id={win.id}
								size="small"
								variant='contained'
								startIcon={
									icon ? (
										<img src={icon} width="16" height="16" alt="icon" />
									) : (
										<span>📦</span>
									)
								}
								onClick={(e) => handleTaskbarClick(win, e)}
								sx={{
									border:isActive?'1px solid #fff':'1px solid #000',
									color: '#fff',
									textTransform: 'none',
									whiteSpace: 'nowrap',
									flexShrink: 0,
									'&:hover': {
										border:'1px dashed #fff',
									},
								}}
							>
								{title}
							</Button>
						);
					})}
				</Box>
			</Toolbar>
		</AppBar>
	);
}