import React, { useEffect, useState, useCallback } from 'react';
import { FileBrowser, FileList, FileToolbar, FileNavbar } from 'chonky2';
import {
	Box,
	Button,
	CircularProgress,
	Divider,
	List,
	ListItemButton,
	ListItemText,
	Paper,
	Stack,
	Typography,
} from '@mui/material';

function buildFolderChain(fullPath) {
	if (!fullPath) return [];
	const isWin = /^[a-zA-Z]:\\/.test(fullPath);
	const chain = [];

	if (isWin) {
		const parts = fullPath.split('\\').filter(Boolean);
		let current = parts[0] + '\\';
		chain.push({ id: current, name: current, isDir: true });
		for (let i = 1; i < parts.length; i++) {
			current = current + (current.endsWith('\\') ? '' : '\\') + parts[i];
			chain.push({ id: current, name: parts[i], isDir: true });
		}
	} else {
		chain.push({ id: '/', name: '/', isDir: true });
		const parts = fullPath.replace(/\/$/, '').split('/').filter(Boolean);
		let current = '';
		for (const part of parts) {
			current = current + '/' + part;
			chain.push({ id: current, name: part, isDir: true });
		}
	}

	return chain;
}

function normalizeFiles(files) {
	return files.map((file) => ({
		...file,
		id: file.id,
		name: file.name,
		isDir: file.isDir,
	}));
}

export default function App() {
	const [sidebarFolders, setSidebarFolders] = useState([]);
	const [folderChain, setFolderChain] = useState([]);
	const [currentPath, setCurrentPath] = useState('');
	const [files, setFiles] = useState([]);
	const [permissionDenied, setPermissionDenied] = useState(false);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		window.electron_componentapp_API.invoke('get-default-folders').then((folders) => {
			if (folders && folders.length) {
				setSidebarFolders(folders);
				loadFolder(folders[0].path);
			}
		}).catch(() => {
			setSidebarFolders([]);
		});
	}, []);

	const loadFolder = useCallback(async (dirPath) => {
		setLoading(true);
		const response = await window.electron_componentapp_API.invoke('get-files', dirPath);
		setLoading(false);

		if (!response.success) {
			setPermissionDenied(response.error === 'permission_denied');
			setFiles([]);
			setCurrentPath(dirPath);
			setFolderChain(buildFolderChain(dirPath));
			return;
		}

		setPermissionDenied(false);
		setFiles(
			normalizeFiles(response.files).sort((a, b) => {
				if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
				return a.name.localeCompare(b.name);
			}),
		);
		setCurrentPath(dirPath);
		setFolderChain(buildFolderChain(dirPath));
	}, []);

	const handleFileAction = useCallback(
		async (data) => {
			if (data.id !== 'open_files') return;
			const targetFile = data.payload?.targetFile;
			if (!targetFile) return;

			if (targetFile.isDir) {
				loadFolder(targetFile.id);
			}
		},
		[loadFolder],
	);

	const handleFolderClick = (folder) => {
		if (folder?.path) {
			loadFolder(folder.path);
		}
	};

	return (
		<Box
			sx={{
				position: 'absolute',
				left: 0,
				top: 0,
				width: '100vw',
				height: '100vh',
				bgcolor: '#11101a',
				color: '#fff',
			}}
		>
			<Stack direction="row" sx={{ height: '100%' }}>
				<Paper
					elevation={3}
					sx={{
						width: 260,
						bgcolor: '#16151f',
						color: '#fff',
						borderRadius: 0,
						borderRight: '1px solid #2c2b38',
						overflow: 'hidden',
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<Box sx={{ p: 2, borderBottom: '1px solid #2c2b38' }}>
						<Typography variant="subtitle1" fontWeight={700}>
							Папки
						</Typography>
					</Box>
					<Box sx={{ flex: 1, overflowY: 'auto' }}>
						<List disablePadding>
							{sidebarFolders.map((folder) => (
								<ListItemButton
									key={folder.id}
									selected={currentPath === folder.path}
									onClick={() => handleFolderClick(folder)}
									sx={{
										px: 2,
										py: 1.25,
										'&.Mui-selected': {
											bgcolor: '#2a2a3c',
											'&:hover': { bgcolor: '#31324a' },
										},
										color: '#f3f3f3',
									}}
								>
									<ListItemText primary={folder.name} primaryTypographyProps={{ fontSize: 13 }} />
								</ListItemButton>
							))}
						</List>
					</Box>
				</Paper>

				<Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
					<Paper
						elevation={3}
						square
						sx={{
							bgcolor: '#14121b',
							borderRadius: 0,
							borderBottom: '1px solid #2c2b38',
							p: 2,
						}}
					>
						<Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
							<Box>
								<Typography variant="body2" color="text.secondary" sx={{ color: '#b1b0c0' }} noWrap>
									{currentPath || '...'}
								</Typography>
							</Box>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
								{loading && <CircularProgress size={18} thickness={5} sx={{ color: '#999' }} />}
								<Typography variant="caption" sx={{ color: '#999' }}>
									{loading ? 'Загрузка...' : 'Готово'}
								</Typography>
							</Box>
						</Stack>
					</Paper>

					<Box sx={{ flex: 1, overflow: 'hidden' }}>
						<Paper
							elevation={0}
							sx={{
								height: '100%',
								bgcolor: '#10101a',
								borderRadius: 0,
								overflow: 'hidden',
								display: 'flex',
								flexDirection: 'column',
							}}
						>
							{permissionDenied ? (
								<Box sx={{ p: 4 }}>
									<Typography color="#f55">Нет доступа к этой папке.</Typography>
								</Box>
							) : (
								<Box sx={{ flex: 1, overflow: 'hidden' }}>
									<FileBrowser files={files} folderChain={folderChain} darkMode onFileAction={handleFileAction}>
										<Box sx={{ bgcolor: '#14121b', px: 2, py: 1 }}>
											<FileToolbar />
										</Box>
										<Divider sx={{ borderColor: '#2c2b38' }} />
										<Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#14121b', px: 2, py: 1 }}>
											<FileNavbar />
										</Box>
										<Box sx={{ flex: 1, overflow: 'auto', px: 1, pb: 1 }}>
											<FileList />
										</Box>
									</FileBrowser>
								</Box>
							)}
						</Paper>
					</Box>
				</Box>
			</Stack>
		</Box>
	);
}
