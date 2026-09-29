import { useEffect, useRef, useState, useCallback } from 'react';

const OFFSCREEN = { x: -10000, y: -10000, width: 1, height: 1 };

export default function useTabContentView(viewId, app, containerRef, { desktopId, tabId } = {}) {
  const [viewCreated, setViewCreated] = useState(false);
  const rafIdRef = useRef(null);
  const lastSentRef = useRef({ x: NaN, y: NaN, width: NaN, height: NaN });

  useEffect(() => {
    if (!app) return;
    if (viewCreated) return;

    const base = app.url || app.initialUrl || 'about:blank';
    const sep = base.includes('?') ? '&' : '?';
    const qs = new URLSearchParams();
    if (desktopId) qs.set('desktopId', desktopId);
    if (tabId) qs.set('tabId', tabId);
    const query = qs.toString();
    const url = query ? `${base}${sep}${query}` : base;

    const preload = app.preloadPath || null;

    window.electron_desktop_API.createView({
      id: viewId,
      kind: 'window',
      url,
      preload,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
    });
    setViewCreated(true);

    return () => {
      window.electron_desktop_API.destroyView({ id: viewId });
    };
  }, [viewId, app?.id, desktopId, tabId]);

  const sendUpdate = useCallback(() => {
    if (!viewCreated) return;
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    if (width <= 1 || height <= 1) {
      const prev = lastSentRef.current;
      if (prev.x === OFFSCREEN.x && prev.y === OFFSCREEN.y) return;
      lastSentRef.current = { ...OFFSCREEN };
      window.electron_desktop_API.updateViewBounds({
        id: viewId,
        bounds: { ...OFFSCREEN },
      });
      return;
    }

    const x = Math.round(rect.left);
    const y = Math.round(rect.top);

    const prev = lastSentRef.current;
    if (prev.x === x && prev.y === y && prev.width === width && prev.height === height) return;
    lastSentRef.current = { x, y, width, height };

    window.electron_desktop_API.updateViewBounds({
      id: viewId,
      bounds: { x, y, width, height },
    });
  }, [viewId, containerRef, viewCreated]);

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
    if (!viewCreated) return;
    window.electron_desktop_API.setViewZ({ id: viewId, z: 0 });
  }, [viewCreated, viewId]);

  return { viewCreated };
}