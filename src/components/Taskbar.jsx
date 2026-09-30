import React from 'react';
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
  onTogglePanel,
}) {
  const { windows, focusedWindowId } = state;
  const windowsArray = Object.values(windows || {}).filter((w) => w && typeof w === 'object');
  const taskbarHeight = config?.taskbarHeight || 40;

  const handleFocus = (win) => {
    if (win.minimized) {
      actions.unminimizeWindow(desktopId, win.id);
    }
    actions.focusWindow(desktopId, win.id);
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
        sx={{
          minHeight: taskbarHeight,
          px: 1,
          gap: 1,
          overflow: 'hidden',
        }}
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

        {/* Показать/скрыть панель */}
        <Tooltip title={panelVisible ? 'Скрыть панель управления' : 'Показать панель управления'}>
          <IconButton
            size="small"
            onClick={onTogglePanel}
            sx={{
              flexShrink: 0,
              color: panelVisible ? '#a855f7' : '#888',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 1,
            }}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Список окон */}
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
                      ? <img src={icon} width="16" height="16" alt="icon" />
                      : <span>📦</span>)
                }
                onClick={() => handleFocus(win)}
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
        </Box>
      </Toolbar>
    </AppBar>
  );
}