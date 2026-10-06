import React from 'react';
import { Box, Button, IconButton } from '@mui/material';
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';

// Иконки
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import FilterNoneIcon from '@mui/icons-material/FilterNone';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import TerminalIcon from '@mui/icons-material/Terminal';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import ExtensionIcon from '@mui/icons-material/Extension';

import ControlGrid from './ControlGrid';

/* ------------------------------------------------------------------ */
/* Тултип без ограничения ширины                                       */
/* ------------------------------------------------------------------ */

const NoMaxWidthTooltip = styled(({ className, ...props }) => (
  <Tooltip describeChild {...props} classes={{ popper: className }} />
))({
  [`& .${tooltipClasses.tooltip}`]: {
    maxWidth: 'none',
  },
});

/* ------------------------------------------------------------------ */
/* Константы                                                           */
/* ------------------------------------------------------------------ */

const CELL = 20;
const GAP = 1;
const CROSS_W = CELL * 5 + GAP * 4;
const CROSS_H = CELL * 3 + GAP * 2;
const TOPBAR_H = 72;

const HIDDEN_SCROLLBAR = {
  '&::-webkit-scrollbar': { height: 0, width: 0 },
  '&::-webkit-scrollbar-thumb': { background: 'transparent' },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
};

const BORDER_ACTIVE = '2px solid #a855f7';
const BORDER_NORMAL = '1px solid #ffffff';
const BORDER_MINIMIZED = '1px dashed rgba(255,255,255,0.55)';

/* ------------------------------------------------------------------ */
/* Хелпер: горизонтальный скролл колесом мыши                          */
/* ------------------------------------------------------------------ */

const handleWheelScroll = (e) => {
  if (e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
    e.currentTarget.scrollLeft += e.deltaY;
  }
};

/* ------------------------------------------------------------------ */
/* Иконка нативного окна              */
/* ------------------------------------------------------------------ */

