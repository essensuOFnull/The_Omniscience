import React, { useEffect, useState, useRef } from 'react';
import { AppBar, Toolbar, IconButton, TextField, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';

export default function AddressBar({
  currentUrl, canGoBack, canGoForward, loading,
  onNavigateTo, onBack, onForward, onReload,
}) {
  const [value, setValue] = useState(currentUrl || '');
  const inputRef = useRef(null);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setValue(currentUrl || '');
  }, [currentUrl]);

  const submit = () => {
    onNavigateTo(value.trim());
    inputRef.current?.blur();
  };

  return (
    <AppBar position="static" color="transparent" elevation={0}
      sx={{ minHeight: 40, bgcolor: 'rgba(30,0,30,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <Toolbar variant="dense" sx={{ minHeight: 40, px: 1, gap: 0.5 }}>
        <IconButton size="small" onClick={onBack} disabled={!canGoBack} sx={{ color: '#fff' }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onForward} disabled={!canGoForward} sx={{ color: '#fff' }}>
          <ArrowForwardIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onReload} sx={{ color: '#fff' }}>
          <RefreshIcon fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            size="small"
            variant="outlined"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => { focusedRef.current = true; }}
            onBlur={() => { focusedRef.current = false; }}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="Введите адрес или поиск"
            InputProps={{
              sx: {
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.05)',
                borderRadius: 1,
                fontSize: 12,
                '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
              },
            }}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
}