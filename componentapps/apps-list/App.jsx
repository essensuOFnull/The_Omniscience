import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box, Grid, Card, CardActionArea, Typography, Chip, Stack,
  TextField, InputAdornment, Divider, CircularProgress,
  Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

/* ------------------------------------------------------------------ */
/* Константы                                                           */
/* ------------------------------------------------------------------ */

const KIND_COLOR = {
  componentapp: '#6f42c1',
  webapp: '#2196f3',
  extension: '#4caf50',
  native: '#ff9800',
};

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'componentapp', label: 'Componentapps' },
  { id: 'webapp', label: 'Webapps' },
  { id: 'extension', label: 'Расширения' },
  { id: 'native', label: 'Программы' },
];

const FILTER_COLOR = {
  all: '#a855f7',
  componentapp: KIND_COLOR.componentapp,
  webapp: KIND_COLOR.webapp,
  extension: KIND_COLOR.extension,
  native: KIND_COLOR.native,
};

const PAGE_SIZE = 60;

/* ------------------------------------------------------------------ */
/* Хелперы                                                             */
/* ------------------------------------------------------------------ */

function inferKind(app) {
  if (app.type === 'browser') return 'webapp';
  if (app.type) return app.type;
  return 'componentapp';
}

function getFirstLetter(title) {
  if (!title) return '#';
  const ch = title.trim().charAt(0).toUpperCase();
  if (/[A-ZА-ЯЁ]/.test(ch)) return ch;
  return '#';
}