function resolveNativeIcon(nw, apps) {
  // main теперь присылает готовую data-URI иконку в nw.icon
  if (nw?.icon) return nw.icon;

  // fallback — если main не нашёл иконку в системных темах
  if (!nw?.wmClass) return null;
  const parts = String(nw.wmClass).toLowerCase().split('.').filter(Boolean);
  for (const part of parts) {
    const app = apps.find((a) => String(a.id).toLowerCase() === part);
    if (app?.icon) return app.icon;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* WindowTab — единый вид карточки окна                                */
/* ------------------------------------------------------------------ */

function WindowTab({ icon, fallbackIcon, title, tooltipTitle, isActive, isMinimized, onClick }) {
  const border = isActive
    ? BORDER_ACTIVE
    : isMinimized
      ? BORDER_MINIMIZED
      : BORDER_NORMAL;

  const iconNode = icon
    ? <img
      src={icon}
      width="16"
      height="16"
      alt=""
      style={{ display: 'block', objectFit: 'contain' }}
      draggable={false}
    />
    : fallbackIcon;

  return (
    <NoMaxWidthTooltip
      describeChild
      title={tooltipTitle || title}
      placement="top"
      slotProps={{ popper: { modifiers: [{ name: 'flip', enabled: false }] } }}
    >
      <Button
        size="small"
        variant="contained"
        onClick={onClick}
        sx={{
          border,
          color: isActive ? '#fff' : '#ddd',
          textTransform: 'none',
          flexShrink: 0,
          height: 24,
          minWidth: 0,
          maxWidth: 200,
          fontSize: 11,
          padding: '0 8px',
          bgcolor: isActive ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.05)',
          '&:hover': {
            bgcolor: isActive ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.1)',
          },
          WebkitAppRegion: 'no-drag',
          justifyContent: 'flex-start',
          textAlign: 'left',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minWidth: 0,
            width: '100%',
          }}
        >
          <Box
            component="span"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              width: 16,
              height: 16,
              color: '#ccc',
            }}
          >
            {iconNode}
          </Box>
          <Box
            component="span"
            sx={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'left',
            }}
          >
            {title}
          </Box>
        </Box>
      </Button>
    </NoMaxWidthTooltip>
  );
}

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
  onRequestSettings,
}) {
  const webWindows = Object.values(windows || {}).filter((w) => w && typeof w === 'object');
  const nativelyFiltered = (nativeWindows || []).filter(Boolean);

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
        WebkitAppRegion: 'drag',
      }}
    >
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
                    WebkitAppRegion: 'no-drag',
                  }}
                >
                  🖥️ {d.index}
                </Button>
              );
            })}
            <IconButton
              size="small"
              onClick={onCreateDesktop}
              sx={{ color: '#ccc', width: 22, height: 22, flexShrink: 0, WebkitAppRegion: 'no-drag' }}
              title="Добавить рабочий стол"
            >
              <AddIcon style={{ fontSize: 14 }} />
            </IconButton>
          </Box>

          {/* Системные кнопки главного окна DE */}
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            <IconButton
              size="small"
              onClick={onRequestSettings}
              sx={{ color: '#fff', width: 22, height: 22, WebkitAppRegion: 'no-drag' }}
            >
              <SettingsIcon style={{ fontSize: 14 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={onRequestSearch}
              sx={{ color: '#fff', width: 22, height: 22, WebkitAppRegion: 'no-drag' }}
            >
              <SearchIcon style={{ fontSize: 14 }} />
            </IconButton>
            <IconButton size="small" onClick={onMainWinMaximize} sx={{ color: '#fff', width: 22, height: 22, WebkitAppRegion: 'no-drag' }}>
              {mainWinMaximized
                ? <FilterNoneIcon style={{ fontSize: 14 }} />
                : <CropSquareIcon style={{ fontSize: 14 }} />}
            </IconButton>
            <IconButton size="small" onClick={onMainWinMinimize} sx={{ color: '#fff', width: 22, height: 22, WebkitAppRegion: 'no-drag' }}>
              <MinimizeIcon style={{ fontSize: 14 }} />
            </IconButton>
            <IconButton size="small" onClick={onMainWinClose} sx={{ color: '#fff', width: 22, height: 22, WebkitAppRegion: 'no-drag' }}>
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
              WebkitAppRegion: 'no-drag',
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
            {/* Веб-окна Omniscience */}
            {webWindows.map((win) => {
              const app = win.appId ? apps.find((a) => a.id === win.appId) : null;
              const isDevTools = win.kind === 'devtools';
              const isActive = win.id === focusedWindowId;

              const title = win.title || app?.title || (isDevTools ? 'Консоль' : 'Окно');
              const icon = app?.icon || null;
              const fallbackIcon = isDevTools
                ? <TerminalIcon style={{ fontSize: 16 }} />
                : <ExtensionIcon style={{ fontSize: 16 }} />;

              return (
                <WindowTab
                  key={win.id}
                  icon={icon}
                  fallbackIcon={fallbackIcon}
                  title={title}
                  tooltipTitle={title}
                  isActive={isActive}
                  isMinimized={!!win.minimized}
                  onClick={() => onFocusView(win)}
                />
              );
            })}

            {/* Вертикальный разделитель */}
            {webWindows.length > 0 && nativelyFiltered.length > 0 && (
              <Box
                sx={{
                  width: '2px',
                  alignSelf: 'stretch',
                  bgcolor: 'rgba(255,255,255,0.35)',
                  flexShrink: 0,
                  my: 0.5,
                  borderRadius: '1px',
                }}
              />
            )}

            {/* Нативные окна Linux */}
            {nativelyFiltered.map((nw) => {
              const isActive = activeNative?.id === nw.id;
              const icon = resolveNativeIcon(nw, apps);
              const title = nw.title || nw.wmClass || 'Окно';

              return (
                <WindowTab
                  key={nw.id}
                  icon={icon}
                  fallbackIcon={<DesktopWindowsIcon style={{ fontSize: 16 }} />}
                  title={title}
                  tooltipTitle={`${nw.wmClass || ''}${nw.title ? ' — ' + nw.title : ''}`}
                  isActive={isActive && !nw.isMinimized}
                  isMinimized={!!nw.isMinimized}
                  onClick={() => onNativeClick(nw)}
                />
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}