import React, { useCallback, useEffect, useRef } from 'react';
import { Box, Button, IconButton, Tooltip } from '@mui/material';

// Иконки
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import FilterNoneIcon from '@mui/icons-material/FilterNone';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CloseIcon from '@mui/icons-material/Close';

import ControlGrid from './ControlGrid';

const CELL = 20;
const GAP = 1;
const CROSS_W = CELL * 5 + GAP * 4;
const CROSS_H = CELL * 3 + GAP * 2;
const TOPBAR_H = 72;

const EMPTY = 'rgba(255,255,255,0.03)';
const HOVER = 'rgba(168,85,247,0.25)';

// Общий стиль для скрытия скроллбара, но сохранения скролла
const HIDDEN_SCROLLBAR = {
  '&::-webkit-scrollbar': { height: 0, width: 0 },
  '&::-webkit-scrollbar-thumb': { background: 'transparent' },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
};

/* ------------------------------------------------------------------ */
/* Ячейка крестовины                                                   */
/* ------------------------------------------------------------------ */

function CrossCell({ children, cursor, onClick, onMouseDown, title, disabled, col, row }) {
  const [hover, setHover] = React.useState(false);
  return (
    <Tooltip title={title || ''} enterDelay={400}>
      <div
        onMouseDown={disabled ? undefined : onMouseDown}
        onClick={disabled ? undefined : onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: CELL,
          height: CELL,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: hover && !disabled ? HOVER : EMPTY,
          cursor: disabled ? 'default' : (cursor || 'pointer'),
          borderRadius: 3,
          color: disabled ? 'rgba(255,255,255,0.25)' : '#fff',
          transition: 'background 0.1s',
          WebkitAppRegion: 'no-drag',
          userSelect: 'none',
          gridColumn: col,
          gridRow: row,
        }}
      >
        {children}
      </div>
    </Tooltip>
  );
}

/* ------------------------------------------------------------------ */
/* Хелпер: горизонтальный скролл колесом мыши                          */
/* ------------------------------------------------------------------ */

const handleWheelScroll = (e) => {
  if (e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
    e.currentTarget.scrollLeft += e.deltaY;
  }
};

/* ------------------------------------------------------------------ */
/* TopBar                                                              */
/* ------------------------------------------------------------------ */

