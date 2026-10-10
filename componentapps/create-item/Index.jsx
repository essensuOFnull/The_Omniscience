import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { Box, TextField, Button, Typography, Stack } from '@mui/material';

function App() {
  const params = new URLSearchParams(window.location.search);
  const dir = params.get('dir') || '';
  const kind = params.get('kind') === 'file' ? 'file' : 'folder';

  const defaultName = kind === 'folder' ? 'Новая папка' : 'Новый файл.txt';
  const titleText = kind === 'folder' ? 'Новая папка' : 'Новый файл';

  const [value, setValue] = useState(defaultName);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      // Выделяем базовое имя без расширения (как в rename)
      const dot = defaultName.lastIndexOf('.');
      if (dot > 0) inputRef.current.setSelectionRange(0, dot);
      else inputRef.current.select();
    }
  }, [defaultName]);

  const handleConfirm = async () => {
    if (busy) return;
    const trimmed = value.trim();
    if (!trimmed) { setError('Имя не может быть пустым'); return; }
    if (trimmed.includes('/')) { setError('Имя не может содержать «/»'); return; }

    setBusy(true);
    const api = window.electron_desktop_API;
    const res = kind === 'folder'
      ? await api.createFolder(dir, trimmed)
      : await api.createFile(dir, trimmed);

    if (!res?.success) {
      const err = res?.error || 'unknown';
      setError(
        err === 'EEXIST'
          ? `«${trimmed}» уже существует`
          : `Не удалось создать: ${err}`,
      );
      setBusy(false);
      return;
    }
    window.close();
  };

  return (
    <Box
      className="ignore_The_Omniscience_Theme_recursive"
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
      <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1.25 }}>
        {titleText}
      </Typography>

      <TextField
        inputRef={inputRef}
        fullWidth
        size="small"
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(''); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter')  { e.preventDefault(); handleConfirm(); }
          if (e.key === 'Escape') { e.preventDefault(); window.close(); }
        }}
        sx={{
          '& input': { color: '#fff', fontFamily: 'monospace', fontSize: 13 },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
        }}
      />

      {error && (
        <Typography sx={{ color: '#f55', fontSize: 11, mt: 0.75 }}>
          {error}
        </Typography>
      )}

      <Box sx={{ flex: 1 }} />

      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button
          size="small"
          onClick={() => window.close()}
          sx={{ color: '#aaa', textTransform: 'none' }}
        >
          Отмена
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={handleConfirm}
          disabled={busy}
          sx={{
            bgcolor: '#a855f7', textTransform: 'none',
            '&:hover': { bgcolor: '#9333ea' },
          }}
        >
          ОК
        </Button>
      </Stack>
    </Box>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);