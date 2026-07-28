import { useState, useEffect, useCallback, useRef } from 'react';

export default function useContentView(windowId, win, app, config, contentRef, desktopOffset, isGrid, overviewScrollTop, isActive) {
  const [viewCreated, setViewCreated] = useState(false);
  const rafIdRef = useRef(null);
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    isActiveRef.current = !!isActive;
  }, [isActive]);

  // Создание WebContents один раз при монтировании (или при смене windowId)
  useEffect(() => {
    if (!win || win.closing) return;
    if (viewCreated) return;

    const url = win.url || app?.url || app?.initialUrl || 'about:blank';
    const preload = app?.preloadPath || config?.windowPreload || null;
    window.electron_desktop_API.createWindowContentView({
      windowId, url, preload,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
    });
    setViewCreated(true);

    return () => {
      window.electron_desktop_API.destroyWindowContentView({ windowId });
    };
  }, [windowId, win?.closing]); // пересоздаётся только при смене окна или его закрытии

  const sendUpdate = useCallback(() => {
    if (!viewCreated) return;

    const el = contentRef.current;
    if (!isActiveRef.current) {
      const width = Math.max(1, Math.round(win?.ghost?.width || 1));
      const height = Math.max(1, Math.round(win?.ghost?.height || 1));
      window.electron_desktop_API.updateWindowContentView({
        windowId,
        x: -10000,
        y: -10000,
        width,
        height,
        scale: 1,
      });
      return;
    }

    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.round(rect.left + desktopOffset.x);
    const y = Math.round(rect.top + desktopOffset.y);
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width <= 0 || height <= 0) return;
    const scale = win.contentScale || 1;

    window.electron_desktop_API.updateWindowContentView({
      windowId, x, y, width, height, scale,
    });
  }, [windowId, win, desktopOffset, contentRef, viewCreated]);

  // Непрерывный цикл синхронизации через requestAnimationFrame
  useEffect(() => {
    isActiveRef.current = !!isActive;
  }, [isActive]);

  useEffect(() => {
    if (!viewCreated) return;
    const loop = () => {
      sendUpdate();
      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [viewCreated, sendUpdate]);

  // Дополнительно обновляем z-index при изменении
  useEffect(() => {
    if (!viewCreated) return;
    window.electron_desktop_API.setWindowContentZIndex({ windowId, zIndex: win.z || 0 });
  }, [viewCreated, windowId, win.z]);

  return { viewCreated, sendUpdate };
}