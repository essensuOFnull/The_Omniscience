import { useEffect, useRef } from 'react';

import { detectSnap, getSnapGeometry } from '../utils/snap.js';
import { dragBy, resizeBy } from '../utils/pointerClamp.js';

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

    const getViewport = (desktopId) => {
      return stateRef.current?.desktops?.[desktopId]?.viewport
        || { width: window.innerWidth, height: window.innerHeight };
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

      const vp = getViewport(drag.desktopId);
      const { cx: newCX, cy: newCY } = dragBy(drag, msg.dx, msg.dy, vp);

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

      const vp = getViewport(resize.desktopId);
      const { cx, cy, w, h } = resizeBy(resize, msg.dx, msg.dy, vp);

      actionsRef.current.setWindowRect(
        resize.desktopId, wid,
        cx, cy, w, h,
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