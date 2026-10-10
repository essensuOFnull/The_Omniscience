import React, { useState, useEffect, useCallback } from 'react';
import { Box, IconButton, Breadcrumbs, Link } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import FileView from './FileView';
import CreateMenu from './CreateMenu';
import useDirectory from './useDirectory';
import { useSetting } from '../../settings/useSettings';

/* ------------------------------------------------------------------ */
/* Утилиты путей                                                        */
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
/* Обёртка DesktopFiles                                                 */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Внутренний компонент                                                 */
/* ------------------------------------------------------------------ */

function DesktopFilesInner({ basePath }) {
  const [currentPath, setCurrentPath] = useState(basePath);
  const [createMenu, setCreateMenu] = useState({ open: false, x: 0, y: 0 });

  const { reload } = useDirectory(currentPath);

  /* ---------- Слушаем запросы из нативного контекстного меню ---------- */

  useEffect(() => {
    const api = window.electron_desktop_API;
    if (!api?.on) return;

    // Создать файл/папку из нативного меню (ПКМ на пустом месте)
    const offCreate = api.on('fs:request-create', (payload) => {
      if (!payload || typeof payload.dir !== 'string') return;
      const kind = payload.kind === 'folder' ? 'folder' : 'file';
      const defaultName = kind === 'folder' ? 'Новая папка' : 'Новый файл.txt';
      const name = window.prompt(
        kind === 'folder' ? 'Имя новой папки:' : 'Имя нового файла:',
        defaultName,
      );
      if (!name || !name.trim()) return;
      const trimmed = name.trim();
      const promise = kind === 'folder'
        ? api.createFolder(payload.dir, trimmed)
        : api.createFile(payload.dir, trimmed);
      promise.then((res) => {
        if (!res?.success) {
          window.alert(`Не удалось создать: ${res?.error || 'unknown'}`);
        } else {
          reload();
        }
      });
    });

    // Перезагрузка после операций из меню
    const offReload = api.on('fs:request-reload', () => {
      reload();
    });

    return () => {
      offCreate?.();
      offReload?.();
    };
  }, [reload]);

  /* ---------- Навигация ---------- */

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
    <Box
      sx={{
        position: 'absolute', inset: 0, zIndex: 0,
        pointerEvents: 'none',
        display: 'flex', flexDirection: 'column',
      }}
    >
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
          flexShrink: 0,
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

      {/* Контент — FileView растягивается на всё оставшееся место */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        <FileView
          path={currentPath}
          layout="grid"
          onPathChange={handleOpenFolder}
          emptyText="Папка пуста"
        />
      </Box>

      {/* CreateMenu для клика по кнопке "+" */}
      <CreateMenu
        open={createMenu.open}
        anchorPosition={{ x: createMenu.x, y: createMenu.y }}
        dir={currentPath}
        onClose={handleCloseCreateMenu}
      />
    </Box>
  );
}