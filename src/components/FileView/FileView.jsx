import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import useDirectory from './useDirectory';
import { useFileIcon } from './useIcons';

/* ------------------------------------------------------------------ */
/* Одна иконка файла                                                    */
/* ------------------------------------------------------------------ */

function FileItem({ file, selected, onSelect, onOpen, onContextMenu }) {
  const iconUrl = useFileIcon(file.id);

  const handleClick = (e) => {
    e.stopPropagation();
    onSelect(file.id, e);
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    onOpen(file);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(file.id, e);
    onContextMenu(e, file);
  };

  return (
    <Box
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        p: 1,
        borderRadius: 1,
        cursor: 'pointer',
        userSelect: 'none',
        bgcolor: selected ? 'rgba(168,85,247,0.25)' : 'transparent',
        border: selected ? '1px solid rgba(168,85,247,0.6)' : '1px solid transparent',
        transition: 'background 0.1s',
        '&:hover': {
          bgcolor: selected ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.05)',
        },
        width: 90,
        boxSizing: 'border-box',
        // 👇 чтобы клики не улетали в фон сквозь иконку
        pointerEvents: 'auto',
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
          lineHeight: 1,
        }}
      >
        {iconUrl ? (
          <img
            src={iconUrl}
            width="48"
            height="48"
            alt=""
            draggable={false}
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <span>{file.isDir ? '📁' : '📄'}</span>
        )}
      </Box>
      <Typography
        variant="caption"
        sx={{
          color: '#fff',
          textAlign: 'center',
          wordBreak: 'break-word',
          lineHeight: 1.15,
          maxWidth: '100%',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {file.name}
      </Typography>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* FileView                                                             */
/* ------------------------------------------------------------------ */

/**
 * Универсальный компонент просмотра содержимого папки.
 *
 * @param {string}   path       — абсолютный путь к папке
 * @param {string}   layout     — 'grid' (сетка) | 'list' (список). По умолчанию 'grid'.
 * @param {function} onOpen     — вызывается при двойном клике. По умолчанию — открывает через xdg-open.
 *                                Для папок — переходит внутрь.
 * @param {function} onContextMenu — вызывается при правом клике. (path, event) => void.
 * @param {function} onPathChange  — вызывается при навигации внутрь папки (если FileView сам навигирует).
 * @param {boolean}  navigateSelf  — если true, двойной клик по папке меняет внутренний path (для standalone-использования).
 */
export default function FileView({
  path,
  layout = 'grid',
  onOpen,
  onContextMenu,
  onPathChange,
  navigateSelf = false,
  emptyText = 'Папка пуста',
}) {
  const [internalPath, setInternalPath] = useState(path);
  const [selectedId, setSelectedId] = useState(null);

  // Синхронизация с внешним path
  useEffect(() => {
    setInternalPath(path);
    setSelectedId(null);
  }, [path]);

  const activePath = navigateSelf ? internalPath : path;
  const { files, loading, error, reload } = useDirectory(activePath);

  const handleSelect = useCallback((id, e) => {
    // Клик по пустому месту не долетает сюда, потому что мы stopPropagation
    setSelectedId(id);
  }, []);

  const handleOpen = useCallback(async (file) => {
    if (onOpen) {
      onOpen(file);
      return;
    }

    const api = window.electron_desktop_API;

    if (file.isDir) {
      if (navigateSelf) {
        setInternalPath(file.id);
        onPathChange?.(file.id);
      } else {
        // Если не навигируем сами — всё равно открываем папку в файловом менеджере системы
        // (для случая рабочего стола: переход внутрь делает родитель)
        onPathChange?.(file.id);
      }
      return;
    }

    // Файл — открываем через систему
    await api.openPath(file.id);
  }, [onOpen, navigateSelf, onPathChange]);

  const handleContextMenu = useCallback((e, file) => {
    e.preventDefault();
    e.stopPropagation();
    if (file) setSelectedId(file.id);
    onContextMenu?.(file, e, { reload, path: activePath });
  }, [onContextMenu, reload, activePath]);

  // Снять выделение при клике по пустому месту
  const handleBackgroundClick = useCallback(() => {
    setSelectedId(null);
  }, []);

  const containerStyle = useMemo(() => ({
    display: layout === 'list' ? 'flex' : 'grid',
    flexDirection: layout === 'list' ? 'column' : undefined,
    gridTemplateColumns: layout === 'grid'
      ? 'repeat(auto-fill, 90px)'
      : undefined,
    gap: layout === 'grid' ? 0.5 : 0,
    p: 1,
    alignContent: 'flex-start',
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    overflowY: 'auto',
    position: 'relative',
  }), [layout]);

  return (
    <Box
      onClick={handleBackgroundClick}
      onContextMenu={(e) => handleContextMenu(e, null)}
      sx={containerStyle}
    >
      {loading && files.length === 0 && (
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <CircularProgress size={18} sx={{ color: '#a855f7' }} />
        </Box>
      )}

      {error === 'permission_denied' && (
        <Typography sx={{ color: '#f55', p: 2 }}>
          Нет доступа к папке
        </Typography>
      )}

      {error && error !== 'permission_denied' && (
        <Typography sx={{ color: '#f55', p: 2 }}>
          Ошибка: {error}
        </Typography>
      )}

      {!loading && !error && files.length === 0 && (
        <Typography sx={{ color: 'rgba(255,255,255,0.4)', p: 2, fontSize: 13 }}>
          {emptyText}
        </Typography>
      )}

      {layout === 'list'
        ? files.map((file) => (
            <FileListRow
              key={file.id}
              file={file}
              selected={selectedId === file.id}
              onSelect={handleSelect}
              onOpen={handleOpen}
              onContextMenu={handleContextMenu}
            />
          ))
        : files.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              selected={selectedId === file.id}
              onSelect={handleSelect}
              onOpen={handleOpen}
              onContextMenu={handleContextMenu}
            />
          ))}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Ряд для list-режима (заготовка на будущее)                          */
/* ------------------------------------------------------------------ */

function FileListRow({ file, selected, onSelect, onOpen, onContextMenu }) {
  const iconUrl = useFileIcon(file.id);
  return (
    <Box
      onClick={(e) => { e.stopPropagation(); onSelect(file.id, e); }}
      onDoubleClick={(e) => { e.stopPropagation(); onOpen(file); }}
      onContextMenu={(e) => onContextMenu(e, file)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1,
        py: 0.5,
        cursor: 'pointer',
        userSelect: 'none',
        borderRadius: 0.5,
        bgcolor: selected ? 'rgba(168,85,247,0.25)' : 'transparent',
        '&:hover': { bgcolor: selected ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.05)' },
        pointerEvents:'none'
      }}
    >
      <Box sx={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
        {iconUrl ? <img src={iconUrl} width="20" height="20" alt="" draggable={false} /> : (file.isDir ? '📁' : '📄')}
      </Box>
      <Typography sx={{ color: '#fff', fontSize: 13 }} noWrap>
        {file.name}
      </Typography>
    </Box>
  );
}