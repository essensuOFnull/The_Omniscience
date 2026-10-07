import React, { useCallback, useEffect, useRef, useState } from 'react';

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

const CURSORS = {
  nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize',
  w: 'ew-resize', e: 'ew-resize',
  sw: 'nesw-resize', s: 'ns-resize', se: 'nwse-resize',
};

const EMPTY = 'rgba(255,255,255,0.03)';
const HOVER = 'rgba(168,85,247,0.25)';

function Cell({ children, cursor, onClick, onMouseDown, title, disabled, col, row }) {
  const [hover, setHover] = useState(false);
  return (
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
      title={title}
    >
      {children}
    </div>
  );
}

export default function ControlGrid({ activeWindow, actions, onOpenDevTools }) {
  const iconSize = 14;

  const awRef = useRef(activeWindow);
  awRef.current = activeWindow;

  const dragRef = useRef(null);

  const hasWin = !!activeWindow;
  const systemId = activeWindow?.systemId || null;
  const isMaximized = !!activeWindow?.maximized;

  const lockPointer = () => {
    try { document.body.requestPointerLock(); } catch (_) { }
  };
  const releasePointer = () => {
    try { document.exitPointerLock?.(); } catch (_) { }
  };

  /* ---------- Старт drag ---------- */
  const startWindowDrag = useCallback(async () => {
    const aw = awRef.current;
    if (!aw || aw.maximized) return;
    const id = aw.systemId || aw.id;
    if (!id) return;

    const b = await window.electron_desktop_API.invoke('native-window:get-bounds', { id });
    if (!b) return;

    dragRef.current = {
      mode: 'move',
      id,
      startCX: b.x + b.width / 2,
      startCY: b.y + b.height / 2,
      width: b.width,
      height: b.height,
      accX: 0, accY: 0,
    };
    lockPointer();
  }, []);

  /* ---------- Старт resize ---------- */
  const startWindowResize = useCallback((direction) => async () => {
    const aw = awRef.current;
    if (!aw || aw.maximized) return;
    const id = aw.systemId || aw.id;
    if (!id) return;

    const b = await window.electron_desktop_API.invoke('native-window:get-bounds', { id });
    if (!b) return;

    dragRef.current = {
      mode: 'resize',
      direction,
      id,
      startCX: b.x + b.width / 2,
      startCY: b.y + b.height / 2,
      startW: b.width,
      startH: b.height,
      accX: 0, accY: 0,
    };
    lockPointer();
  }, []);

  /* ---------- Единый обработчик мыши ---------- */
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d || !document.pointerLockElement) return;

      if (d.mode === 'move') {
        d.accX += e.movementX;
        d.accY += e.movementY;
        const newCX = d.startCX + d.accX;
        const newCY = d.startCY + d.accY;
        const newX = Math.round(newCX - d.width / 2);
        const newY = Math.round(newCY - d.height / 2);
        window.electron_desktop_API.send('native-window:move', {
          id: d.id, x: newX, y: newY,
        });
        return;
      }

      if (d.mode === 'resize') {
        d.accX += e.movementX;
        d.accY += e.movementY;
        const dir = d.direction;

        const left   = d.startCX - d.startW / 2;
        const right  = d.startCX + d.startW / 2;
        const top    = d.startCY - d.startH / 2;
        const bottom = d.startCY + d.startH / 2;

        let newW = d.startW, newH = d.startH;
        let newCX = d.startCX, newCY = d.startCY;

        if (dir.includes('e')) {
          newW = Math.max(100, d.startW + d.accX);
          newCX = left + newW / 2;
        } else if (dir.includes('w')) {
          newW = Math.max(100, d.startW - d.accX);
          newCX = right - newW / 2;
        }
        if (dir.includes('s')) {
          newH = Math.max(100, d.startH + d.accY);
          newCY = top + newH / 2;
        } else if (dir.includes('n')) {
          newH = Math.max(100, d.startH - d.accY);
          newCY = bottom - newH / 2;
        }

        const newX = Math.round(newCX - newW / 2);
        const newY = Math.round(newCY - newH / 2);

        window.electron_desktop_API.send('native-window:resize', {
          id: d.id, x: newX, y: newY,
          width: Math.round(newW), height: Math.round(newH),
        });
      }
    };

    const onUp = () => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      releasePointer();
      window.electron_desktop_API.send('native-window:release', {});
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  /* ---------- Кнопки окна ---------- */
  const closeWin = useCallback(() => {
    const aw = awRef.current;
    if (!aw) return;
    const id = aw.systemId || aw.id;
    if (!id) return;
    window.electron_desktop_API.send('native-window:close', { id });
  }, []);

  const minimizeWin = useCallback(() => {
    const aw = awRef.current;
    if (!aw) return;
    const id = aw.systemId || aw.id;
    if (!id) return;
    window.electron_desktop_API.send('native-window:minimize', { id });
  }, []);

  const maximizeWin = useCallback(() => {
    const aw = awRef.current;
    if (!aw) return;
    const id = aw.systemId || aw.id;
    if (!id) return;
    window.electron_desktop_API.send('native-window:maximize', {
      id,
      maximized: !!aw.maximized,
    });
  }, []);

  /* ---------- Сетка ---------- */
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(5, ${CELL}px)`,
    gridTemplateRows: `repeat(3, ${CELL}px)`,
    gap: GAP,
  };

  return (
    <div style={gridStyle}>
      {/* Колонка 1: иконка / поиск / devtools */}
      <Cell col={1} row={1}
        title={activeWindow?.title || 'Нет активного окна'}
        disabled={!hasWin}>
        {activeWindow?.icon
          ? <img src={activeWindow.icon} width={iconSize} height={iconSize} alt="" draggable={false} />
          : <DesktopWindowsIcon style={{ fontSize: iconSize }} />}
      </Cell>

      <Cell col={1} row={2}
        title="Поиск / адресная строка"
        disabled={!hasWin}
        onClick={() => onOpenDevTools?.('browser')}>
        <SearchIcon style={{ fontSize: iconSize }} />
      </Cell>

      <Cell col={1} row={3}
        title="Открыть DevTools"
        disabled={!hasWin}
        onClick={() => onOpenDevTools?.('devtools')}>
        <BuildIcon style={{ fontSize: iconSize }} />
      </Cell>

      {/* Колонка 2: NW / W / SW */}
      <Cell col={2} row={1} cursor={CURSORS.nw}
        disabled={!hasWin || isMaximized}
        onMouseDown={startWindowResize('nw')} title="↖">
        <NorthWestIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell col={2} row={2} cursor={CURSORS.w}
        disabled={!hasWin || isMaximized}
        onMouseDown={startWindowResize('w')} title="←">
        <WestIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell col={2} row={3} cursor={CURSORS.sw}
        disabled={!hasWin || isMaximized}
        onMouseDown={startWindowResize('sw')} title="↙">
        <SouthWestIcon style={{ fontSize: iconSize }} />
      </Cell>

      {/* Колонка 3: N / MOVE / S */}
      <Cell col={3} row={1} cursor={CURSORS.n}
        disabled={!hasWin || isMaximized}
        onMouseDown={startWindowResize('n')} title="↑">
        <NorthIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell col={3} row={2} cursor="move"
        disabled={!hasWin || isMaximized}
        onMouseDown={startWindowDrag} title="Переместить окно">
        <OpenWithIcon style={{ fontSize: Math.round(iconSize * 1.2) }} />
      </Cell>
      <Cell col={3} row={3} cursor={CURSORS.s}
        disabled={!hasWin || isMaximized}
        onMouseDown={startWindowResize('s')} title="↓">
        <SouthIcon style={{ fontSize: iconSize }} />
      </Cell>

      {/* Колонка 4: NE / E / SE */}
      <Cell col={4} row={1} cursor={CURSORS.ne}
        disabled={!hasWin || isMaximized}
        onMouseDown={startWindowResize('ne')} title="↗">
        <NorthEastIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell col={4} row={2} cursor={CURSORS.e}
        disabled={!hasWin || isMaximized}
        onMouseDown={startWindowResize('e')} title="→">
        <EastIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell col={4} row={3} cursor={CURSORS.se}
        disabled={!hasWin || isMaximized}
        onMouseDown={startWindowResize('se')} title="↘">
        <SouthEastIcon style={{ fontSize: iconSize }} />
      </Cell>

      {/* Колонка 5: □ / − / × */}
      <Cell col={5} row={1}
        disabled={!hasWin}
        onClick={maximizeWin}
        title={isMaximized ? 'Восстановить' : 'На весь экран'}>
        {isMaximized
          ? <FilterNoneIcon style={{ fontSize: iconSize }} />
          : <CropSquareIcon style={{ fontSize: iconSize }} />}
      </Cell>
      <Cell col={5} row={2}
        disabled={!hasWin}
        onClick={minimizeWin} title="Свернуть">
        <MinimizeIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell col={5} row={3}
        disabled={!hasWin}
        onClick={closeWin} title="Закрыть окно">
        <CloseIcon style={{ fontSize: iconSize }} />
      </Cell>
    </div>
  );
}