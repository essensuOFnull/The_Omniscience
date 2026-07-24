// Overview.jsx
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
	Box, Tabs, Tab, TextField, InputAdornment, IconButton,
	Grid, Card, CardActionArea, Typography, Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

function OverviewGrid({ state, actions }) {
	const containerRef = useRef(null);

	useEffect(() => {
		const el = containerRef.current;
		if (!el || !actions.setGridViewport) return;
		const update = () => {
			const rect = el.getBoundingClientRect();
			actions.setGridViewport(rect);
			if (actions.recalcOverviewGrid) actions.recalcOverviewGrid();
		};
		update();
		const observer = new ResizeObserver(update);
		observer.observe(el);
		return () => observer.disconnect();
	}, [actions]);

	const handleScroll = () => {
		if (containerRef.current && actions.setOverviewScrollTop) {
			actions.setOverviewScrollTop(containerRef.current.scrollTop);
		}
	};

	return (
		<Box ref={containerRef} onScroll={handleScroll} sx={{ overflowY: 'auto', height: '100%', width: '100%', position: 'relative' }}>
			<Box sx={{ height: (state.gridTotalHeight || 0) + 'px' }} />
		</Box>
	);
}

function TabPanel({ children, value, index }) {
	return (
		<Box role="tabpanel" hidden={value !== index} sx={{ height: '100%', overflow: 'auto' }}>
			{value === index && children}
		</Box>
	);
}

export default function Overview({ state, actions, config, apps }) {
	if (!state) return null;
	const { isOverviewOpened, overviewTab } = state;
	const taskbarHeight = config?.taskbarHeight || 40;
	const [search, setSearch] = useState('');

	const tabs = [
		{ id: 0, label: 'Приложения' },
		{ id: 1, label: 'Открытые окна' },
		{ id: 2, label: 'Поиск в интернете' },
	];

	const filteredApps = useMemo(() => {
		const q = search.toLowerCase();
		return (apps || []).filter(app =>
			app.title?.toLowerCase().includes(q) ||
			app.id?.toLowerCase().includes(q)
		);
	}, [apps, search]);

	const handleAppClick = (appId, e) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const app = apps.find(a => a.id === appId);
		actions.createWindow({
			appId: appId,
			cx: rect.left + rect.width / 2,
			cy: rect.top + rect.height / 2,
			width: 900,
			height: 600,
			url: app?.url || null,
			extra: { app, filePath: app?.path }
		});
	};

	const handleTabChange = (event, newValue) => {
		actions.setOverviewTab?.(newValue);
	};

	const handleClose = () => {
		actions.closeOverview?.();
	};

	return (
		<motion.div
			initial={false}
			animate={{ opacity: isOverviewOpened ? 1 : 0, scale: isOverviewOpened ? 1 : 0.95 }}
			transition={{ duration: 0.2, ease: 'easeInOut' }}
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: taskbarHeight,
				zIndex: config?.overviewZIndex || 1000,
				backgroundColor: 'rgba(0,0,0,0.75)',
				backdropFilter: 'blur(12px)',
				pointerEvents: isOverviewOpened ? 'auto' : 'none',
				display: 'flex',
				flexDirection: 'column',
			}}
			onClick={e => e.stopPropagation()}
		>
			<Paper elevation={0} sx={{ bgcolor: 'transparent', borderRadius: 0, p: 2, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
				<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
					<Tabs value={overviewTab} onChange={handleTabChange} textColor="inherit" variant="scrollable">
						{tabs.map(tab => (
							<Tab key={tab.id} label={tab.label} sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-selected': { color: '#fff' } }} />
						))}
					</Tabs>
					<IconButton onClick={handleClose} sx={{ color: 'white' }}>
						<CloseIcon />
					</IconButton>
				</Box>
			</Paper>

			<Box sx={{ flex: 1, minHeight: 0, position: 'relative', p: 2 }}>
				<TabPanel value={overviewTab} index={0}>
					<TextField
						fullWidth
						variant="outlined"
						placeholder="Поиск приложений..."
						value={search}
						onChange={e => setSearch(e.target.value)}
						autoFocus
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
								</InputAdornment>
							),
							sx: { color: 'white', bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } },
						}}
						sx={{ mb: 3 }}
					/>
					<Grid container spacing={2}>
						{filteredApps.map(app => (
							<Grid item xs={6} sm={4} md={3} lg={2} key={app.id}>
								<Card sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)', transition: '0.2s', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', transform: 'scale(1.02)' } }}>
									<CardActionArea onClick={(e) => handleAppClick(app.id, e)} sx={{ p: 2, textAlign: 'center' }}>
										{app.icon ? (
											<img src={app.icon} width="48" height="48" alt="icon" style={{ display: 'block', margin: '0 auto 8px' }} />
										) : (
											<Box sx={{ fontSize: 40, mb: 1 }}>📦</Box>
										)}
										<Typography variant="body2" sx={{ color: 'white' }}>{app.title}</Typography>
									</CardActionArea>
								</Card>
							</Grid>
						))}
					</Grid>
				</TabPanel>

				<TabPanel value={overviewTab} index={1}>
					<OverviewGrid state={state} actions={actions} />
				</TabPanel>

				<TabPanel value={overviewTab} index={2}>
					<TextField
						fullWidth
						variant="outlined"
						placeholder="Поиск в интернете..."
						value={search}
						onChange={e => setSearch(e.target.value)}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
								</InputAdornment>
							),
							sx: { color: 'white', bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } },
						}}
						sx={{ mb: 3 }}
					/>
					<Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>Результаты поиска (скоро)</Typography>
				</TabPanel>
			</Box>
		</motion.div>
	);
}