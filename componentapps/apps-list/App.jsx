import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Grid, Card, CardActionArea, Typography, Chip,
  TextField, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { viewDispatch } from '@viewRuntime';

const KIND_LABEL = {
  componentapp: 'componentapp',
  webapp: 'webapp',
  extension: 'extension',
  native: 'native',
};

const KIND_COLOR = {
  componentapp: '#6f42c1',
  webapp: '#2196f3',
  extension: '#4caf50',
  native: '#ff9800',
};

function inferKind(app) {
  if (app.kind) return app.kind;
  if (app.type === 'browser') return 'webapp';
  return 'componentapp';
}

export default function App({ desktopId }) {
  const [baseApps, setBaseApps] = useState([]);
  const [nativeApps, setNativeApps] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const desktopApi = window.electron_desktop_API;
    const viewApi = window.electron_view_API;
    if (!desktopApi) {
      console.warn('[apps-list] electron_desktop_API не найден');
      return;
    }

    // 1. Componentapps + webapps
    viewApi?.getAppsList?.()
      .then((list) => setBaseApps(list || []))
      .catch(() => { });

    // 2. Нативные программы (.desktop файлы)
    desktopApi.invoke('get-native-apps', {})
      .then((list) => {
        console.log('[apps-list] native apps:', list?.length);
        setNativeApps(list || []);
      })
      .catch((err) => console.error('[apps-list] native:', err));

    // 3. Расширения
    desktopApi.invoke('get-extensions-list')
      .then((list) => {
        console.log('[apps-list] extensions:', list?.length);
        setExtensions(list || []);
      })
      .catch((err) => console.error('[apps-list] ext:', err));
  }, []);

  const allApps = useMemo(() => {
    const list = [
      ...(baseApps || []).map((a) => ({
        ...a,
        uid: `app:${a.id}`,
        kind: inferKind(a),
      })),
      ...(nativeApps || []).map((a) => ({ ...a, uid: a.id })),
      ...(extensions || []).map((a) => ({ ...a, uid: a.id })),
    ];

    list.sort((a, b) =>
      (a.title || a.id || '').localeCompare(b.title || b.id || '', 'ru')
    );

    return list;
  }, [baseApps, nativeApps, extensions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allApps;
    return allApps.filter((app) =>
      app.title?.toLowerCase().includes(q) ||
      app.id?.toLowerCase().includes(q) ||
      app.kind?.toLowerCase().includes(q)
    );
  }, [allApps, search]);

  const handleClick = (app, e) => {
    const desktopApi = window.electron_desktop_API;

    if (app.kind === 'native') {
      desktopApi?.send('launch-native-app', {
        exec: app.exec,
        terminal: app.terminal,
      });
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();

    if (app.kind === 'extension') {
      desktopApi.invoke('get-extension-popup-url', { extensionId: app.extensionId })
        .then((url) => {
          if (!url) {
            console.warn('[apps-list] нет popup для', app.extensionId);
            return;
          }
          // Открываем popup расширения в отдельном окне Omniscience
          viewDispatch('createWindow', {
            desktopId,
            appId: null,
            cx: rect.left + rect.width / 2,
            cy: rect.top + rect.height / 2,
            width: 400,
            height: 550,
            url,
            extra: {},
          });
        })
        .catch((err) => console.error('[apps-list] popup url:', err));
      return;
    }

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
  };

  return (
    <Box sx={{ width: '100%', height: '100%', p: 2, boxSizing: 'border-box', overflow: 'auto' }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Поиск приложений, расширений, программ..."
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
          <Grid item xs={6} sm={4} md={3} lg={2} key={app.uid}>
            <Card
              sx={{
                bgcolor: 'rgba(255,255,255,0.05)',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.1)',
                transition: '0.2s',
                position: 'relative',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.02)',
                },
              }}
            >
              <Chip
                label={KIND_LABEL[app.kind] || app.kind}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 4,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  height: 16,
                  fontSize: 9,
                  fontWeight: 600,
                  bgcolor: KIND_COLOR[app.kind] || '#555',
                  color: '#fff',
                  zIndex: 2,
                  '& .MuiChip-label': { px: 0.7 },
                }}
                className="ignore_The_Omniscience_Theme_recursive"
              />

              <CardActionArea
                onClick={(e) => handleClick(app, e)}
                sx={{ p: 2, pt: 3, textAlign: 'center' }}
              >
                {app.icon ? (
                  <img
                    src={app.icon}
                    width="48"
                    height="48"
                    alt="icon"
                    style={{ display: 'block', margin: '0 auto 8px', objectFit: 'contain' }}
                  />
                ) : (
                  <Box sx={{ fontSize: 40, mb: 1 }}>📦</Box>
                )}
                <Typography
                  variant="body2"
                  sx={{
                    color: 'white',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    wordBreak: 'break-word',
                  }}
                >
                  {app.title || app.id}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filtered.length === 0 && (
        <Typography sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', mt: 4 }}>
          Ничего не найдено
        </Typography>
      )}
    </Box>
  );
}