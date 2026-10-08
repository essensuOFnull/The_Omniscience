import React from 'react';
import { Box, Button, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';

import ControlGrid from './ControlGrid';
import Clock from './topbar/Clock';
import WindowList from './topbar/WindowList';

const CELL = 20, GAP = 1;
const CROSS_W = CELL * 5 + GAP * 4;
const ROW1_H = 32;

export default function TopBar({
  windows = [],
  activeWindow,
  showWindowList = true,
  showClock = true,
  showClockMs = false,
  onToggleOverview,
  onOpenDevTools,
  onFocusWindow,
  onCloseWindow,
  onRequestSearch,
  onRequestSettings,
}) {
  return (
    <Box sx={{
      width: '100%', height: '100%',
      bgcolor: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      alignItems: 'stretch',
      overflow: 'hidden',
    }}>
      {/* ── Крестовина (слева, на всю высоту) ── */}
      <Box sx={{
        width: CROSS_W + 12, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}>
        <ControlGrid
          activeWindow={activeWindow}
          onOpenDevTools={() => onOpenDevTools?.(activeWindow?.id)}
        />
      </Box>

      {/* ── Правая часть — две строки ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* СТРОКА 1: часы и системные кнопки — всё справа */}
        <Box sx={{
          height: ROW1_H,
          display: 'flex', alignItems: 'center',
          px: 1, gap: 0.5,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          minWidth: 0, overflow: 'hidden',
        }}>
          <Box sx={{ flex: 1, minWidth: 0 }} />
          {showClock && <Clock showMs={showClockMs} />}
          <IconButton size="small" onClick={onRequestSearch}
            sx={{ color: '#fff', WebkitAppRegion: 'no-drag', width: 24, height: 24 }}>
            <SearchIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <IconButton size="small" onClick={onRequestSettings}
            sx={{ color: '#fff', WebkitAppRegion: 'no-drag', width: 24, height: 24 }}>
            <SettingsIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>

        {/* СТРОКА 2: меню + окна */}
        <Box sx={{
          flex: 1, display: 'flex', alignItems: 'center',
          px: 1, gap: 0.5,
          minHeight: 0, minWidth: 0, overflow: 'hidden',
        }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<MenuIcon sx={{ fontSize: 14 }} />}
            onClick={onToggleOverview}
            sx={{
              bgcolor: '#6f42c1',
              '&:hover': { bgcolor: '#5a32a3' },
              flexShrink: 0,
              textTransform: 'none',
              fontSize: 11,
              height: 26,
              minWidth: 0,
              px: 1,
              WebkitAppRegion: 'no-drag',
            }}
          >
            Меню
          </Button>

          {showWindowList && (
            <WindowList windows={windows} onFocus={onFocusWindow} onClose={onCloseWindow} />
          )}
        </Box>
      </Box>
    </Box>
  );
}