import React, { useCallback, useRef, useState } from 'react';

import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import SearchIcon from '@mui/icons-material/Search';
import BuildIcon from '@mui/icons-material/Build';
import NorthWestIcon from '@mui/icons-material/NorthWest';
import NorthIcon from '@mui/icons-material/North';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import WestIcon from '@mui/icons-material/West';
import EastIcon from '@mui/icons-material/East';
import SouthWestIcon from '@mui/icons-material/SouthWest';
import SouthIcon from '@mui/icons-material/South';
import SouthEastIcon from '@mui/icons-material/SouthEast';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import FilterNoneIcon from '@mui/icons-material/FilterNone';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CloseIcon from '@mui/icons-material/Close';

const CELL = 20;
const GAP = 1;
const MIN_W = 120;
const MIN_H = 80;

const CURSORS = {
  nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize',
  w: 'ew-resize', e: 'ew-resize',
  sw: 'nesw-resize', s: 'ns-resize', se: 'nwse-resize',
};

const EMPTY = 'rgba(255,255,255,0.03)';
const HOVER = 'rgba(168,85,247,0.25)';

function api() {
  return window.electron_topbar_API || window.electron_desktop_API || null;
}

function callNative(channel, payload) {
  const a = api();
  if (!a) return Promise.resolve({ ok: false });
  if (typeof a.invoke === 'function') {
    return a.invoke(channel, payload).catch(() => ({ ok: false }));
  }
  if (typeof a.send === 'function') { a.send(channel, payload); return Promise.resolve({ ok: true }); }
  return Promise.resolve({ ok: false });
}

function fireNative(channel, payload) {
  const a = api();
  a?.send?.(channel, payload);
}

function Cell({ children, cursor, onClick, onMouseDown, title, disabled, col, row }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseDown={disabled ? undefined : onMouseDown}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: CELL, height: CELL,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover && !disabled ? HOVER : EMPTY,
        cursor: disabled ? 'default' : (cursor || 'pointer'),
        borderRadius: 3,
        color: disabled ? 'rgba(255,255,255,0.25)' : '#fff',
        transition: 'background 0.1s',
        WebkitAppRegion: 'no-drag',
        userSelect: 'none',
        gridColumn: col, gridRow: row,
      }}
      title={title}
    >
      {children}
    </div>
  );
}