function getNewWindowId() {
  return `win-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ------------------------------------------------------------------ */
/* Фильтр-кнопка                                                       */
/* ------------------------------------------------------------------ */

function FilterButton({ active, label, color, onClick }) {
  return (
    <Button
      size="small"
      variant={active ? 'contained' : 'outlined'}
      onClick={onClick}
      sx={{
        textTransform: 'none',
        fontSize: 11,
        height: 26,
        px: 1.2,
        bgcolor: active ? color : 'transparent',
        color: active ? '#fff' : color,
        borderColor: color,
        borderWidth: '1px',
        borderStyle: 'solid',
        minWidth: 0,
        '&:hover': {
          bgcolor: active ? color : `${color}22`,
          borderColor: color,
        },
      }}
      className="ignore_The_Omniscience_Theme_recursive"
    >
      {label}
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

export default function App({ desktopId }) {
  const [baseApps, setBaseApps] = useState([]);
  const [nativeApps, setNativeApps] = useState([]);
  const [extensions, setExtensions] = useState([]);

  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingNative, setLoadingNative] = useState(true);
  const [loadingExtensions, setLoadingExtensions] = useState(true);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  /* -------- Асинхронная загрузка трёх источников -------- */
  useEffect(() => {
    const desktopApi = window.electron_desktop_API;
    const viewApi = window.electron_view_API;
    if (!desktopApi) return;

    viewApi?.getAppsList?.()
      .then((list) => setBaseApps(list || []))
      .catch(() => { })
      .finally(() => setLoadingBase(false));

    desktopApi.invoke('get-native-apps', {})
      .then((list) => setNativeApps(list || []))
      .catch((err) => console.error('[apps-list] native:', err))
      .finally(() => setLoadingNative(false));

    desktopApi.invoke('get-extensions-list')
      .then((list) => setExtensions(list || []))
      .catch((err) => console.error('[apps-list] extensions:', err))
      .finally(() => setLoadingExtensions(false));
  }, []);

  /* -------- Общий список + сортировка -------- */
  const allApps = useMemo(() => {
    const list = [
      ...(baseApps || []).map((a) => ({ ...a, uid: `app:${a.id}`, kind: inferKind(a) })),
      ...(nativeApps || []).map((a) => ({ ...a, uid: `native:${a.id}` })),
      ...(extensions || []).map((a) => ({ ...a, uid: `ext:${a.id}` })),
    ];

    list.sort((a, b) =>
      (a.title || a.id || '').localeCompare(b.title || b.id || '', 'ru')
    );

    return list;
  }, [baseApps, nativeApps, extensions]);

  /* -------- Фильтрация по типу + поиску -------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allApps.filter((app) => {
      if (filter !== 'all' && app.kind !== filter) return false;
      if (!q) return true;
      return (
        app.title?.toLowerCase().includes(q) ||
        app.id?.toLowerCase().includes(q)
      );
    });
  }, [allApps, search, filter]);

  /* -------- Сброс счётчика при смене фильтра/поиска -------- */
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [search, filter]);

  /* -------- Что показываем сейчас -------- */
  const pageItems = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  const hasMore = visibleCount < filtered.length;

  /* -------- Подгрузка следующей порции -------- */
  const loadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
  }, [filtered.length]);

  /* -------- IntersectionObserver на sentinel -------- */
  useEffect(() => {
    const root = scrollRef.current;
    const target = sentinelRef.current;
    if (!root || !target || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { root, rootMargin: '300px', threshold: 0 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMore, visibleCount]);

  /* -------- Открытие окна Omniscience -------- */
  const openAsBrowserWindow = useCallback(({
    id, appId, url, preload, title, icon, width = 900, height = 600,
  }) => {
    const desktopApi = window.electron_desktop_API;
    if (!desktopApi) return;

    desktopApi.send('window:create', {
      id,
      appId,
      url,                 // ← сырой URL, main сам разрешит
      preload: preload || null,
      title,
      icon,
      bounds: null,        // main отцентрирует
      desktopId,           // ← main сам добавит в query
      maximized: false,
    });
  }, [desktopId]);

  /* -------- Клик по карточке -------- */
  const handleClick = useCallback((app) => {
    const desktopApi = window.electron_desktop_API;

    // Нативные программы Linux (не наши окна)
    if (app.kind === 'native') {
      desktopApi?.send('launch-native-app', {
        exec: app.exec,
        terminal: app.terminal,
      });
      return;
    }

    // Расширения Chrome — открываются как popup внутри нашего окна
    if (app.kind === 'extension') {
      desktopApi.invoke('get-extension-popup-url', { extensionId: app.extensionId })
        .then((url) => {
          if (!url) return;
          openAsBrowserWindow({
            id: getNewWindowId(),
            appId: null,
            url,
            title: app.title,
            icon: app.icon,
            width: 400,
            height: 550,
          });
        })
        .catch((err) => console.error('[apps-list] popup:', err));
      return;
    }

    // Componentapp или webapp — обычное окно Omniscience
    openAsBrowserWindow({
      id: getNewWindowId(),
      appId: app.id,
      url: app.url,
      preload: app.preloadPath || null,
      title: app.title,
      icon: app.icon,
      width: 900,
      height: 600,
    });
  }, [openAsBrowserWindow]);

  const isLoading = loadingBase || loadingNative || loadingExtensions;

  /* ------------------------------------------------------------------ */
  /* Рендер                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {/* === HEADER === */}
      <Box
        sx={{
          p: 2,
          pb: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          bgcolor: 'rgba(0,0,0,0.4)',
          flexShrink: 0,
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 18 }} />
              </InputAdornment>
            ),
            endAdornment: isLoading ? (
              <InputAdornment position="end">
                <CircularProgress size={14} sx={{ color: '#a855f7' }} />
              </InputAdornment>
            ) : null,
            sx: {
              color: 'white',
              bgcolor: 'rgba(255,255,255,0.05)',
              borderRadius: 2,
              '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
            },
          }}
        />

        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.5, gap: 1 }}>
          {FILTERS.map((f) => (
            <FilterButton
              key={f.id}
              active={filter === f.id}
              label={f.label}
              color={FILTER_COLOR[f.id]}
              onClick={() => setFilter(f.id)}
            />
          ))}
        </Stack>
      </Box>

      {/* === BODY === */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          pt: 1,
          pb: 2,
          minHeight: 0,
        }}
      >
        {pageItems.length === 0 && !isLoading && (
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', mt: 4 }}>
            Ничего не найдено
          </Typography>
        )}

        {(() => {
          const groups = [];
          let current = null;
          pageItems.forEach((app) => {
            const title = app.title || app.id || '';
            const letter = getFirstLetter(title);
            if (!current || current.letter !== letter) {
              current = { letter, items: [] };
              groups.push(current);
            }
            current.items.push(app);
          });

          return groups.map((group) => (
            <Box key={group.letter}>
              <Divider
                textAlign="left"
                sx={{
                  mb: 2,
                  mt: 1,
                  '&::before': { borderColor: 'rgba(255,255,255,0.15)' },
                  '&::after': { borderColor: 'rgba(255,255,255,0.15)' },
                }}
              >
                <Typography
                  sx={{
                    color: '#a855f7',
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: '2px',
                    px: 1,
                  }}
                >
                  {group.letter}
                </Typography>
              </Divider>

              <Grid container spacing={2}>
                {group.items.map((app) => (
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
                        label={app.kind}
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
                        onClick={() => handleClick(app)}
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
            </Box>
          ));
        })()}

        {hasMore && (
          <Box
            ref={sentinelRef}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 3,
              height: 40,
            }}
          >
            <CircularProgress size={20} sx={{ color: '#a855f7' }} />
          </Box>
        )}
      </Box>
    </Box>
  );
}