import React, { useState, useEffect, useRef } from 'react';
import {
	AppBar,
	Toolbar,
	Box,
	Button,
	IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import BaseWindowButtons from './BaseWindowButtons';

const DesktopBar = ({ desktops, activeDesktopId, onCreateDesktop, onSwitchDesktop, onDeleteDesktop }) => {
	const [isMaximized, setIsMaximized] = useState(true);
	const desktopsContainerRef = useRef(null);

	// Подписка на изменения состояния окна (maximize/fullscreen)
	useEffect(() => {
		if (window.electron_mainWindow_API?.onWindowStateChange) {
			const unsubscribe = window.electron_mainWindow_API.onWindowStateChange((state) => {
				setIsMaximized(state.maximized);
			});
			return unsubscribe;
		}
	}, []);

	const handleDesktopClick = (desktopId) => {
		onSwitchDesktop(desktopId);
	};

	const handleDesktopContextMenu = (desktopId, e) => {
		e.preventDefault();
		// Простое меню удаления (можно заменить на полноценный context menu)
		if (desktops.length > 1) {
			onDeleteDesktop(desktopId);
		}
	};

	const handleAddDesktop = () => {
		onCreateDesktop();
	};

	const handleMinimize = () => window.electron_mainWindow_API?.window_minimize?.();
	const handleMaximize = () => window.electron_mainWindow_API?.window_maximize?.();
	const handleClose = () => window.electron_mainWindow_API?.window_close?.();

	const handleWheel = (e) => {
		const container = desktopsContainerRef.current;
		if (container) {
			container.scrollLeft += e.deltaY;
		}
	};

	return (
		<AppBar
			position="absolute"
			sx={{
				height: 35,
				bgcolor: 'rgba(0,0,0,0.85)',
				backdropFilter: 'blur(12px)',
				borderBottom: '1px solid rgba(255,255,255,0.1)',
				boxShadow: 'none',
				zIndex: 1200,
			}}
		>
			<Toolbar variant="dense" sx={{ minHeight: 35, px: 1, gap: 1, position: 'relative' }}>
				{/* Невидимый слой для перетаскивания окна */}
				<Box
					sx={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
						WebkitAppRegion: 'drag',
						zIndex: 0,
					}}
				/>

				{/* Контейнер с рабочими столами */}
				<Box
					ref={desktopsContainerRef}
					onWheel={handleWheel}
					sx={{
						position: 'relative',
						zIndex: 1,
						display: 'flex',
						flex: 1,
						overflowX: 'auto',
						alignItems: 'center',
						height: '100%',
						'&::-webkit-scrollbar': { display: 'none' },
						scrollbarWidth: 'none',
					}}
				>
					{desktops.map((desktop) => (
						<Button
							key={desktop.id}
							variant={desktop.id === activeDesktopId ? 'contained' : 'text'}
							size="small"
							onClick={() => handleDesktopClick(desktop.id)}
							onContextMenu={(e) => handleDesktopContextMenu(desktop.id, e)}
							sx={{
								flexShrink: 0,
								minWidth: 60,
								height: '100%',
								bgcolor: desktop.id === activeDesktopId ? '#50005099' : 'transparent',
								color: desktop.id === activeDesktopId ? '#fff' : '#ccc',
								textTransform: 'none',
								borderRight: '1px solid rgba(255,255,255,0.2)',
								borderRadius: 0,
								'&:hover': { bgcolor: desktop.id === activeDesktopId ? '#50005099' : 'rgba(255,255,255,0.1)' },
								WebkitAppRegion: 'no-drag',
								overflow: 'hidden',
								whiteSpace: 'nowrap',
								textOverflow: 'ellipsis',
								maxWidth: 150,
								fontSize: 12,
								padding: '0 8px',
								cursor: 'pointer',
								title: `Рабочий стол ${desktop.index || 1} (ПКМ для удаления)`
							}}
						>
							🖥️ Стол {desktop.index || 1}
						</Button>
					))}
				</Box>

				<IconButton
					size="small"
					onClick={handleAddDesktop}
					sx={{ color: '#ccc', zIndex: 1, WebkitAppRegion: 'no-drag' }}
					title="Добавить рабочий стол"
				>
					<AddIcon />
				</IconButton>

				<BaseWindowButtons
					onMinimize={handleMinimize}
					onMaximize={handleMaximize}
					onClose={handleClose}
					isMaximized={isMaximized}
				/>
			</Toolbar>
		</AppBar>
	);
};

export default DesktopBar;
