import React, { useRef, useState, useCallback, useEffect } from 'react';
import ControlGrid from '../frame-runtime/ControlGrid.jsx';
import { dragBy } from '../utils/pointerClamp.js';

const PANEL_W = 184;   // 5 колонок по 28 + gap + padding
const PANEL_H = 102;   // 3 строки по 28 + gap + padding
const EDGE_INSET = 16;

export default function DevToolsPanel({ viewId }) {
  const api = window.electron_devtools_API;

  const [panelPos, setPanelPos] = useState({ x: EDGE_INSET, y: EDGE_INSET });

  const modeRef = useRef(null);
  const panelDragRef = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      if (!document.pointerLockElement || !modeRef.current) return;
      const m = modeRef.current;

      if (m === 'panel') {
        const vp = { width: window.innerWidth, height: window.innerHeight };

        if (!panelDragRef.current) {
          panelDragRef.current = {
            startCX: panelPos.x + PANEL_W / 2,
            startCY: panelPos.y + PANEL_H / 2,
            width: PANEL_W,
            height: PANEL_H,
            accX: 0,
            accY: 0,
          };
        }

        const { cx, cy } = dragBy(panelDragRef.current, e.movementX, e.movementY, vp);
        setPanelPos({
          x: Math.round(cx - PANEL_W / 2),
          y: Math.round(cy - PANEL_H / 2),
        });
      } else if (m === 'view') {
        api.send('view:move-by', { dx: e.movementX, dy: e.movementY });
      } else if (m && m.resize) {
        api.send('view:resize-by', {
          direction: m.resize,
          dx: e.movementX,
          dy: e.movementY,
        });
      }
    };

    const finish = () => {
      if (!modeRef.current) return;
      modeRef.current = null;
      panelDragRef.current = null;
      try { document.exitPointerLock?.(); } catch (_) {}
    };

    const onLock = () => { if (!document.pointerLockElement) finish(); };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', finish);
    document.addEventListener('pointerlockchange', onLock);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', finish);
      document.removeEventListener('pointerlockchange', onLock);
    };
  }, [api, panelPos.x, panelPos.y]);

  const lockPointer = () => {
    try {
      const p = document.body.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (_) {}
  };

  const onPanelDragStart = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    panelDragRef.current = null;
    modeRef.current = 'panel';
    lockPointer();
  }, []);

  const onPanelDoubleClick = useCallback(() => {
    setPanelPos({ x: EDGE_INSET, y: EDGE_INSET });
  }, []);

  const onWindowDragStart = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    modeRef.current = 'view';
    lockPointer();
  }, []);

  const onResize = useCallback((dir) => (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    modeRef.current = { resize: dir };
    lockPointer();
  }, []);

  const onClose = useCallback(() => {
    if (viewId) api.send('view:destroy', { id: viewId });
  }, [api, viewId]);

  const onMaximize = useCallback(() => {
    api.send('view:maximize', {});
  }, [api]);

  const noop = useCallback(() => {}, []);

  const cell = 28;
  const gap = 1;
  const pad = 4;
  const iconSize = Math.round(cell * 0.7);

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `${cell}px ${cell}px ${cell * 1.3}px ${cell}px ${cell}px`,
    gridTemplateRows: `${cell}px ${cell * 1.15}px ${cell}px`,
    gap: `${gap}px`,
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: panelPos.x,
        top: panelPos.y,
        width: PANEL_W,
        height: PANEL_H,
        padding: pad,
        background: 'rgba(28,0,28,0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px dashed cyan',
        borderRadius: 8,
        zIndex: 2147483646,
        boxSizing: 'border-box',
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      <ControlGrid
        gridStyle={gridStyle}
        iconSize={iconSize}
        icon={null}
        maximized={false}
        onMaximize={onMaximize}
        onMinimize={noop}
        onClose={onClose}
        onWindowDragStart={onWindowDragStart}
        onPanelDragStart={onPanelDragStart}
        onPanelDoubleClick={onPanelDoubleClick}
        onToggleMode={noop}
        onOpenDevTools={noop}
        onResize={onResize}
      />
    </div>
  );
}