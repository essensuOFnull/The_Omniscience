import React from 'react';
import { Box, Button, Tooltip } from '@mui/material';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';

const BORDER_COLOR_ACTIVE = '#a855f7';
const BORDER_COLOR_NORMAL = '#ffffff';
const BORDER_COLOR_MINIMIZED = 'rgba(255,255,255,0.55)';

const BORDER_STYLE_NORMAL = '1px solid';
const BORDER_STYLE_MINIMIZED = '1px dashed';

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
      {windows.map((w) => {
        const isActive = !!w.focused;
        const isMinimized = !!w.minimized;

        const border = `${isMinimized ? BORDER_STYLE_MINIMIZED : BORDER_STYLE_NORMAL} ${isActive ? BORDER_COLOR_ACTIVE : isMinimized ? BORDER_COLOR_MINIMIZED : BORDER_COLOR_NORMAL}`;

        return (
          <Tooltip
            key={w.id}
            title={w.title || w.kind || 'Окно'}
            // 1. Всегда позиционировать сверху
            placement="top"
            // 2. Отключаем автоматический сдвиг (flip) при прокрутке или нехватке места
            slotProps={{
              popper: {
                modifiers: [
                  {
                    name: 'flip',
                    enabled: false,
                  },
                  {
                    name: 'preventOverflow',
                    options: {
                      boundary: 'clippingParents',
                    },
                  },
                ],
              },
              // 3. Отключаем перенос строки для текста внутри тултипа
              tooltip: {
                sx: {
                  whiteSpace: 'nowrap',
                  maxWidth: 'none', // Сбрасываем стандартное ограничение по ширине в MUI
                },
              },
            }}
          >
            <Button
              size="small"
              onClick={() => onFocus?.(w)}
              onAuxClick={(e) => { if (e.button === 1) onClose?.(w); }}
              sx={{
                border,
                color: isActive ? '#fff' : '#ddd',
                textTransform: 'none',
                height: 24,
                minWidth: 0,
                maxWidth: 200,
                fontSize: 11,
                padding: '0 8px',
                flexShrink: 0,
                bgcolor: isActive
                  ? 'rgba(168,85,247,0.35)'
                  : 'rgba(255,255,255,0.05)',
                '&:hover': {
                  bgcolor: isActive
                    ? 'rgba(168,85,247,0.5)'
                    : 'rgba(255,255,255,0.1)',
                },
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
                  {w.title || w.kind || 'Окно'}
                </Box>
              </Box>
            </Button>
          </Tooltip>
        );
      })}
    </Box>
  );
}