import React, { useState, useEffect } from 'react';
import {
  Menu, MenuItem, Divider, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Button,
} from '@mui/material';
import OpenWithDialog from './OpenWithDialog';

export default function FileContextMenu({
  open,
  anchorPosition,
  file,
  onClose,
  onReload,
}) {
  const api = window.electron_desktop_API;

  // Сохраняем файл локально — чтобы диалоги не теряли его при закрытии меню
  const [activeFile, setActiveFile] = useState(null);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const [openWithOpen, setOpenWithOpen] = useState(false);

  // Запоминаем текущий файл, пока меню открыто
  useEffect(() => {
    if (open && file) setActiveFile(file);
  }, [open, file]);

  /* -------------------- Обработчики меню -------------------- */

  const handleOpen = async () => {
    if (!activeFile) return;
    onClose?.();
    await api.openPath(activeFile.id);
  };

  const handleStartOpenWith = () => {
    if (!activeFile) return;
    setOpenWithOpen(true);
    onClose?.();
  };

  const handleStartRename = () => {
    if (!activeFile) return;
    setRenameValue(activeFile.name);
    setRenameOpen(true);
    onClose?.();
  };

  const handleReveal = async () => {
    if (!activeFile) return;
    onClose?.();
    await api.revealPath(activeFile.id);
  };

  const handleCopyPath = async () => {
    if (!activeFile) return;
    onClose?.();
    try {
      await navigator.clipboard.writeText(activeFile.id);
    } catch (_) {
      // fallback для окружений без Clipboard API
      const el = document.createElement('textarea');
      el.value = activeFile.id;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(el);
    }
  };

  const handleTrash = async () => {
    if (!activeFile) return;
    onClose?.();
    await api.trashPath(activeFile.id);
    onReload?.();
  };

  const handleDelete = async () => {
    if (!activeFile) return;
    onClose?.();
    if (!window.confirm(`Удалить безвозвратно "${activeFile.name}"?`)) return;
    await api.deletePath(activeFile.id);
    onReload?.();
  };

  /* -------------------- Обработчики диалогов -------------------- */

  const handleConfirmRename = async () => {
    if (!activeFile) { setRenameOpen(false); return; }
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === activeFile.name) {
      setRenameOpen(false);
      return;
    }
    const res = await api.renamePath(activeFile.id, trimmed);
    setRenameOpen(false);
    if (res?.success) onReload?.();
  };

  /* -------------------- Меню -------------------- */

  const hasFile = !!activeFile;

  return (
    <>
      <Menu
        open={open}
        onClose={onClose}
        anchorReference="anchorPosition"
        anchorPosition={
          anchorPosition
            ? { top: anchorPosition.y, left: anchorPosition.x }
            : undefined
        }
        MenuListProps={{ dense: true }}
      >
        <MenuItem onClick={handleOpen} disabled={!hasFile}>
          Открыть
        </MenuItem>
        <MenuItem onClick={handleStartOpenWith} disabled={!hasFile}>
          Открыть с помощью…
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleStartRename} disabled={!hasFile}>
          Переименовать
        </MenuItem>
        <MenuItem onClick={handleCopyPath} disabled={!hasFile}>
          Скопировать полный путь
        </MenuItem>
        <MenuItem onClick={handleReveal} disabled={!hasFile}>
          Показать в файловом менеджере
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleTrash} disabled={!hasFile}>
          Удалить в корзину
        </MenuItem>
        <MenuItem
          onClick={handleDelete}
          disabled={!hasFile}
          sx={{ color: '#f55' }}
        >
          Удалить безвозвратно
        </MenuItem>
      </Menu>

      {/* Диалог переименования */}
      <Dialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Переименовать</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirmRename();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setRenameOpen(false);
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleConfirmRename}>
            ОК
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог «Открыть с помощью» */}
      <OpenWithDialog
        open={openWithOpen}
        file={activeFile}
        onClose={() => setOpenWithOpen(false)}
      />
    </>
  );
}