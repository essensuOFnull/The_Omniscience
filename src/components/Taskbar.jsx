import React, { useCallback, useEffect, useRef } from 'react';
import { AppBar, Toolbar, Button, IconButton, Box, Tooltip } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';

export default function Taskbar({
  state,
  actions,
  apps,
  config,
  menuButtonClick,
  desktopId,
  panelVisible,
  nativeWindows = [],
  activeNative,
  onNativeClick,
}) {
  const { windows, focusedWindowId } = state;
  const windowsArray = Object.values(windows || {}).filter((w) => w && typeof w === 'object');
  const taskbarHeight = config?.taskbarHeight || 40;

  const handleFocusView = (win) => {
    if (win.minimized) {
      actions.unminimizeWindow(desktopId, win.id);
    }
    actions.focusWindow(desktopId, win.id);
  };

  const handleFocusNative = (nw) => {
    if (onNativeClick) onNativeClick(nw);
  };

  return (
    <AppBar
      position="static"
      sx={{
        height: taskbarHeight,
        bgcolor: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        boxShadow: 'none',
        top: 'auto',
        bottom: 0,
      }}
    >
      <Toolbar
        variant="dense"
        sx={{ minHeight: taskbarHeight, px: 1, gap: 1, overflow: 'hidden' }}
      >
        {/* Меню */}
        <Button
          variant="contained"
          size="small"
          startIcon={<MenuIcon />}
          onClick={menuButtonClick}
          sx={{
            bgcolor: '#6f42c1',
            '&:hover': { bgcolor: '#5a32a3' },
            flexShrink: 0,
            textTransform: 'none',
          }}
        >
          Меню
        </Button>

        {/* Список окон: сначала наши, потом нативные */}
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            overflowX: 'auto',
            flex: 1,
            py: 0.5,
            '&::-webkit-scrollbar': { height: 3 },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#6f42c1', borderRadius: 1 },
          }}
        >
          {/* Наши view-окна */}
          {windowsArray.map((win) => {
            const app = apps.find((a) => a.id === win.appId);
            const icon = app?.icon;
            const title = win.title || app?.title || (win.kind === 'devtools' ? 'Консоль' : 'Окно');
            const isActive = win.id === focusedWindowId;

            return (
              <Button
                key={win.id}
                data-window-id={win.id}
                size="small"
                variant="contained"
                startIcon={
                  win.kind === 'devtools'
                    ? <span style={{ fontSize: 14 }}>⌨</span>
                    : (icon
                      ? <img src={icon} width="16" height="16" alt="" />
                      : <span>📦</span>)
                }
                onClick={() => handleFocusView(win)}
                sx={{
                  border: isActive ? '1px solid #fff' : '1px solid #000',
                  color: '#fff',
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  bgcolor: isActive ? 'rgba(168,85,247,0.5)' : undefined,
                  '&:hover': { border: '1px dashed #fff' },
                }}
              >
                {title}
              </Button>
            );
          })}

          {/* Нативные окна */}
          {nativeWindows.map((nw) => {
            const isActive = activeNative?.id === nw.id;
            return (
              <Tooltip key={nw.id} title={`${nw.wmClass} — ${nw.title}`}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<span style={{ fontSize: 14 }}>🖥️</span>}
                  onClick={() => handleFocusNative(nw)}
                  sx={{
                    border: isActive ? '1px solid #fff' : '1px dashed rgba(255,255,255,0.2)',
                    color: '#ddd',
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    bgcolor: isActive ? 'rgba(255,200,100,0.3)' : 'rgba(255,255,255,0.05)',
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    '&:hover': { border: '1px dashed #a855f7' },
                  }}
                >
                  {nw.title || nw.wmClass || 'Окно'}
                </Button>
              </Tooltip>
            );
          })}
        </Box>
      </Toolbar>
    </AppBar>
  );
}