import React from 'react';
import { Box, Button, Tooltip } from '@mui/material';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';

export default function WindowList({ windows = [], onFocus, onClose }) {
  return (
    <Box
      onWheel={(e) => { e.currentTarget.scrollLeft += e.deltaY; }}
      sx={{
        display: 'flex',
        gap: 0.5,
        overflowX: 'auto',
        overflowY: 'hidden',
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        '&::-webkit-scrollbar': { height: 0, width: 0 },
      }}
    >
      {windows.map((w) => (
        <Tooltip key={w.id} title={w.title || w.appId || 'Окно'}>
          <Button
            size="small"
            onClick={() => onFocus?.(w)}
            onAuxClick={(e) => { if (e.button === 1) onClose?.(w); }}
            sx={{
              border: w.focused ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              textTransform: 'none',
              height: 24,
              minWidth: 0,
              maxWidth: 200,
              fontSize: 11,
              padding: '0 8px',
              flexShrink: 0,
              bgcolor: w.focused ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.05)',
              WebkitAppRegion: 'no-drag',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
              {w.icon
                ? <img src={w.icon} width={14} height={14} alt="" draggable={false} />
                : <DesktopWindowsIcon sx={{ fontSize: 14 }} />}
              <Box sx={{
                flex: 1, minWidth: 0, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {w.title || w.appId || 'Окно'}
              </Box>
            </Box>
          </Button>
        </Tooltip>
      ))}
    </Box>
  );
}