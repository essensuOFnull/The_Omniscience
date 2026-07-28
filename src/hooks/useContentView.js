import { useState, useEffect, useCallback, useRef } from 'react';

export default function useContentView(windowId, win, app, config, contentRef, desktopOffset, isGrid, overviewScrollTop) {
  const [viewCreated, setViewCreated] = useState(false);
  const rafIdRef = useRef(null);
  const isActiveRef = useRef(false);

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
    const el = contentRef.current;
    if (!el || !viewCreated) return;
    const rect = el.getBoundingClientRect();

    if (win.minimized || win.closing) {
      window.electron_desktop_API.updateWindowContentView({
        windowId, x: 0, y: 0, width: 0, height: 0, scale: 1,
      });
      return;
    }

    const x = Math.round(rect.left + desktopOffset.x);
    const y = Math.round(rect.top + desktopOffset.y);
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    const scale = win.contentScale || 1;

    window.electron_desktop_API.updateWindowContentView({
      windowId, x, y, width, height, scale,
    });
  }, [windowId, win, desktopOffset, contentRef, viewCreated]);

  // Непрерывный цикл синхронизации через requestAnimationFrame
  useEffect(() => {
    if (!viewCreated) return;
    isActiveRef.current = true;

    const loop = () => {
      if (!isActiveRef.current) return;
      sendUpdate();
      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      isActiveRef.current = false;
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