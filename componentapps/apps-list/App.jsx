import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Grid, Card, CardActionArea, Typography,
  TextField, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { viewDispatch } from '@viewRuntime';

export default function App({ desktopId }) {
  const [apps, setApps] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    window.electron_view_API?.getAppsList?.().then(setApps).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return apps.filter(
      (app) =>
        app.title?.toLowerCase().includes(q) ||
        app.id?.toLowerCase().includes(q)
    );
  }, [apps, search]);

  const handleAppClick = (app, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    viewDispatch('createWindow', {
      desktopId,
      appId: app.id,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      width: 900,
      height: 600,
      url: app.url || null,
      extra: { app, filePath: app.path },
    });
    // Без closeOverview — можно открыть сколько угодно окон подряд.
  };

  return (
    <Box sx={{ width: '100%', height: '100%', p: 2, boxSizing: 'border-box' }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Поиск приложений..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
            </InputAdornment>
          ),
          sx: {
            color: 'white',
            bgcolor: 'rgba(255,255,255,0.05)',
            borderRadius: 2,
            '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
          },
        }}
        sx={{ mb: 3 }}
      />
      <Grid container spacing={2}>
        {filtered.map((app) => (
          <Grid item xs={6} sm={4} md={3} lg={2} key={app.id}>
            <Card
              sx={{
                bgcolor: 'rgba(255,255,255,0.05)',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.1)',
                transition: '0.2s',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.02)',
                },
              }}
            >
              <CardActionArea
                onClick={(e) => handleAppClick(app, e)}
                sx={{ p: 2, textAlign: 'center' }}
              >
                {app.icon ? (
                  <img
                    src={app.icon}
                    width="48"
                    height="48"
                    alt="icon"
                    style={{ display: 'block', margin: '0 auto 8px' }}
                  />
                ) : (
                  <Box sx={{ fontSize: 40, mb: 1 }}>📦</Box>
                )}
                <Typography variant="body2" sx={{ color: 'white' }}>
                  {app.title || app.id}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}