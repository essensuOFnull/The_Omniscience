import React from 'react';
import { Box, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';

import ControlGrid from './ControlGrid';
import Clock from './topbar/Clock';
import QuickLaunch from './topbar/QuickLaunch';
import WindowList from './topbar/WindowList';

const CROSS_W = 20 * 5 + 4;

export default function TopBar({
  quickLaunch = [],
  windows = [],
  showWindowList = true,
  showClock = true,
  showClockMs = false,
  activeNative,
  onToggleOverview,
  onOpenDevTools,
  onLaunch,
  onAddQuickLaunch,
  onFocusWindow,
  onCloseWindow,
  onRequestSearch,
  onRequestSettings,
}) {
  // ControlGrid умеет работать с нативным окном через wmctrl
  // и с нашим BrowserWindow через systemId (XID). Передаём activeNative если есть,
  // иначе — первый focused из нашего списка (пока так, потом доработаем приоритет).
  const activeWindow = activeNative || windows.find((w) => w.focused) || null;

  return (
    <Box sx={{
      width: '100%', height: '100%',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'stretch',
      overflow: 'hidden',
      WebkitAppRegion: 'drag',
    }}>
      {/* Крестовина */}
      <Box sx={{
        width: CROSS_W + 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}>
        <ControlGrid
          activeWindow={activeWindow}
          onOpenDevTools={() => onOpenDevTools?.(activeWindow?.id)}
        />
      </Box>

      {/* Центр */}
      <Box sx={{
        flex: 1, minWidth: 0,
        display: 'flex', alignItems: 'center',
        px: 1, gap: 1,
      }}>
        <IconButton size="small" onClick={onToggleOverview}
          sx={{ color: '#fff', WebkitAppRegion: 'no-drag', width: 28, height: 28 }}>
          <MenuIcon fontSize="small" />
        </IconButton>

        <QuickLaunch apps={quickLaunch} onLaunch={onLaunch} onAdd={onAddQuickLaunch} />

        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          {showClock && <Clock showMs={showClockMs} />}
        </Box>

        {showWindowList && (
          <WindowList windows={windows} onFocus={onFocusWindow} onClose={onCloseWindow} />
        )}

        <IconButton size="small" onClick={onRequestSearch}
          sx={{ color: '#fff', WebkitAppRegion: 'no-drag', width: 28, height: 28 }}>
          <SearchIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onRequestSettings}
          sx={{ color: '#fff', WebkitAppRegion: 'no-drag', width: 28, height: 28 }}>
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}