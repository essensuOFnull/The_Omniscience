import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Box, Typography, List, ListItemButton, ListItemText, CircularProgress,
} from '@mui/material';

function App() {
  const params = new URLSearchParams(window.location.search);

  let paths = [];
  try {
    const raw = params.get('paths');
    if (raw) paths = JSON.parse(raw);
  } catch (_) {}
  if (!Array.isArray(paths)) paths = [];

  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (paths.length === 0) {
      setLoading(false);
      setError('Нет файлов для открытия');
      return;
    }
    const api = window.electron_desktop_API;
    api.getAppsForFile(paths[0]).then((res) => {
      if (res?.success) setApps(res.apps || []);
      else setError(res?.error || 'Не удалось получить список приложений');
      setLoading(false);
    }).catch((err) => {
      setError(err?.message || String(err));
      setLoading(false);
    });
  }, []);

  const handlePick = async (app) => {
    if (busy) return;
    setBusy(true);
    const api = window.electron_desktop_API;
    for (const p of paths) {
      try { await api.openWith(p, app.id); } catch (_) {}
    }
    window.close();
  };

  const subtitle = paths.length === 0
    ? '—'
    : paths.length === 1
      ? paths[0].split('/').pop()
      : `Файлов: ${paths.length}`;

  return (
    <Box
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Escape') window.close(); }}
      sx={{
        width: '100vw', height: '100vh',
        bgcolor: 'rgba(20,20,26,0.97)',
        color: '#fff',
        display: 'flex', flexDirection: 'column',
        p: 2, boxSizing: 'border-box',
        borderRadius: 2,
        border: '1px solid rgba(168,85,247,0.35)',
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
        Открыть с помощью
      </Typography>
      <Typography
        sx={{
          fontSize: 11, color: '#888', mb: 1.5,
          wordBreak: 'break-word',
        }}
      >
        {subtitle}
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={20} sx={{ color: '#a855f7' }} />
        </Box>
      )}

      {!loading && error && (
        <Typography sx={{ color: '#f55', fontSize: 12 }}>{error}</Typography>
      )}

      {!loading && !error && apps.length === 0 && (
        <Typography sx={{ color: '#888', fontSize: 12 }}>
          Приложения не найдены
        </Typography>
      )}

      {!loading && apps.length > 0 && (
        <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <List dense disablePadding>
            {apps.map((app) => (
              <ListItemButton
                key={app.id}
                onClick={() => handlePick(app)}
                disabled={busy}
                sx={{
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'rgba(168,85,247,0.15)' },
                }}
              >
                <ListItemText
                  primary={app.name}
                  primaryTypographyProps={{ fontSize: 13, color: '#fff' }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);