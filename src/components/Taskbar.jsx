import React from 'react';
import { AppBar, Toolbar, Button, IconButton, Box, Tooltip } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import TerminalIcon from '@mui/icons-material/Terminal';
import CloseIcon from '@mui/icons-material/Close';

export default function Taskbar({ state, actions, apps, config, menuButtonClick, desktopId }) {
  const { windows } = state;
  const windowsArray = Object.values(windows || {}).filter((w) => w && typeof w === 'object');
  const taskbarHeight = config?.taskbarHeight || 40;

  const maxZ = Math.max(0, ...windowsArray.map((w) => w.z || 0));

  // Только главные окна (не панели, не DevTools)
  const mainWindows = windowsArray.filter((w) => w.kind !== 'devtools');

  // Для каждого главного окна — найти его DevTools
  const devtoolsFor = (windowId) =>
    windowsArray.find((w) => w.kind === 'devtools' && w.targetWindowId === windowId && !w.closing);

  const handleTaskbarClick = (win, e) => {
    if (win.minimized) {
      actions.unminimizeWindow(desktopId, win.id);
    } else {
      const isActive = !win.minimized && win.z === maxZ;
      if (isActive) {
        const rect = e.target.getBoundingClientRect();
        actions.minimizeWindow(
          desktopId, win.id,
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        );
      } else {
        actions.focusWindow(desktopId, win.id);
      }
    }
  };

  const handleConsoleClick = (win) => {
    const devtools = devtoolsFor(win.id);

    if (devtools) {
      // Уже открыт — свернуть / развернуть / сфокусировать
      if (devtools.minimized) {
        actions.unminimizeWindow(desktopId, devtools.id);
      } else if (devtools.z === maxZ) {
        actions.minimizeWindow(desktopId, devtools.id);
      } else {
        actions.focusWindow(desktopId, devtools.id);
      }
    } else {
      // Нет — открыть
      actions.createDevToolsWindow(desktopId, win.id);
    }
  };

  const handleConsoleClose = (win) => {
    const devtools = devtoolsFor(win.id);
    if (devtools && !devtools.closing) {
      actions.closeWindow(desktopId, devtools.id);
    }
  };

  const handlePanelClick = (win) => {
    // Toggle panel visibility — предполагает win.panelHidden в state
    actions.togglePanel(desktopId, win.id);
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

        <Box
          sx={{
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            flex: 1,
            py: 0.5,
            '&::-webkit-scrollbar': { height: 3 },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#6f42c1', borderRadius: 1 },
          }}
        >
          {mainWindows.map((win) => {
            const app = apps.find((a) => a.id === win.appId);
            const icon = app?.icon;
            const title = win.title || app?.title || 'Окно';
            const isActive = !win.minimized && win.z === maxZ;

            const devtools = devtoolsFor(win.id);
            const hasDevtools = !!devtools;
            const devtoolsActive = devtools && !devtools.minimized && devtools.z === maxZ;
            const panelHidden = !!win.panelHidden;

            return (
              <Box
                key={win.id}
                sx={{
                  display: 'flex',
                  alignItems: 'stretch',
                  flexShrink: 0,
                  border: isActive ? '1px solid #fff' : '1px solid #000',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                {/* 1. Главное окно */}
                <Button
                  data-window-id={win.id}
                  size="small"
                  variant="contained"
                  startIcon={
                    icon ? (
                      <img src={icon} width="16" height="16" alt="icon" />
                    ) : (
                      <span>📦</span>
                    )
                  }
                  onClick={(e) => handleTaskbarClick(win, e)}
                  sx={{
                    color: '#fff',
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    borderRadius: 0,
                    minWidth: 0,
                    '&:hover': { bgcolor: 'rgba(111,66,193,0.6)' },
                  }}
                >
                  {title}
                </Button>

                {/* 2. Панель управления окна */}
                <Tooltip title={panelHidden ? 'Показать панель' : 'Скрыть панель'}>
                  <IconButton
                    size="small"
                    onClick={() => handlePanelClick(win)}
                    sx={{
                      color: panelHidden ? '#888' : '#fff',
                      borderRadius: 0,
                      borderLeft: '1px solid rgba(255,255,255,0.15)',
                      '&:hover': { bgcolor: 'rgba(111,66,193,0.4)' },
                    }}
                  >
                    <SettingsIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                {/* 3. Консоль (DevTools) */}
                <Tooltip title={hasDevtools ? 'Консоль открыта (клик — свернуть, ПКМ — закрыть)' : 'Открыть консоль'}>
                  <IconButton
                    size="small"
                    onClick={() => handleConsoleClick(win)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleConsoleClose(win);
                    }}
                    sx={{
                      color: devtoolsActive ? '#a855f7' : (hasDevtools ? '#fff' : '#888'),
                      borderRadius: 0,
                      borderLeft: '1px solid rgba(255,255,255,0.15)',
                      '&:hover': { bgcolor: 'rgba(111,66,193,0.4)' },
                    }}
                  >
                    <TerminalIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                {/* Кнопка закрытия консоли, если она открыта */}
                {hasDevtools && (
                  <Tooltip title="Закрыть консоль">
                    <IconButton
                      size="small"
                      onClick={() => handleConsoleClose(win)}
                      sx={{
                        color: '#888',
                        borderRadius: 0,
                        borderLeft: '1px solid rgba(255,255,255,0.15)',
                        '&:hover': { bgcolor: 'rgba(200,0,0,0.4)', color: '#fff' },
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            );
          })}
        </Box>
      </Toolbar>
    </AppBar>
  );
}