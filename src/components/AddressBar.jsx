import React from 'react';
import { Box, IconButton, TextField, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';

export default function AddressBar({
  win, app, currentUrl, setCurrentUrl, navigateTo,
  goBack, goForward, reload, loading, canGoBack, canGoForward
}) {
  // Показываем только если окно в режиме браузера (определяется в TitleBar, но здесь надо знать)
  // Режим браузера хранится в TitleBar, поэтому передадим пропсом show
  // Можно перенести browserMode в общее состояние или передавать show пропсом.
  // Для простоты пока будем считать, что AddressBar всегда отображается, если передан пропс show.
  // Но в исходном коде он условный: {browserMode && (...)}. Поэтому добавим пропс show.
  if (!win.showAddressBar) return null; // или используем show из пропсов

  const handleSubmit = (e) => {
    e.preventDefault();
    navigateTo(currentUrl);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.5,
        px: 0.5, py: 0.25,
        bgcolor: 'transparent',
        borderBottom: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      <IconButton size="small" onClick={goBack} disabled={!canGoBack}>
        <ArrowBackIcon fontSize="small" />
      </IconButton>
      <IconButton size="small" onClick={goForward} disabled={!canGoForward}>
        <ArrowForwardIcon fontSize="small" />
      </IconButton>
      <IconButton size="small" onClick={reload}>
        <RefreshIcon fontSize="small" />
      </IconButton>
      {loading ? (
        <CircularProgress size={16} sx={{ flexShrink: 0 }} />
      ) : (
        <IconButton size="small" onClick={() => navigateTo(app?.homeUrl || 'about:blank')}>
          <HomeIcon fontSize="small" />
        </IconButton>
      )}
      <TextField
        variant="outlined"
        size="small"
        fullWidth
        value={currentUrl}
        onChange={(e) => setCurrentUrl(e.target.value)}
        placeholder="Введите адрес или поисковый запрос"
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: 'rgba(255,255,255,0.05)',
            '& fieldset': { borderColor: 'divider' },
          },
          input: { color: 'text.primary', py: 0.5 },
        }}
      />
      <IconButton type="submit" size="small">
        <ArrowForwardIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}