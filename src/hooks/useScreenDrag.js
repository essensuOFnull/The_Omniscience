import { useEffect, useRef } from 'react';

import { detectSnap, getSnapGeometry } from '../utils/snap.js';

const MIN_W = 1;
const MIN_H = 1;

export default function useScreenDrag(state, actions) {
  const stateRef = useRef(state);
  const actionsRef = useRef(actions);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { actionsRef.current = actions; }, [actions]);

  useEffect(() => {
    const api = window.electron_desktop_API;
    if (!api || !api.on) return;

    let drag = null;
    let resize = null;

    const locate = (wid) => {
      const st = stateRef.current;
      for (const [desktopId, desktop] of Object.entries(st?.desktops || {})) {
        const win = desktop.windows?.[wid];
        if (win) return { desktopId, win };
      }
      return null;
    };

    // ---------- DRAG окна ----------
    const onDragStart = (msg) => {
      const wid = msg?.windowId;
      if (!wid) return;
      const found = locate(wid);
      if (!found) { drag = null; return; }
      const { desktopId, win } = found;
      const g = win.ghost;
      if (!g || win.maximized || win.closing) { drag = null; return; }

      drag = {
        windowId: wid,
        desktopId,
        startCX: g.centerX,
        startCY: g.centerY,
        width: g.width,
        height: g.height,
        accX: 0,
        accY: 0,
      };
      actionsRef.current.focusWindow(desktopId, wid);
    };

    const onDragDelta = (msg) => {
      const wid = msg?.windowId;
      if (!wid || !drag || drag.windowId !== wid) return;
      drag.accX += msg.dx;
      drag.accY += msg.dy;

      const vp = stateRef.current?.desktops?.[drag.desktopId]?.viewport
        || { width: window.innerWidth, height: window.innerHeight };

      const newCX = drag.startCX + drag.accX;
      const newCY = drag.startCY + drag.accY;

      const snap = detectSnap(newCX, newCY, drag.width, drag.height, vp);
      if (snap) {
        const geo = getSnapGeometry(snap, vp);
        if (geo) {
          actionsRef.current.setWindowRect(
            drag.desktopId, wid,
            geo.centerX, geo.centerY, geo.width, geo.height,
            snap
          );
          return;
        }
      }

      // Обычный move — размер возвращаем к исходному
      actionsRef.current.setWindowRect(
        drag.desktopId, wid,
        newCX, newCY, drag.width, drag.height,
        null
      );
    };

    const onDragEnd = (msg) => {
      if (msg?.windowId && drag && msg.windowId === drag.windowId) drag = null;
    };

    // ---------- RESIZE окна ----------
    const onResizeStart = (msg) => {
      const wid = msg?.windowId;
      if (!wid) return;
      const found = locate(wid);
      if (!found) { resize = null; return; }
      const { desktopId, win } = found;
      const g = win.ghost;
      if (!g || win.maximized || win.closing) { resize = null; return; }

      resize = {
        windowId: wid,
        desktopId,
        direction: msg.direction,
        startCX: g.centerX,
        startCY: g.centerY,
        startW: g.width,
        startH: g.height,
        accX: 0,
        accY: 0,
      };
      actionsRef.current.focusWindow(desktopId, wid);
    };

    const onResizeDelta = (msg) => {
      const wid = msg?.windowId;
      if (!wid || !resize || resize.windowId !== wid) return;
      resize.accX += msg.dx;
      resize.accY += msg.dy;

      const st = stateRef.current;
      const vp = st?.desktops?.[resize.desktopId]?.viewport
        || { width: window.innerWidth, height: window.innerHeight };

      const dx = resize.accX;
      const dy = resize.accY;
      const direction = resize.direction;

      const left = resize.startCX - resize.startW / 2;
      const right = resize.startCX + resize.startW / 2;
      const top = resize.startCY - resize.startH / 2;
      const bottom = resize.startCY + resize.startH / 2;
      let newW = resize.startW, newH = resize.startH;
      let newCX = resize.startCX, newCY = resize.startCY;

      if (direction.includes('e')) {
        newW = Math.max(MIN_W, Math.min(resize.startW + dx, vp.width - left));
        newCX = left + newW / 2;
      } else if (direction.includes('w')) {
        newW = Math.max(MIN_W, Math.min(resize.startW - dx, right));
        newCX = right - newW / 2;
      }
      if (direction.includes('s')) {
        newH = Math.max(MIN_H, Math.min(resize.startH + dy, vp.height - top));
        newCY = top + newH / 2;
      } else if (direction.includes('n')) {
        newH = Math.max(MIN_H, Math.min(resize.startH - dy, bottom));
        newCY = bottom - newH / 2;
      }

      actionsRef.current.setWindowRect(
        resize.desktopId, wid,
        newCX, newCY, newW, newH,
        null
      );
    };

    const onResizeEnd = (msg) => {
      if (msg?.windowId && resize && msg.windowId === resize.windowId) resize = null;
    };

    const offs = [
      api.on('shell:frame-drag-start', onDragStart),
      api.on('shell:frame-drag-delta', onDragDelta),
      api.on('shell:frame-drag-end', onDragEnd),
      api.on('shell:frame-resize-start', onResizeStart),
      api.on('shell:frame-resize-delta', onResizeDelta),
      api.on('shell:frame-resize-end', onResizeEnd),
    ];

    return () => offs.forEach((o) => typeof o === 'function' && o());
  }, []);
}