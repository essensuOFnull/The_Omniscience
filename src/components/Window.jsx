// Window.jsx
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import {
	Box, AppBar, Toolbar, IconButton, Typography,
	TextField, CircularProgress, InputAdornment,
} from '@mui/material';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';
import LanguageIcon from '@mui/icons-material/Language';

export default function Window({ windowId, app, state, actions, config, animations }) {
	const win = state.windows[windowId];
	if (!win) return null;

	const isFocused = state.focusedWindowId === windowId;
	const isGrid = state.isOverviewOpened && state.overviewTab === 1;
	const overviewScrollTop = state.overviewScrollTop || 0;

	const contentRef = useRef(null);
	const titleBarRef = useRef(null);
	const frameRef = useRef(null);
	const [viewCreated, setViewCreated] = useState(false);
	const [desktopOffset, setDesktopOffset] = useState({ x: 0, y: 0 });

	// --- Состояния для адресной строки ---
	const [currentUrl, setCurrentUrl] = useState(win.url || '');
	const [pageTitle, setPageTitle] = useState('');
	const [loading, setLoading] = useState(false);
	const [canGoBack, setCanGoBack] = useState(false);
	const [canGoForward, setCanGoForward] = useState(false);
	const [browserMode, setBrowserMode] = useState(app?.type === 'browser');

	// --- Получение смещения рабочего стола ---
	useEffect(() => {
		let unsubscribe = null;
		const updateOffset = (bounds) => {
			if (bounds) {
				setDesktopOffset({ x: bounds.x, y: bounds.y });
			}
		};
		window.electronAPI.getDesktopViewBounds().then(updateOffset);
		unsubscribe = window.electronAPI.onDesktopViewBoundsChanged(updateOffset);
		return () => {
			if (unsubscribe) unsubscribe();
		};
	}, []);

	// Подписка на обновления навигации
	useEffect(() => {
		let unsubscribe = null;

		// Получаем начальное состояние (Promise)
		window.electronAPI.getWindowNavState(windowId).then((state) => {
			if (state) {
				setCurrentUrl(state.url);
				setPageTitle(state.title);
				setCanGoBack(state.canGoBack);
				setCanGoForward(state.canGoForward);
				setLoading(state.loading);
			}
		});

		// Подписываемся на обновления — onWindowNavigationUpdate возвращает функцию отписки
		unsubscribe = window.electronAPI.onWindowNavigationUpdate((data) => {
			if (data.windowId === windowId) {
				setCurrentUrl(data.url);
				setPageTitle(data.title);
				setCanGoBack(data.canGoBack);
				setCanGoForward(data.canGoForward);
				setLoading(data.loading);
			}
		});

		return () => {
			if (unsubscribe) unsubscribe();
		};
	}, [windowId]);

	// --- Обработчики навигации ---
	const navigateTo = useCallback((url) => {
		if (!url) return;
		let processedUrl = url.trim();
		if (!/^https?:\/\//i.test(processedUrl)) {
			if (processedUrl.includes('.') && !processedUrl.includes(' ')) {
				processedUrl = `http://${processedUrl}`;
			} else {
				processedUrl = `https://www.google.com/search?q=${encodeURIComponent(processedUrl)}`;
			}
		}
		window.electronAPI.loadUrl(windowId, processedUrl);
	}, [windowId]);

	const goBack = useCallback(() => {
		window.electronAPI.goBack(windowId);
	}, [windowId]);

	const goForward = useCallback(() => {
		window.electronAPI.goForward(windowId);
	}, [windowId]);

	const reload = useCallback(() => {
		window.electronAPI.reload(windowId);
	}, [windowId]);

	const toggleBrowserMode = useCallback(() => {
		setBrowserMode(prev => !prev);
	}, []);

	// --- Функция отправки координат содержимого ---
	const sendUpdate = useCallback(() => {
		const el = contentRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();

		if (win.minimized || win.closing) {
			window.electronAPI.updateWindowContentView({
				windowId,
				x: 0,
				y: 0,
				width: 0,
				height: 0,
				scale: 1,
			});
			return;
		}

		const x = Math.round(rect.left + desktopOffset.x);
		const y = Math.round(rect.top + desktopOffset.y);
		const width = Math.round(rect.width);
		const height = Math.round(rect.height);
		const scale = win.contentScale || 1;

		window.electronAPI.updateWindowContentView({
			windowId,
			x,
			y,
			width,
			height,
			scale,
		});
	}, [windowId, win.minimized, win.closing, win.contentScale, desktopOffset]);

	useEffect(() => {
		if (win.closing) return;
		const url = win.url || app?.url || 'about:blank';
		const preload = app.type=='xterm' ? config?.xtermPreload || null : config?.windowPreload || null;
		window.electronAPI.createWindowContentView({
			windowId,
			url,
			preload,
			bounds: { x: 0, y: 0, width: 0, height: 0 },
		});
		setViewCreated(true);

		return () => {
			window.electronAPI.destroyWindowContentView({ windowId });
		};
	}, [windowId, win.url, app?.url, config, win.closing]);

	// --- Обновление при изменении геометрии ---
	useEffect(() => {
		if (!viewCreated) return;
		sendUpdate();
	}, [sendUpdate, viewCreated, win.ghost, win.contentScale, win.minimized, win.closing, isGrid, overviewScrollTop]);

	// --- Ресайз / скролл ---
	useEffect(() => {
		if (!viewCreated) return;
		const el = contentRef.current;
		if (!el) return;

		const observer = new ResizeObserver(() => sendUpdate());
		observer.observe(el);

		window.addEventListener('scroll', sendUpdate);
		window.addEventListener('resize', sendUpdate);

		return () => {
			observer.disconnect();
			window.removeEventListener('scroll', sendUpdate);
			window.removeEventListener('resize', sendUpdate);
		};
	}, [viewCreated, sendUpdate]);

	// --- Z-index ---
	useEffect(() => {
		if (!viewCreated) return;
		const zIndex = win.z || 0;
		window.electronAPI.setWindowContentZIndex({ windowId, zIndex });
	}, [viewCreated, windowId, win.z]);

	// --- Обработчики управления окном ---
	const closeWindow = useCallback(() => {
		if (!win.closing) actions.closeWindow(windowId);
	}, [windowId, actions, win.closing]);

	const toggleMinimize = useCallback(() => {
		if (win.closing) return;
		if (win.minimized) {
			actions.unminimizeWindow(windowId);
		} else {
			const btn = document.querySelector(`[data-window-id="${windowId}"]`);
			if (btn) {
				const rect = btn.getBoundingClientRect();
				actions.minimizeWindow(windowId, rect.left + rect.width / 2, rect.top + rect.height / 2);
			} else {
				actions.minimizeWindow(windowId);
			}
		}
	}, [windowId, actions, win]);

	const handleMaximize = useCallback(() => {
		if (win.closing) return;
		if (isGrid) actions.closeOverview();
		if (win.maximized) actions.unmaximizeWindow(windowId);
		else actions.maximizeWindow(windowId);
	}, [windowId, actions, win, isGrid]);

	const handleTitleMouseDown = useCallback((e) => {
		if (isGrid || win.maximized || win.closing) return;
		e.preventDefault();
		if (!isFocused) actions.focusWindow(windowId);
		if (contentRef.current) contentRef.current.style.pointerEvents = 'none';

		const startX = e.clientX, startY = e.clientY;
		const { centerX: startCX, centerY: startCY, width, height } = win.ghost;

		const onMove = (ev) => {
			actions.setWindowRect(
				windowId,
				startCX + ev.clientX - startX,
				startCY + ev.clientY - startY,
				width,
				height
			);
		};
		const onUp = () => {
			if (contentRef.current) contentRef.current.style.pointerEvents = '';
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
		};
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
	}, [windowId, actions, isGrid, isFocused, win]);

	const onResizeMouseDown = useCallback((direction) => (e) => {
		if (win.maximized || win.closing) return;
		e.preventDefault();
		e.stopPropagation();
		if (!isFocused) actions.focusWindow(windowId);
		if (contentRef.current) contentRef.current.style.pointerEvents = 'none';

		const startX = e.clientX, startY = e.clientY;
		const { width: startW, height: startH, centerX: startCX, centerY: startCY } = win.ghost;
		const left = startCX - startW / 2, right = startCX + startW / 2;
		const top = startCY - startH / 2, bottom = startCY + startH / 2;
		const vp = state.viewport;

		const onMove = (ev) => {
			const dx = ev.clientX - startX, dy = ev.clientY - startY;
			let newW = startW, newH = startH, newCX = startCX, newCY = startCY;
			if (direction.includes('e')) {
				newW = Math.min(Math.max(startW + dx, 1), vp.width - left);
				newCX = left + newW / 2;
			} else if (direction.includes('w')) {
				newW = Math.min(Math.max(startW - dx, 1), right);
				newCX = right - newW / 2;
			}
			if (direction.includes('s')) {
				newH = Math.min(Math.max(startH + dy, 1), vp.height - top);
				newCY = top + newH / 2;
			} else if (direction.includes('n')) {
				newH = Math.min(Math.max(startH - dy, 1), bottom);
				newCY = bottom - newH / 2;
			}
			actions.setWindowRect(windowId, newCX, newCY, newW, newH);
		};
		const onUp = () => {
			if (contentRef.current) contentRef.current.style.pointerEvents = '';
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
		};
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
	}, [windowId, actions, isFocused, win, state.viewport]);

	const onAnimationComplete = useCallback(() => {
		actions.animationComplete(windowId);
		sendUpdate();
	}, [actions, windowId, sendUpdate]);

	// --- Позиционирование и анимация ---
	const topOffset = (isGrid && state.gridViewport) ? (state.gridViewport.top - overviewScrollTop) : 0;
	const ghost = win.ghost;
	const initialGhost = win.initialGhost || ghost;

	const baseInitial = {
		left: initialGhost.centerX,
		top: initialGhost.centerY,
		x: '-50%',
		y: '-50%',
		width: initialGhost.width,
		height: initialGhost.height,
	};
	const baseAnimate = {
		left: ghost.centerX,
		top: ghost.centerY + topOffset,
		x: '-50%',
		y: '-50%',
		width: ghost.width,
		height: ghost.height,
	};

	const variant = win.animationVariant || 'create';
	const variantConfig = animations?.[variant] || {};

	const initial = { ...baseInitial, ...variantConfig.initial };
	const animate = { ...baseAnimate, ...variantConfig.animate };

	const showResizeHandles = !isGrid && !win.maximized && !win.minimized && !win.closing;
	const contentScale = win.contentScale > 0 ? win.contentScale : 1;

	// --- Рендер ---
	return (
		<motion.div
			style={{
				position: 'absolute',
				zIndex: win.z || 0,
			}}
			initial={initial}
			animate={animate}
			onAnimationComplete={onAnimationComplete}
			onClick={(e) => {
				if (isGrid && !win.closing) {
					e.stopPropagation();
					actions.closeOverview();
					actions.focusWindow(windowId);
				}
			}}
		>
			<Box
				ref={frameRef}
				sx={{
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					overflow: 'hidden',
					boxShadow: isFocused ? 4 : 2,
					borderRadius: win.maximized ? 0 : 3,
					border: '1px solid',
					borderColor: isFocused ? 'primary.main' : 'divider',
					zIndex: win.z || 0,
					cursor: isGrid ? 'pointer' : 'default',
				}}
			>
				<AppBar position="static" color="transparent" elevation={0} sx={{ minHeight: 36 }}>
					<Toolbar
						ref={titleBarRef}
						variant="dense"
						onMouseDown={handleTitleMouseDown}
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
							<IconButton size="small" onClick={toggleMinimize} disabled={win.closing} sx={{ color: 'text.secondary' }}>
								<MinimizeIcon fontSize="small" />
							</IconButton>
							<IconButton size="small" onClick={handleMaximize} disabled={win.closing} sx={{ color: 'text.secondary' }}>
								{win.maximized ? <CheckBoxIcon fontSize="small" /> : <CheckBoxOutlineBlankIcon fontSize="small" />}
							</IconButton>
							<IconButton size="small" onClick={closeWindow} sx={{ color: 'text.secondary' }}>
								<CloseIcon fontSize="small" />
							</IconButton>
						</Box>
					</Toolbar>
				</AppBar>

				{/* Браузерная строка (показывается только в режиме браузера) */}
				{browserMode && (
					<Box
						component="form"
						onSubmit={(e) => { e.preventDefault(); navigateTo(currentUrl); }}
						sx={{
							display: 'flex',
							alignItems: 'center',
							gap: 0.5,
							px: 0.5,
							py: 0.25,
							bgcolor: 'transparent',
							borderBottom: '1px solid',
							borderColor: 'divider',
							flexShrink: 0,
						}}
					>
						<IconButton size="small" onClick={goBack} disabled={!canGoBack}>
							<ArrowBackIcon fontSize="small" />
						</IconButton>
						<IconButton size="small" onClick={goForward} disabled={!canGoForward}>
							<ArrowForwardIcon fontSize="small" />
						</IconButton>
						<IconButton size="small" onClick={reload}>
							<RefreshIcon fontSize="small" />
						</IconButton>
						{loading ? (
							<CircularProgress size={16} sx={{ flexShrink: 0 }} />
						) : (
							<HomeIcon fontSize="small" sx={{ flexShrink: 0 }} />
						)}
						<TextField
							variant="outlined"
							size="small"
							fullWidth
							value={currentUrl}
							onChange={(e) => setCurrentUrl(e.target.value)}
							placeholder="Введите адрес или поисковый запрос"
							sx={{
								'& .MuiOutlinedInput-root': {
									bgcolor: 'rgba(255,255,255,0.05)',
									'& fieldset': { borderColor: 'divider' },
								},
								input: { color: 'text.primary', py: 0.5 },
							}}
						/>
						<IconButton type="submit" size="small">
							<ArrowForwardIcon fontSize="small" />
						</IconButton>
					</Box>
				)}

				<Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
					<motion.div
						ref={contentRef}
						style={{
							flex: 1,
							display: 'flex',
							flexDirection: 'column',
							transformOrigin: 'top left',
							width: '100%',
							height: '100%',
							pointerEvents: isGrid ? 'none' : 'auto',
							userSelect: 'none',
						}}
						animate={{ scale: contentScale }}
						transition={animations?.setContentScale?.animate?.transition || { duration: 0.3 }}
					>
						<Box sx={{ flex: 1 }} />
					</motion.div>
				</Box>

				{showResizeHandles && (
					<>
						{['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(dir => (
							<Box
								key={dir}
								onMouseDown={(e) => { e.stopPropagation(); onResizeMouseDown(dir)?.(e); }}
								sx={{
									position: 'absolute',
									...(dir === 'n' && { top: -4, left: 8, right: 8, height: 8, cursor: 'n-resize' }),
									...(dir === 's' && { bottom: -4, left: 8, right: 8, height: 8, cursor: 's-resize' }),
									...(dir === 'e' && { right: -4, top: 8, bottom: 8, width: 8, cursor: 'e-resize' }),
									...(dir === 'w' && { left: -4, top: 8, bottom: 8, width: 8, cursor: 'w-resize' }),
									...(dir === 'ne' && { top: -4, right: -4, width: 12, height: 12, cursor: 'ne-resize' }),
									...(dir === 'nw' && { top: -4, left: -4, width: 12, height: 12, cursor: 'nw-resize' }),
									...(dir === 'se' && { bottom: -4, right: -4, width: 12, height: 12, cursor: 'se-resize' }),
									...(dir === 'sw' && { bottom: -4, left: -4, width: 12, height: 12, cursor: 'sw-resize' }),
									zIndex: 10,
								}}
							/>
						))}
					</>
				)}
			</Box>
		</motion.div>
	);
}
