import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, IconButton, Breadcrumbs, Link } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileView from './FileView';
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
/* Обёртка: определяет базовый путь                                     */
/* ------------------------------------------------------------------ */

export default function DesktopFiles() {
  const enabled = useSetting('desktopFiles.enabled');
  const configuredPath = useSetting('desktopFiles.path');
  const [basePath, setBasePath] = useState(null);

  useEffect(() => {
    if (!enabled) { setBasePath(null); return; }
    if (configuredPath) { setBasePath(configuredPath); return; }

    const api = window.electron_desktop_API;
    if (!api?.getUserDirs) return;

    let cancelled = false;
    api.getUserDirs()
      .then((dirs) => { if (!cancelled) setBasePath(dirs?.desktop || null); })
      .catch(() => { if (!cancelled) setBasePath(null); });

    return () => { cancelled = true; };
  }, [enabled, configuredPath]);

  if (!enabled || !basePath) return null;

  return <DesktopFilesInner key={basePath} basePath={basePath} />;
}

/* ------------------------------------------------------------------ */
/* Внутренний компонент                                                 */
/* ------------------------------------------------------------------ */

function DesktopFilesInner({ basePath }) {
  const [currentPath, setCurrentPath] = useState(basePath);

  const { reload } = useDirectory(currentPath);

  // reload меняет идентичность при каждом ре-рендере useDirectory,
  // поэтому в слушателях всегда читаем через ref — подписка остаётся одна.
  const reloadRef = useRef(reload);
  useEffect(() => { reloadRef.current = reload; }, [reload]);

  /* ---------- Подписка на запросы из main ---------- */

  useEffect(() => {
    const api = window.electron_desktop_API;
    if (!api?.on) return;

    // Перезагрузка после операций из нативного меню (удаление, вставка и т.п.).
    const offReload = api.on('fs:request-reload', () => {
      reloadRef.current?.();
    });

    return () => {
      offReload?.();
    };
  }, []);

  /* ---------- Навигация ---------- */

  const handleOpenFolder = useCallback((folderPath) => {
    setCurrentPath(folderPath);
  }, []);

  const handleBack = useCallback(() => {
    setCurrentPath((prev) => {
      if (isRoot(prev)) return prev;
      const parent = prev.replace(/[\\/][^\\/]+[\\/]?$/, '') || '/';
      return parent || '/';
    });
  }, []);

  const handleNavigateTo = useCallback((targetPath) => {
    setCurrentPath(targetPath);
  }, []);

  /* ---------- Производные ---------- */

  const crumbs = buildCrumbs(currentPath);
  const canGoBack = !isRoot(currentPath);

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        display: 'flex',
        flexDirection: 'column',
        // pointerEvents: 'auto' наследуют все дочерние элементы.
        // Без этого клики уходят в фон окна и FileView не ловит мышь.
        pointerEvents: 'auto',
      }}
    >
      {/* ----- Панель навигации ----- */}
      <Box
        sx={{
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
                onClick={() => handleNavigateTo(c.path)}
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

      {/* ----- Контент ----- */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        <FileView
          path={currentPath}
          layout="grid"
          onPathChange={handleOpenFolder}
          emptyText="Папка пуста"
        />
      </Box>
    </Box>
  );
}