export default function TopBar({
  desktops,
  activeDesktopId,
  onCreateDesktop,
  onSwitchDesktop,
  onDeleteDesktop,
  windows,
  focusedWindowId,
  apps,
  onFocusView,
  nativeWindows,
  activeNative,
  onNativeClick,
  menuButtonClick,
  mainWinMaximized,
  onMainWinMinimize,
  onMainWinMaximize,
  onMainWinClose,
  activeWindow,
  actions,
  onOpenDevTools,
  onRequestSearch,
}) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: TOPBAR_H,
        bgcolor: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 1200,
        overflow: 'hidden',
      }}
    >
      {/* Слой перетаскивания главного окна */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          WebkitAppRegion: 'drag',
          zIndex: 0,
        }}
      />

      {/* ЛЕВО: крестовина */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: CROSS_W + 8,
          minWidth: CROSS_W + 8,
          maxWidth: CROSS_W + 8,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          WebkitAppRegion: 'no-drag',
          flexShrink: 0,
        }}
      >
        <ControlGrid
          activeWindow={activeWindow}
          actions={actions}
          onOpenDevTools={onOpenDevTools}
        />
      </Box>

      {/* ПРАВО: две строки */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        {/* --- Строка 1: рабочие столы + системные кнопки --- */}
        <Box
          sx={{
            height: 32,
            display: 'flex',
            alignItems: 'center',
            px: 1,
            gap: 0.5,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          {/* Скролл-контейнер десктопов */}
          <Box
            onWheel={handleWheelScroll}
            sx={{
              flex: 1,
              display: 'flex',
              gap: 0.5,
              alignItems: 'center',
              overflowX: 'auto',
              overflowY: 'hidden',
              minWidth: 0,
              WebkitAppRegion: 'no-drag',
              ...HIDDEN_SCROLLBAR,
            }}
          >
            {desktops.map((d) => {
              const isActive = d.id === activeDesktopId;
              return (
                <Button
                  key={d.id}
                  size="small"
                  variant={isActive ? 'contained' : 'text'}
                  onClick={() => onSwitchDesktop(d.id)}
                  onContextMenu={(e) => { e.preventDefault(); onDeleteDesktop(d.id); }}
                  sx={{
                    flexShrink: 0,
                    minWidth: 50,
                    height: 24,
                    bgcolor: isActive ? '#50005099' : 'transparent',
                    color: isActive ? '#fff' : '#ccc',
                    textTransform: 'none',
                    borderRadius: 1,
                    fontSize: 11,
                    padding: '0 8px',
                    whiteSpace: 'nowrap',
                    '&:hover': { bgcolor: isActive ? '#50005099' : 'rgba(255,255,255,0.1)' },
                  }}
                >
                  🖥️ {d.index}
                </Button>
              );
            })}
            <IconButton
              size="small"
              onClick={onCreateDesktop}
              sx={{ color: '#ccc', width: 22, height: 22, flexShrink: 0 }}
              title="Добавить рабочий стол"
            >
              <AddIcon style={{ fontSize: 14 }} />
            </IconButton>
          </Box>

          {/* Системные кнопки главного окна DE — фиксированы справа */}
          <Box sx={{ display: 'flex', gap: 0.5, WebkitAppRegion: 'no-drag', flexShrink: 0 }}>
            <IconButton size="small" onClick={onMainWinMaximize} sx={{ color: '#fff', width: 22, height: 22 }}>
              {mainWinMaximized
                ? <FilterNoneIcon style={{ fontSize: 14 }} />
                : <CropSquareIcon style={{ fontSize: 14 }} />}
            </IconButton>
            <IconButton size="small" onClick={onMainWinMinimize} sx={{ color: '#fff', width: 22, height: 22 }}>
              <MinimizeIcon style={{ fontSize: 14 }} />
            </IconButton>
            <IconButton size="small" onClick={onMainWinClose} sx={{ color: '#fff', width: 22, height: 22 }}>
              <CloseIcon style={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        </Box>

        {/* --- Строка 2: таскбар --- */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            px: 1,
            gap: 0.5,
            minHeight: 0,
            minWidth: 0,
            overflow: 'hidden',
            WebkitAppRegion: 'no-drag',
          }}
        >
          {/* Меню — фиксировано слева */}
          <Button
            variant="contained"
            size="small"
            startIcon={<MenuIcon style={{ fontSize: 14 }} />}
            onClick={menuButtonClick}
            sx={{
              bgcolor: '#6f42c1',
              '&:hover': { bgcolor: '#5a32a3' },
              flexShrink: 0,
              textTransform: 'none',
              fontSize: 11,
              height: 26,
              minWidth: 0,
              px: 1,
            }}
          >
            Меню
          </Button>

          {/* Скролл-контейнер окон */}
          <Box
            onWheel={handleWheelScroll}
            sx={{
              flex: 1,
              display: 'flex',
              gap: 0.5,
              alignItems: 'center',
              overflowX: 'auto',
              overflowY: 'hidden',
              minWidth: 0,
              ...HIDDEN_SCROLLBAR,
            }}
          >
            {Object.values(windows || {})
              .filter((w) => w && typeof w === 'object')
              .map((win) => {
                const app = apps.find((a) => a.id === win.appId);
                const isActive = win.id === focusedWindowId;
                const title = win.title || app?.title || (win.kind === 'devtools' ? 'Консоль' : 'Окно');
                return (
                  <Button
                    key={win.id}
                    size="small"
                    variant="contained"
                    onClick={() => onFocusView(win)}
                    sx={{
                      border: isActive ? '1px solid #fff' : '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      height: 24,
                      minWidth: 0,
                      fontSize: 11,
                      px: 1,
                      bgcolor: isActive ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.05)',
                      '&:hover': { border: '1px solid #a855f7' },
                    }}
                  >
                    {title}
                  </Button>
                );
              })}

            {nativeWindows.map((nw) => {
              const isActive = activeNative?.id === nw.id;
              return (
                <Tooltip key={nw.id} title={`${nw.wmClass} — ${nw.title}`}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => onNativeClick(nw)}
                    sx={{
                      border: isActive ? '1px solid #fff' : '1px dashed rgba(255,255,255,0.2)',
                      color: '#ddd',
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      height: 24,
                      minWidth: 0,
                      fontSize: 11,
                      px: 1,
                      maxWidth: 180,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      bgcolor: isActive ? 'rgba(255,200,100,0.3)' : 'rgba(255,255,255,0.05)',
                      '&:hover': { border: '1px solid #a855f7' },
                    }}
                  >
                    🖥️ {nw.title || nw.wmClass || 'Окно'}
                  </Button>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}