export default function ControlGrid({ activeWindow, onOpenDevTools }) {
  const iconSize = 14;
  const awRef = useRef(activeWindow);
  awRef.current = activeWindow;

  const dragRef = useRef(null);

  const hasWin = !!activeWindow;
  const isMaximized = !!activeWindow?.maximized;
  const canResize = hasWin && !isMaximized;

  const beginDrag = useCallback((mode, direction) => (e) => {
    const aw = awRef.current;
    if (!aw || aw.maximized || !aw.id) return;
    e.preventDefault();
    e.stopPropagation();

    // Сессия drag. Готовность (ready) и sync — чтобы корректно пережить
    // асинхронный IPC и WarpPointer на стороне main.
    const session = {
      id: aw.id,
      mode,
      direction,
      ready: false,
      synced: false,
      startX: e.screenX,
      startY: e.screenY,
      startBounds: {
        x: aw.x ?? 0,
        y: aw.y ?? 0,
        width: aw.width ?? 800,
        height: aw.height ?? 600,
      },
    };
    dragRef.current = session;

    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d || !d.ready) return;

      if (!d.synced) {
        // Первое движение после WarpPointer — только синхронизация.
        d.startX = ev.screenX;
        d.startY = ev.screenY;
        d.synced = true;
        return;
      }

      const dx = ev.screenX - d.startX;
      const dy = ev.screenY - d.startY;
      const b = d.startBounds;

      const next = { x: b.x, y: b.y, width: b.width, height: b.height };

      if (d.mode === 'move') {
        next.x = b.x + dx;
        next.y = b.y + dy;
      } else {
        const dir = d.direction || '';
        if (dir.includes('n')) {
          next.y = b.y + dy;
          next.height = Math.max(MIN_H, b.height - dy);
        }
        if (dir.includes('s')) {
          next.height = Math.max(MIN_H, b.height + dy);
        }
        if (dir.includes('w')) {
          next.x = b.x + dx;
          next.width = Math.max(MIN_W, b.width - dx);
        }
        if (dir.includes('e')) {
          next.width = Math.max(MIN_W, b.width + dx);
        }
      }

      fireNative('native-window:set-bounds', { id: d.id, bounds: next });
    };

    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      fireNative('native-window:drag-end', {});
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);

    // Запрашиваем main: получить bounds + варпнуть курсор в целевую точку
    callNative('native-window:prepare-drag', {
      id: aw.id,
      mode,
      direction: direction || null,
    }).then((res) => {
      const d = dragRef.current;
      if (!d || d !== session) return;   // сессия уже завершена (быстрый клик)
      if (!res || !res.ok) {
        // main не смог — откатываемся на обычный flow
        d.ready = true;
        d.synced = true;
        return;
      }
      if (res.bounds) d.startBounds = res.bounds;
      if (res.cursor) {
        d.startX = res.cursor.x;
        d.startY = res.cursor.y;
        d.synced = false;    // первый mousemove синхронизирует
      } else {
        d.startX = e.screenX;
        d.startY = e.screenY;
        d.synced = true;
      }
      d.ready = true;
    });
  }, []);

  const closeWin = useCallback(() => {
    const aw = awRef.current;
    if (aw?.id) callNative('native-window:close', { id: aw.id });
  }, []);

  const minimizeWin = useCallback(() => {
    const aw = awRef.current;
    if (aw?.id) callNative('native-window:minimize', { id: aw.id });
  }, []);

  const maximizeWin = useCallback(() => {
    const aw = awRef.current;
    if (aw?.id) callNative('native-window:maximize', {
      id: aw.id,
      maximized: !!aw.maximized,
    });
  }, []);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(5, ${CELL}px)`,
      gridTemplateRows: `repeat(3, ${CELL}px)`,
      gap: GAP,
    }}>
      <Cell col={1} row={1} title={activeWindow?.title || 'Нет активного окна'} disabled={!hasWin}>
        {activeWindow?.icon
          ? <img src={activeWindow.icon} width={iconSize} height={iconSize} alt="" draggable={false} />
          : <DesktopWindowsIcon style={{ fontSize: iconSize }} />}
      </Cell>

      <Cell col={1} row={2} title="Поиск" disabled={!hasWin} onClick={() => {}}>
        <SearchIcon style={{ fontSize: iconSize }} />
      </Cell>

      <Cell col={1} row={3} title="Открыть DevTools"
        disabled={!hasWin} onClick={() => onOpenDevTools?.(activeWindow?.id)}>
        <BuildIcon style={{ fontSize: iconSize }} />
      </Cell>

      <Cell col={2} row={1} cursor={CURSORS.nw} disabled={!canResize}
        onMouseDown={beginDrag('resize', 'nw')} title="↖">
        <NorthWestIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell col={2} row={2} cursor={CURSORS.w} disabled={!canResize}
        onMouseDown={beginDrag('resize', 'w')} title="←">
        <WestIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell col={2} row={3} cursor={CURSORS.sw} disabled={!canResize}
        onMouseDown={beginDrag('resize', 'sw')} title="↙">
        <SouthWestIcon style={{ fontSize: iconSize }} />
      </Cell>

      <Cell col={3} row={1} cursor={CURSORS.n} disabled={!canResize}
        onMouseDown={beginDrag('resize', 'n')} title="↑">
        <NorthIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell col={3} row={2} cursor="move" disabled={!canResize}
        onMouseDown={beginDrag('move', null)} title="Переместить окно">
        <OpenWithIcon style={{ fontSize: Math.round(iconSize * 1.2) }} />
      </Cell>
      <Cell col={3} row={3} cursor={CURSORS.s} disabled={!canResize}
        onMouseDown={beginDrag('resize', 's')} title="↓">
        <SouthIcon style={{ fontSize: iconSize }} />
      </Cell>

      <Cell col={4} row={1} cursor={CURSORS.ne} disabled={!canResize}
        onMouseDown={beginDrag('resize', 'ne')} title="↗">
        <NorthEastIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell col={4} row={2} cursor={CURSORS.e} disabled={!canResize}
        onMouseDown={beginDrag('resize', 'e')} title="→">
        <EastIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell col={4} row={3} cursor={CURSORS.se} disabled={!canResize}
        onMouseDown={beginDrag('resize', 'se')} title="↘">
        <SouthEastIcon style={{ fontSize: iconSize }} />
      </Cell>

      <Cell col={5} row={1} disabled={!hasWin} onClick={maximizeWin}
        title={isMaximized ? 'Восстановить' : 'На весь экран'}>
        {isMaximized
          ? <FilterNoneIcon style={{ fontSize: iconSize }} />
          : <CropSquareIcon style={{ fontSize: iconSize }} />}
      </Cell>
      <Cell col={5} row={2} disabled={!hasWin} onClick={minimizeWin} title="Свернуть">
        <MinimizeIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell col={5} row={3} disabled={!hasWin} onClick={closeWin} title="Закрыть окно">
        <CloseIcon style={{ fontSize: iconSize }} />
      </Cell>
    </div>
  );
}