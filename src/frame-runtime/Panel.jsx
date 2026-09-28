import React, { useRef, useState, useEffect } from 'react';

import NorthWestIcon from '@mui/icons-material/NorthWest';
import NorthIcon from '@mui/icons-material/North';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import WestIcon from '@mui/icons-material/West';
import EastIcon from '@mui/icons-material/East';
import SouthWestIcon from '@mui/icons-material/SouthWest';
import SouthIcon from '@mui/icons-material/South';
import SouthEastIcon from '@mui/icons-material/SouthEast';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

import Cell from './Cell';
import WindowButtons from './WindowButtons';

const CURSORS = {
  nw: 'nwse-resize',
  n:  'ns-resize',
  ne: 'nesw-resize',
  w:  'ew-resize',
  e:  'ew-resize',
  sw: 'nesw-resize',
  s:  'ns-resize',
  se: 'nwse-resize',
};

const RING_KEYFRAMES = `
@keyframes omni-ring-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
`;

export default function Panel({
  x, y, width, height, cell, gap, pad,
  mode, scale,
  title, icon, isFocused, maximized, closing, loading,
  currentUrl, canGoBack, canGoForward,
  onPanelDragStart, onPanelDoubleClick,
  onWindowDragStart, onResize,
  onToggleMode, onClose, onMinimize, onMaximize,
  onNavigateTo, onBack, onForward, onReload,
}) {
  const iconSize = Math.round(cell * 0.7);
  const textSize = 12;

  const [value, setValue] = useState(currentUrl || '');
  const inputRef = useRef(null);
  const focusRef = useRef(false);

  useEffect(() => {
    if (!focusRef.current) setValue(currentUrl || '');
  }, [currentUrl]);

  /* ------------------------------------------------------------------ */
  /* Сетки                                                               */
  /* ------------------------------------------------------------------ */
  // control: 5 колонок (resize-столбцы по краям)
  // search:  4 колонки — пустой столбец убран, контент растягивается 1fr

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: mode === 'search'
      ? `${cell}px ${cell}px 1fr ${cell}px`
      : `${cell}px ${cell}px ${cell * 1.3}px ${cell}px ${cell}px`,
    gridTemplateRows: `${cell}px ${cell * 1.15}px ${cell}px`,
    gap: `${gap}px`,
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
  };

  const panelStyle = {
    position: 'fixed',
    left: x,
    top: y,
    width,
    height,
    pointerEvents: 'auto',
    zIndex: 2147483646,
    userSelect: 'none',
    borderRadius: 8,
    background: 'rgba(28,0,28,0.88)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px dashed cyan',
    boxSizing: 'border-box',
    padding: pad,
    overflow: 'hidden',
    opacity: closing ? 0.5 : 1,
  };

  /* ------------------------------------------------------------------ */
  /* Левый столбец — общий                                               */
  /* ------------------------------------------------------------------ */

  const renderAnchorLeft = () => (
    <>
      <Cell
        row="1" col="1"
        cursor="grab"
        onMouseDown={onPanelDragStart}
        onDoubleClick={onPanelDoubleClick}
        title="Перетащить панель"
      >
        {icon
          ? <img
              src={icon}
              width={iconSize}
              height={iconSize}
              alt=""
              draggable={false}
              style={{ borderRadius: 2 }}
            />
          : <DragIndicatorIcon style={{ fontSize: iconSize }} />}
      </Cell>

      <Cell
        row="2" col="1"
        cursor="pointer"
        onClick={onToggleMode}
        title="Режим поиска / браузера"
      >
        <SearchIcon style={{ fontSize: iconSize }} />
      </Cell>

      {/* row 3 / col 1 — пусто, место под кнопку скрытия панели */}
    </>
  );

  /* ------------------------------------------------------------------ */
  /* Control-режим (5 колонок)                                           */
  /* ------------------------------------------------------------------ */

  const renderControlGrid = () => (
    <div style={gridStyle}>
      {renderAnchorLeft()}

      {/* Столбец 2 — resize NW / W / SW */}
      <Cell row="1" col="2" cursor={CURSORS.nw} onMouseDown={onResize('nw')} title="Растянуть ↖">
        <NorthWestIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell row="2" col="2" cursor={CURSORS.w} onMouseDown={onResize('w')} title="Растянуть ←">
        <WestIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell row="3" col="2" cursor={CURSORS.sw} onMouseDown={onResize('sw')} title="Растянуть ↙">
        <SouthWestIcon style={{ fontSize: iconSize }} />
      </Cell>

      {/* Столбец 3 — N / move / S */}
      <Cell row="1" col="3" cursor={CURSORS.n} onMouseDown={onResize('n')} title="Растянуть ↑">
        <NorthIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell
        row="2" col="3"
        cursor="move"
        onMouseDown={onWindowDragStart}
        title="Переместить окно"
        style={{ background: 'rgba(168,85,247,0.22)' }}
      >
        <OpenWithIcon style={{ fontSize: Math.round(iconSize * 1.3) }} />
      </Cell>
      <Cell row="3" col="3" cursor={CURSORS.s} onMouseDown={onResize('s')} title="Растянуть ↓">
        <SouthIcon style={{ fontSize: iconSize }} />
      </Cell>

      {/* Столбец 4 — NE / E / SE */}
      <Cell row="1" col="4" cursor={CURSORS.ne} onMouseDown={onResize('ne')} title="Растянуть ↗">
        <NorthEastIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell row="2" col="4" cursor={CURSORS.e} onMouseDown={onResize('e')} title="Растянуть →">
        <EastIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell row="3" col="4" cursor={CURSORS.se} onMouseDown={onResize('se')} title="Растянуть ↘">
        <SouthEastIcon style={{ fontSize: iconSize }} />
      </Cell>

      {/* Столбец 5 — системные кнопки */}
      <WindowButtons
        iconSize={iconSize}
        maximized={maximized}
        onMaximize={onMaximize}
        onMinimize={onMinimize}
        onClose={onClose}
        col={5}
      />
    </div>
  );

  /* ------------------------------------------------------------------ */
  /* Search-режим (4 колонки, без пустого столбца)                       */
  /* ------------------------------------------------------------------ */

  const handleUrlKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onNavigateTo(value.trim());
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  const renderSearchGrid = () => (
    <div style={gridStyle}>
      {renderAnchorLeft()}

      {/* Столбец 2 — навигация */}
      <Cell
        row="1" col="2"
        cursor={canGoBack ? 'pointer' : 'default'}
        onClick={canGoBack ? onBack : undefined}
        title="Назад"
        style={{ opacity: canGoBack ? 1 : 0.3 }}
      >
        <ArrowBackIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell
        row="2" col="2"
        cursor="pointer"
        onClick={onReload}
        title="Перезагрузить"
      >
        <RefreshIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell
        row="3" col="2"
        cursor={canGoForward ? 'pointer' : 'default'}
        onClick={canGoForward ? onForward : undefined}
        title="Вперёд"
        style={{ opacity: canGoForward ? 1 : 0.3 }}
      >
        <ArrowForwardIcon style={{ fontSize: iconSize }} />
      </Cell>

      {/* Столбец 3 — заголовок (растягивается на всю ширину) */}
      <Cell
        row="1" col="3"
        cursor="default"
        title={title}
        style={{
          justifyContent: 'flex-start',
          padding: '0 8px',
          overflow: 'hidden',
          fontSize: textSize,
          width: '100%',
        }}
      >
        <span style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%',
          textAlign: 'left',
        }}>
          {title || 'Окно'}
        </span>
      </Cell>

      {/* Столбец 3 — адрес: textarea + уголок-ручка, тянущая панель */}
      <Cell
        row="2" col="3"
        cursor="text"
        style={{
          position: 'relative',
          padding: 0,
          overflow: 'hidden',
          background: 'rgba(0,0,0,0.25)',
        }}
      >
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => { focusRef.current = true; }}
          onBlur={() => { focusRef.current = false; }}
          onKeyDown={handleUrlKeyDown}
          rows={1}
          spellCheck={false}
          aria-label="Адресная строка"
          style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: textSize,
            fontFamily: 'monospace',
            lineHeight: 1.25,
            padding: '3px 18px 3px 8px', // правый отступ под ручку
            boxSizing: 'border-box',
            resize: 'none',
            overflow: 'auto',
          }}
        />
      </Cell>

      {/* Столбец 4 — системные кнопки */}
      <WindowButtons
        iconSize={iconSize}
        maximized={maximized}
        onMaximize={onMaximize}
        onMinimize={onMinimize}
        onClose={onClose}
        col={4}
      />
    </div>
  );

  /* ------------------------------------------------------------------ */
  /* Loading ring                                                        */
  /* ------------------------------------------------------------------ */

  const LoadingRing = () => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 8,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: -50,
          background:
            'conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(168,85,247,0.9) 340deg, rgba(168,85,247,1) 360deg)',
          animation: 'omni-ring-spin 1.6s linear infinite',
          mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: 2,
          boxSizing: 'content-box',
        }}
      />
    </div>
  );

  return (
    <>
      <style>{RING_KEYFRAMES}</style>

      <div style={panelStyle}>
        {mode === 'control' ? renderControlGrid() : renderSearchGrid()}
        {loading && <LoadingRing />}
      </div>
    </>
  );
}