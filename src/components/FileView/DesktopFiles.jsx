import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, IconButton, Breadcrumbs, Link } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileView from './FileView';
import FileContextMenu from './FileContextMenu';
import useDirectory from './useDirectory';
import { useSetting } from '../../settings/useSettings';

/* ------------------------------------------------------------------ */
/* Хлебные крошки — строго от корня ФС                                 */
/* ------------------------------------------------------------------ */

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

  // Unix
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

/* ------------------------------------------------------------------ */
/* Внешний враппер: следит за настройками                              */
/* ------------------------------------------------------------------ */

export default function DesktopFiles() {
  const enabled = useSetting('desktopFiles.enabled');
  const configuredPath = useSetting('desktopFiles.path');

  const [basePath, setBasePath] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setBasePath(null);
      return;
    }
    if (configuredPath) {
      setBasePath(configuredPath);
      return;
    }
    const api = window.electron_desktop_API;
    api.getUserDirs().then((dirs) => {
      setBasePath(dirs?.desktop || null);
    }).catch(() => setBasePath(null));
  }, [enabled, configuredPath]);

  if (!enabled || !basePath) return null;

  // key={basePath} гарантирует сброс внутреннего состояния при смене базы
  return <DesktopFilesInner key={basePath} basePath={basePath} />;
}

/* ------------------------------------------------------------------ */
/* Внутренний компонент                                                 */
/* ------------------------------------------------------------------ */

function DesktopFilesInner({ basePath }) {
  const [currentPath, setCurrentPath] = useState(basePath);
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0, file: null });

  const { reload } = useDirectory(currentPath);

  const handleContextMenu = useCallback((file, e) => {
    setMenu({ open: true, x: e.clientX, y: e.clientY, file });
  }, []);

  const handleCloseMenu = useCallback(() => {
    setMenu((m) => ({ ...m, open: false }));
  }, []);

  const handleOpenFolder = useCallback((folderPath) => {
    setCurrentPath(folderPath);
  }, []);

  const handleBack = useCallback(() => {
    if (isRoot(currentPath)) return;
    const parent = currentPath.replace(/[\\/][^\\/]+[\\/]?$/, '') || '/';
    setCurrentPath(parent || '/');
  }, [currentPath]);

  const crumbs = buildCrumbs(currentPath);
  const canGoBack = !isRoot(currentPath);

  return (
    <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      {/* Панель навигации — ВСЕГДА видима */}
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
          backdropFilter: 'blur(8px)',
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
      <Box sx={{ pointerEvents: 'none', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <FileView
          path={currentPath}
          layout="grid"
          onContextMenu={(file, e) => handleContextMenu(file, e)}
          onPathChange={handleOpenFolder}
          emptyText="Папка пуста"
        />
      </Box>

      <FileContextMenu
        open={menu.open}
        anchorPosition={{ x: menu.x, y: menu.y }}
        file={menu.file}
        onClose={handleCloseMenu}
        onReload={reload}
      />
    </Box>
  );
}