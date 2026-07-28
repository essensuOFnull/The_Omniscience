import React, { useState, useEffect, useRef } from 'react';
import {
	AppBar,
	Toolbar,
	Box,
	Button,
	IconButton,
	TextField,
	Paper,
	Popover,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import BaseWindowButtons from './BaseWindowButtons';

const TabBar = () => {
	const [tabs, setTabs] = useState([]);
	const [activeTabIndex, setActiveTabIndex] = useState(-1);
	const [editingIndex, setEditingIndex] = useState(-1);
	const [editUrl, setEditUrl] = useState('');
	const [showPopup, setShowPopup] = useState(false);
	const [popupAnchorEl, setPopupAnchorEl] = useState(null);
	const [isMaximized, setIsMaximized] = useState(true);
	const tabsContainerRef = useRef(null);

	// Подписка на обновления вкладок из main процесса
	useEffect(() => {
		const updateHandler = (data) => {
			setTabs(data.tabsData || []);
			setActiveTabIndex(data.activeTabIndex != null ? data.activeTabIndex : -1);
		};
		if (window.electron_tabBar_API?.tabs_on_update) {
			window.electron_tabBar_API.tabs_on_update(updateHandler);
		}
		return () => {
			// (опционально) если есть метод отписки, вызвать его
		};
	}, []);

	// Подписка на изменения состояния окна (maximize/fullscreen)
	useEffect(() => {
		if (window.electron_mainWindow_API?.onWindowStateChange) {
			const unsubscribe = window.electron_mainWindow_API.onWindowStateChange((state) => {
				setIsMaximized(state.maximized);
			});
			return unsubscribe;
		}
	}, []);

	// Обработчики
	const handleTabClick = (index) => {
		if (editingIndex >= 0) return;
		window.electron_tabBar_API?.tab_activate?.(index);
	};

	const handleTabContextMenu = (index, e) => {
		e.preventDefault();
		window.electron_tabBar_API?.tab_context_menu?.(index, e.clientX, e.clientY);
	};

	const handleTabDragStart = (e, index) => {
		e.dataTransfer.setData('text/plain', index);
	};

	const handleTabDrop = (e, targetIndex) => {
		e.preventDefault();
		const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
		if (!isNaN(from) && from !== targetIndex) {
			window.electron_tabBar_API?.tab_move?.(from, targetIndex);
		}
	};

	const handleTabDragOver = (e) => e.preventDefault();

	const handleAddTab = (e) => {
		setPopupAnchorEl(e.currentTarget);
		setShowPopup(true);
	};

	const handlePopupAction = (type) => {
		setShowPopup(false);
		setPopupAnchorEl(null);
		if (type === 'desktop') window.electron_tabBar_API?.desktop_create?.();
		else if (type === 'web') window.electron_tabBar_API?.tab_create?.();
	};

	const handlePopupClose = () => {
		setShowPopup(false);
		setPopupAnchorEl(null);
	};

	const handleStartEdit = (index) => {
		const tab = tabs[index];
		if (!tab || tab.type !== 'web') return;
		setEditingIndex(index);
		setEditUrl(tab.url || '');
	};

	const handleFinishEdit = (apply = true) => {
		if (editingIndex >= 0 && apply) {
			const newUrl = editUrl;
			window.electron_tabBar_API?.tab_url_update?.(editingIndex, newUrl);
		}
		setEditingIndex(-1);
		setEditUrl('');
	};

	const handleEditKeyDown = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleFinishEdit(true);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			handleFinishEdit(false);
		}
	};

	const handleMinimize = () => window.electron_tabBar_API?.window_minimize?.();
	const handleMaximize = () => window.electron_tabBar_API?.window_maximize?.();
	const handleClose = () => window.electron_tabBar_API?.window_close?.();

	const handleWheel = (e) => {
		if (editingIndex >= 0) return;
		const container = tabsContainerRef.current;
		if (container) {
			container.scrollLeft += e.deltaY;
		}
	};

	const getTabLabel = (tab) => {
		if (tab.type === 'desktop') return '🖥️';
		if (tab.type === 'web') {
			return tab.title ? `${tab.title} | ${tab.url}` : (tab.url || 'Новая вкладка');
		}
		return '📄';
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

				{/* Контейнер с вкладками */}
				<Box
					ref={tabsContainerRef}
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
					{editingIndex >= 0 ? (
						<TextField
							autoFocus
							value={editUrl}
							onChange={(e) => setEditUrl(e.target.value)}
							onBlur={() => handleFinishEdit(true)}
							onKeyDown={handleEditKeyDown}
							variant="standard"
							size="small"
							sx={{
								flex: 1,
								height: '100%',
								'& input': {
									color: '#fff',
									fontFamily: 'monospace',
									fontSize: 14,
									padding: '0 12px',
									height: '100%',
									boxSizing: 'border-box',
									bgcolor: '#2d002d',
									border: 'none',
									outline: 'none',
								},
								'& .MuiInput-root': { height: '100%', '&:before, &:after': { display: 'none' } },
							}}
						/>
					) : (
						tabs.map((tab, index) => (
							<Button
								key={index}
								variant={index === activeTabIndex ? 'contained' : 'text'}
								size="small"
								onClick={() => handleTabClick(index)}
								onContextMenu={(e) => handleTabContextMenu(index, e)}
								onDragStart={(e) => handleTabDragStart(e, index)}
								onDrop={(e) => handleTabDrop(e, index)}
								onDragOver={handleTabDragOver}
								onDoubleClick={() => {
									if (tab.type === 'web') handleStartEdit(index);
								}}
								sx={{
									flexShrink: 0,
									minWidth: 40,
									height: '100%',
									bgcolor: index === activeTabIndex ? '#50005099' : 'transparent',
									color: index === activeTabIndex ? '#fff' : '#ccc',
									textTransform: 'none',
									borderRight: '1px solid rgba(255,255,255,0.2)',
									borderRadius: 0,
									'&:hover': { bgcolor: index === activeTabIndex ? '#50005099' : 'rgba(255,255,255,0.1)' },
									WebkitAppRegion: 'no-drag',
									overflow: 'hidden',
									whiteSpace: 'nowrap',
									textOverflow: 'ellipsis',
									maxWidth: 200,
									fontSize: 12,
									padding: '0 8px',
								}}
							>
								{getTabLabel(tab)}
							</Button>
						))
					)}
				</Box>

				{editingIndex < 0 && (
					<IconButton
						size="small"
						onClick={handleAddTab}
						sx={{ color: '#ccc', zIndex: 1, WebkitAppRegion: 'no-drag' }}
					>
						<AddIcon />
					</IconButton>
				)}

				<BaseWindowButtons
					onMinimize={handleMinimize}
					onMaximize={handleMaximize}
					onClose={handleClose}
					isMaximized={isMaximized}
				/>
			</Toolbar>

			<Popover
				open={showPopup}
				anchorEl={popupAnchorEl}
				onClose={handlePopupClose}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
				sx={{ zIndex: 1300 }}
			>
				<Paper sx={{ bgcolor: '#2d002d', p: 2, display: 'flex', gap: 2 }}>
					<Button variant="contained" onClick={() => handlePopupAction('desktop')}>
						Рабочий стол
					</Button>
					<Button variant="contained" onClick={() => handlePopupAction('web')}>
						Ссылка
					</Button>
					<Button variant="outlined" onClick={handlePopupClose}>
						Отмена
					</Button>
				</Paper>
			</Popover>
		</AppBar>
	);
};

export default TabBar;