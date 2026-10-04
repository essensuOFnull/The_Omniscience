import React, { useState, useEffect, useCallback } from 'react';
import {
  Menu, MenuItem, Divider, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Button, Alert,
} from '@mui/material';

const DEFAULT_FOLDER_NAME = 'Новая папка';
const DEFAULT_FILE_NAME = 'Новый файл.txt';

export default function CreateMenu({
  open,
  anchorPosition,
  dir,
  onClose,
}) {
  const api = window.electron_desktop_API;

  const [templates, setTemplates] = useState([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogValue, setDialogValue] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [pending, setPending] = useState(null); // { kind: 'folder'|'file'|'template', template?: {...} }

  // Загружаем шаблоны при первом открытии
  useEffect(() => {
    if (!open || templatesLoaded) return;
    api.getTemplates().then((res) => {
      setTemplates(res?.templates || []);
      setTemplatesLoaded(true);
    }).catch(() => setTemplatesLoaded(true));
  }, [open, templatesLoaded, api]);

  const startCreate = useCallback((kind, template) => {
    setPending({ kind, template });
    setDialogError('');
    if (kind === 'folder') {
      setDialogTitle('Новая папка');
      setDialogValue(DEFAULT_FOLDER_NAME);
    } else if (kind === 'file') {
      setDialogTitle('Новый файл');
      setDialogValue(DEFAULT_FILE_NAME);
    } else if (kind === 'template') {
      setDialogTitle('Создать из шаблона');
      setDialogValue(template?.name || 'Новый файл');
    }
    setDialogOpen(true);
    onClose?.();
  }, [onClose]);

  const handleConfirm = useCallback(async () => {
    if (!pending) return;
    const name = dialogValue.trim();
    if (!name) {
      setDialogError('Имя не может быть пустым');
      return;
    }

    let res;
    if (pending.kind === 'folder') {
      res = await api.createFolder(dir, name);
    } else if (pending.kind === 'file') {
      res = await api.createFile(dir, name);
    } else if (pending.kind === 'template') {
      res = await api.createFromTemplate(dir, pending.template.id, name);
    }

    if (!res?.success) {
      const err = res?.error || 'unknown';
      setDialogError(
        err === 'EEXIST'
          ? `«${name}» уже существует`
          : `Не удалось создать: ${err}`
      );
      return;
    }

    // Успех — закрываем диалог
    setDialogOpen(false);
    setPending(null);
  }, [pending, dialogValue, dir, api]);

  const handleCancelDialog = () => {
    setDialogOpen(false);
    setPending(null);
    setDialogError('');
  };

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
        <MenuItem onClick={() => startCreate('folder')}>
          📁 Новая папка
        </MenuItem>
        <MenuItem onClick={() => startCreate('file')}>
          📄 Новый файл
        </MenuItem>

        <Divider />

        <MenuItem disabled sx={{ opacity: 0.6, fontSize: 11 }}>
          Создать из шаблона:
        </MenuItem>
        {templates.length === 0 && (
          <MenuItem disabled sx={{ opacity: 0.5, fontSize: 12, pl: 3 }}>
            {templatesLoaded ? '(папка Templates пуста)' : 'загрузка…'}
          </MenuItem>
        )}
        {templates.map((t) => (
          <MenuItem
            key={t.id}
            onClick={() => startCreate('template', t)}
            sx={{ pl: 3, fontSize: 13 }}
          >
            {t.name}
          </MenuItem>
        ))}
      </Menu>

      <Dialog
        open={dialogOpen}
        onClose={handleCancelDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            value={dialogValue}
            onChange={(e) => { setDialogValue(e.target.value); setDialogError(''); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
              if (e.key === 'Escape') { e.preventDefault(); handleCancelDialog(); }
            }}
            sx={{ mt: 1 }}
          />
          {dialogError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {dialogError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDialog}>Отмена</Button>
          <Button variant="contained" onClick={handleConfirm}>ОК</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}