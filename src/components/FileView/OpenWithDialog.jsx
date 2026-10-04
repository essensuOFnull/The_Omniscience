import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  List, ListItemButton, ListItemText, CircularProgress, Typography,
} from '@mui/material';

export default function OpenWithDialog({ open, file, onClose }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !file) return;
    const api = window.electron_desktop_API;
    setLoading(true);
    setApps([]);
    api.getAppsForFile(file.id).then((res) => {
      setApps(res?.apps || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [open, file]);

  const handlePick = async (appId) => {
    if (!file) return;
    await window.electron_desktop_API.openWith(file.id, appId);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Открыть с помощью</DialogTitle>
      <DialogContent>
        {loading && (
          <Typography sx={{ color: '#aaa', fontSize: 13, py: 2, textAlign: 'center' }}>
            <CircularProgress size={18} sx={{ mr: 1 }} /> Поиск приложений...
          </Typography>
        )}
        {!loading && apps.length === 0 && (
          <Typography sx={{ color: '#888', fontSize: 13, py: 2 }}>
            Приложения не найдены
          </Typography>
        )}
        {!loading && apps.length > 0 && (
          <List dense disablePadding>
            {apps.map((app) => (
              <ListItemButton key={app.id} onClick={() => handlePick(app.id)}>
                <ListItemText primary={app.name} />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
      </DialogActions>
    </Dialog>
  );
}