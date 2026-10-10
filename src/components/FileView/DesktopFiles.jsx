import React, { useState, useEffect, useCallback } from 'react';
import { Box, IconButton, Breadcrumbs, Link } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import FileView from './FileView';
import FileContextMenu from './FileContextMenu';
import CreateMenu from './CreateMenu';
import useDirectory from './useDirectory';
import { useSetting } from '../../settings/useSettings';

function buildCrumbs(fullPath) {
  if (!fullPath) return [];
  const isWin = /^[a-zA-Z]:\\/.test(fullPath);

  if (isWin) {
    const parts = fullPath.replace(/\\+$/, '').split('\\').filter(Boolean);
    const crumbs = [];
    let acc = parts[0] + '\\';
    crumbs.push({ name: parts[0] + '\\', path: acc });
    for (let i = 1; i < parts.length; i++) {
      acc = acc.endsWith('\\') ? acc + parts[i] : acc + '\\' + parts[i];
      crumbs.push({ name: parts[i], path: acc });
    }
    return crumbs;
  }

  const crumbs = [{ name: '/', path: '/' }];
  const parts = fullPath.replace(/\/+$/, '').split('/').filter(Boolean);
  let acc = '';
  for (const part of parts) {
    acc = acc + '/' + part;
    crumbs.push({ name: part, path: acc });
  }
  return crumbs;
}

function isRoot(p) {
  if (!p) return false;
  if (p === '/') return true;
  if (/^[a-zA-Z]:\\?$/.test(p)) return true;
  return false;
}

export default function DesktopFiles() {
  const enabled = useSetting('desktopFiles.enabled');
  const configuredPath = useSetting('desktopFiles.path');

  const [basePath, setBasePath] = useState(null);

  useEffect(() => {
    if (!enabled) { setBasePath(null); return; }
    if (configuredPath) { setBasePath(configuredPath); return; }
    const api = window.electron_desktop_API;
    api.getUserDirs().then((dirs) => setBasePath(dirs?.desktop || null))
      .catch(() => setBasePath(null));
  }, [enabled, configuredPath]);

  if (!enabled || !basePath) return null;

  return <DesktopFilesInner key={basePath} basePath={basePath} />;
}

function DesktopFilesInner({ basePath }) {
  const [currentPath, setCurrentPath] = useState(basePath);
  const [fileMenu, setFileMenu] = useState({ open: false, x: 0, y: 0, file: null });
  const [createMenu, setCreateMenu] = useState({ open: false, x: 0, y: 0 });

  const { reload } = useDirectory(currentPath);

  const handleContextMenu = useCallback((file, e) => {
    setFileMenu({ open: true, x: e.clientX, y: e.clientY, file });
  }, []);

  const handleCloseFileMenu = useCallback(() => {
    setFileMenu((m) => ({ ...m, open: false }));
  }, []);

  const handleOpenFolder = useCallback((folderPath) => {
    setCurrentPath(folderPath);
  }, []);

  const handleBack = useCallback(() => {
    if (isRoot(currentPath)) return;
    const parent = currentPath.replace(/[\\/][^\\/]+[\\/]?$/, '') || '/';
    setCurrentPath(parent || '/');
  }, [currentPath]);

  const handleOpenCreateMenu = useCallback((e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setCreateMenu({ open: true, x: r.left, y: r.bottom + 4 });
  }, []);

  const handleCloseCreateMenu = useCallback(() => {
    setCreateMenu((m) => ({ ...m, open: false }));
  }, []);

  const crumbs = buildCrumbs(currentPath);
  const canGoBack = !isRoot(currentPath);

  return (
    <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'auto' }}>
      {/* Панель навигации */}
      <Box
        sx={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.75,
          mb: 1,
          bgcolor: 'rgba(0,0,0,0.6)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          maxWidth: '100%',
          overflow: 'hidden',
        }}
      >
        <IconButton
          size="small"
          onClick={handleBack}
          disabled={!canGoBack}
          sx={{ color: canGoBack ? '#fff' : 'rgba(255,255,255,0.3)' }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          onClick={handleOpenCreateMenu}
          sx={{ color: '#fff' }}
          title="Создать файл или папку"
        >
          <AddIcon fontSize="small" />
        </IconButton>

        <Breadcrumbs
          maxItems={6}
          separator="/"
          sx={{
            color: '#aaa',
            flex: 1,
            minWidth: 0,
            '& .MuiBreadcrumbs-separator': { color: 'rgba(255,255,255,0.3)' },
            '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' },
          }}
        >
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <Link
                key={c.path}
                component="button"
                underline="hover"
                onClick={() => setCurrentPath(c.path)}
                sx={{
                  color: last ? '#fff' : '#aaa',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {c.name}
              </Link>
            );
          })}
        </Breadcrumbs>
      </Box>

      {/* Контент */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <FileView
          path={currentPath}
          layout="grid"
          onContextMenu={(file, e) => handleContextMenu(file, e)}
          onPathChange={handleOpenFolder}
          emptyText="Папка пуста"
        />
      </Box>

      {/* Контекстное меню файла (DOM) */}
      <FileContextMenu
        open={fileMenu.open}
        anchorPosition={{ x: fileMenu.x, y: fileMenu.y }}
        file={fileMenu.file}
        onClose={handleCloseFileMenu}
        onReload={reload}
      />

      {/* Меню создания (DOM) */}
      <CreateMenu
        open={createMenu.open}
        anchorPosition={{ x: createMenu.x, y: createMenu.y }}
        dir={currentPath}
        onClose={handleCloseCreateMenu}
      />
    </Box>
  );
}