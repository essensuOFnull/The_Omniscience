import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Stack, Divider, IconButton,
  Slider, Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BuildIcon from '@mui/icons-material/Build';
import RefreshIcon from '@mui/icons-material/Refresh';
import LayersIcon from '@mui/icons-material/Layers';

function api() {
  return window.electron_topbar_API || null;
}

async function invoke(channel, payload) {
  const a = api();
  if (!a) return null;
  try { return await a.invoke(channel, payload); }
  catch { return null; }
}

function fire(channel, payload) {
  api()?.send?.(channel, payload);
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const windowId = params.get('windowId') || '';

  const [win, setWin] = useState(null);
  const [opacity, setOpacity] = useState(1.0);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!windowId) return;
    const w = await invoke('window-settings:get', { id: windowId });
    setWin(w || null);

    const op = await invoke('native-window:get-opacity', { id: windowId });
    if (op && typeof op.opacity === 'number') {
      setOpacity(op.opacity);
    } else {
      setOpacity(1.0);
    }
  }, [windowId]);

  useEffect(() => {
    reload();
    const a = api();
    const off = a?.on?.('window-settings:update', (data) => {
      if (data?.id === windowId) setWin(data);
    });
    const onKey = (e) => { if (e.key === 'Escape') window.close(); };
    window.addEventListener('keydown', onKey);
    return () => {
      off?.();
      window.removeEventListener('keydown', onKey);
    };
  }, [windowId, reload]);

  const hardReload = () => {
    try { window.location.reload(); }
    catch {
      try { window.location.href = window.location.href; } catch { /* ignore */ }
    }
  };

  const onOpenDevTools = () => fire('topbar:open-devtools', { id: windowId });

  const onOpacityChange = (v) => {
    setOpacity(v);
    setSaving(true);
    fire('window-settings:set-opacity', { id: windowId, opacity: v });
    setTimeout(() => setSaving(false), 300);
  };

  const onOpenOverlay = () => {
    fire('topbar:open-overlay', { id: windowId });
  };

  const close = () => window.close();

  const isOur = win?.kind === 'our';
  const isNative = win?.kind === 'native';
  const isOverlay = !!win?.isBridgeOverlay;
  const hasOverlay = !!win?.overlayWindowId;

  return (
    <Box sx={{
      position: 'fixed', inset: 0,
      bgcolor: 'rgba(20,20,26,0.97)',
      color: '#fff',
      display: 'flex', flexDirection: 'column',
      p: 2, boxSizing: 'border-box',
      borderRadius: 2,
      border: '1px solid rgba(168,85,247,0.35)',
      overflow: 'hidden',
    }}>
      {/* --- Header --- */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        {win?.icon && (
          <Box component="img" src={win.icon}
               sx={{ width: 20, height: 20, flexShrink: 0 }} />
        )}
        <Typography sx={{
          flex: 1, fontSize: 13, fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {win?.title || 'Окно'}
        </Typography>
        <Chip
          label={win?.kind || '?'}
          size="small"
          sx={{
            height: 18, fontSize: 10,
            bgcolor: isOverlay
              ? 'rgba(137,180,250,0.25)'
              : 'rgba(255,255,255,0.1)',
            color: '#fff',
          }}
        />
        <IconButton size="small" onClick={close}
                    sx={{ color: '#888', p: 0.5 }}>
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Stack>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 1.5 }} />

      {/* --- Info --- */}
      <Stack spacing={0.25} sx={{
        mb: 2, fontFamily: 'monospace', fontSize: 10, color: '#888',
        '& > div': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      }}>
        {win?.xid && <Box>XID: {win.xid}</Box>}
        {win?.pid && <Box>PID: {win.pid}</Box>}
        {win?.wmClass && <Box>WM_CLASS: {win.wmClass}</Box>}
        {win?.daemonWindowId && <Box>daemon: {win.daemonWindowId}</Box>}
        {win?.gtkXid && <Box>GTK XID: {win.gtkXid}</Box>}
        {win?.ownerId && <Box>owner: {win.ownerId}</Box>}
        {win?.overlayWindowId && <Box>overlay: {win.overlayWindowId}</Box>}
      </Stack>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 1.5 }} />

      {/* --- Прозрачность --- */}
      <Typography sx={{
        fontSize: 11, color: '#a855f7', mb: 0.75,
        textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        Прозрачность
      </Typography>
      <Box sx={{ px: 0.5, mb: 1.5 }}>
        <Slider
          size="small" min={0} max={1} step={0.05} value={opacity}
          onChange={(_, v) => onOpacityChange(v)}
          sx={{
            color: saving ? '#f9e2af' : '#a855f7',
            '& .MuiSlider-thumb': { width: 12, height: 12 },
            transition: 'color 200ms ease',
          }}
        />
        <Typography sx={{ fontSize: 10, color: '#888', textAlign: 'right' }}>
          {(opacity * 100).toFixed(0)}%
        </Typography>
      </Box>

      {/* --- Инструменты --- */}
      {(isOur || isOverlay || isNative) && (
        <>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 1.5 }} />
          <Typography sx={{
            fontSize: 11, color: '#a855f7', mb: 0.75,
            textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            Инструменты
          </Typography>

          {isOur && !isOverlay && (
            <Button
              size="small" variant="outlined" onClick={onOpenDevTools}
              startIcon={<BuildIcon sx={{ fontSize: 14 }} />}
              sx={{
                color: '#89b4fa', borderColor: 'rgba(137,180,250,0.4)',
                textTransform: 'none', fontSize: 11, mb: 0.75,
              }}
            >
              Открыть DevTools
            </Button>
          )}

          {isNative && (
            <Button
              size="small" variant="outlined"
              onClick={hasOverlay ? undefined : onOpenOverlay}
              disabled={hasOverlay}
              startIcon={<LayersIcon sx={{ fontSize: 14 }} />}
              sx={{
                color: hasOverlay ? '#6c7086' : '#a6e3a1',
                borderColor: hasOverlay
                  ? 'rgba(255,255,255,0.1)'
                  : 'rgba(166,227,161,0.4)',
                textTransform: 'none', fontSize: 11, mb: 0.75,
                '&.Mui-disabled': {
                  color: '#6c7086',
                  borderColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              {hasOverlay
                ? 'DOM-overlay открыт'
                : 'Открыть DOM-overlay'}
            </Button>
          )}

          {isNative && !hasOverlay && (
            <Typography sx={{
              fontSize: 9, color: '#666',
              mt: -0.25, mb: 0.75, px: 0.5, lineHeight: 1.3,
            }}>
              Приложение будет перезапущено с хуком через launch.sh
            </Typography>
          )}
        </>
      )}

      <Box sx={{ flex: 1 }} />

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 1.5 }} />

      <Button
        size="small" variant="outlined" onClick={hardReload}
        startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
        fullWidth
        sx={{
          color: '#888', borderColor: 'rgba(255,255,255,0.15)',
          textTransform: 'none', fontSize: 11,
          '&:hover': { color: '#fff', borderColor: 'rgba(255,255,255,0.3)' },
        }}
      >
        Перезагрузить окно настроек
      </Button>
    </Box>
  );
}