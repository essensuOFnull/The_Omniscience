import { useState, useEffect, useCallback, useRef } from 'react';

const OFFSCREEN = { x: -10000, y: -10000, width: 1, height: 1 };

export default function useChromiumDevToolsView(windowId, win, contentRef, desktopOffset, isActive, targetWindowId) {
  const [viewCreated, setViewCreated] = useState(false);
  const rafIdRef = useRef(null);
  const isActiveRef = useRef(isActive);
  const lastSentRef = useRef({ x: NaN, y: NaN, width: NaN, height: NaN });

  useEffect(() => { isActiveRef.current = !!isActive; }, [isActive]);

  useEffect(() => {
    if (!win || win.closing) return;
    if (viewCreated) return;

    // Создаём пустой view без URL
    window.electron_desktop_API.createView({
      id: windowId,
      kind: 'window',
      url: null,
      preload: null,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
    });

    // Сразу привязываем как DevTools для целевого окна
    window.electron_desktop_API.send('devtools:attach', {
      devtoolsViewId: windowId,     // 👈 наш новый view
      targetViewId: targetWindowId, // 👈 какое окно инспектируем
    });

    setViewCreated(true);

    return () => {
      window.electron_desktop_API.destroyView({ id: windowId });
    };
  }, [windowId, win?.closing, targetWindowId]);

  const sendUpdate = useCallback(() => {
    if (!viewCreated) return;

    if (!isActiveRef.current) {
      const w = Math.max(1, Math.round(win?.ghost?.width || 1));
      const h = Math.max(1, Math.round(win?.ghost?.height || 1));
      const next = { x: -10000, y: -10000, width: w, height: h };
      const prev = lastSentRef.current;
      if (prev.x === next.x && prev.y === next.y && prev.width === next.width && prev.height === next.height) return;
      lastSentRef.current = next;
      window.electron_desktop_API.updateViewBounds({ id: windowId, bounds: next, moveChildren: true });
      return;
    }

    const el = contentRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    if (width <= 1 || height <= 1) {
      const prev = lastSentRef.current;
      if (prev.x === OFFSCREEN.x && prev.y === OFFSCREEN.y) return;
      lastSentRef.current = { ...OFFSCREEN };
      window.electron_desktop_API.updateViewBounds({ id: windowId, bounds: { ...OFFSCREEN }, moveChildren: true });
      return;
    }

    const x = Math.round(rect.left + desktopOffset.x);
    const y = Math.round(rect.top + desktopOffset.y);

    const prev = lastSentRef.current;
    if (prev.x === x && prev.y === y && prev.width === width && prev.height === height) return;
    lastSentRef.current = { x, y, width, height };

    window.electron_desktop_API.updateViewBounds({
      id: windowId,
      bounds: { x, y, width, height },
      moveChildren: true,
    });
  }, [windowId, win, desktopOffset, contentRef, viewCreated]);

  useEffect(() => {
    if (!viewCreated) return;
    const loop = () => {
      sendUpdate();
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [viewCreated, sendUpdate]);

  useEffect(() => {
    if (!viewCreated || !win) return;
    window.electron_desktop_API.setViewZ({ id: windowId, z: win?.z || 0 });
  }, [viewCreated, windowId, win?.z]);

  return { viewCreated, sendUpdate };
}