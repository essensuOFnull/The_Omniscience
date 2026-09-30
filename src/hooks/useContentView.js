import { useState, useEffect, useCallback, useRef } from 'react';

const OFFSCREEN = { x: -10000, y: -10000, width: 1, height: 1 };

export default function useContentView(windowId, win, app, config, contentRef, desktopOffset, isActive, desktopId) {
  const [viewCreated, setViewCreated] = useState(false);
  const rafIdRef = useRef(null);
  const isActiveRef = useRef(isActive);
  const lastSentRef = useRef({ x: NaN, y: NaN, width: NaN, height: NaN });

  useEffect(() => { isActiveRef.current = !!isActive; }, [isActive]);

  // ---- Создание view ----
  useEffect(() => {
    if (!win || win.closing) return;
    if (viewCreated) return;

    const base = win.url || app?.url || app?.initialUrl || 'about:blank';

    // Прокидываем windowId/desktopId в URL только для локальных страниц.
    let url = base;
    if (!/^https?:\/\//i.test(base)) {
      try {
        const sep = base.includes('?') ? '&' : '?';
        const params = new URLSearchParams();
        params.set('windowId', windowId);
        if (desktopId) params.set('desktopId', desktopId);
        url = `${base}${sep}${params.toString()}`;
      } catch { /* оставляем base */ }
    }

    const preload = app?.preloadPath || config?.windowPreload || null;

    window.electron_desktop_API.createView({
      id: windowId,
      kind: 'window',
      url,
      preload,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
    });
    setViewCreated(true);

    return () => {
      window.electron_desktop_API.destroyView({ id: windowId });
    };
  }, [windowId, win?.closing, desktopId]);

  // ---- Обновление bounds ----
  const sendUpdate = useCallback(() => {
    if (!viewCreated) return;

    // Рабочий стол неактивен → за экран
    if (!isActiveRef.current) {
      const w = Math.max(1, Math.round(win?.ghost?.width || 1));
      const h = Math.max(1, Math.round(win?.ghost?.height || 1));
      const next = { x: -10000, y: -10000, width: w, height: h };
      const prev = lastSentRef.current;
      if (prev.x === next.x && prev.y === next.y && prev.width === next.width && prev.height === next.height) return;
      lastSentRef.current = next;
      window.electron_desktop_API.updateViewBounds({
        id: windowId,
        bounds: next,
        moveChildren: true,
      });
      return;
    }

    const el = contentRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    // Схлопнуто / минимализировано → за экран
    if (width <= 1 || height <= 1) {
      const prev = lastSentRef.current;
      if (prev.x === OFFSCREEN.x && prev.y === OFFSCREEN.y) return;
      lastSentRef.current = { ...OFFSCREEN };
      window.electron_desktop_API.updateViewBounds({
        id: windowId,
        bounds: { ...OFFSCREEN },
        moveChildren: true,
      });
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

  // ---- RAF-цикл ----
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

  // ---- Z-index ----
  useEffect(() => {
    if (!viewCreated) return;
    window.electron_desktop_API.setViewZ({ id: windowId, z: win?.z || 0 });
  }, [viewCreated, windowId, win?.z]);

  return { viewCreated, sendUpdate };
}