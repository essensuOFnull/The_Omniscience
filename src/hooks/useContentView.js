import { useState, useEffect, useCallback } from 'react';

export default function useContentView(windowId, win, app, config, contentRef, desktopOffset, isGrid, overviewScrollTop) {
  const [viewCreated, setViewCreated] = useState(false);

  // Создание WebContents один раз при монтировании или при закрытии
  useEffect(() => {
    if (!win || win.closing) return;
    if (viewCreated) return;

    const url = win.url || app?.url || 'about:blank';
    const preload = app?.type === 'xterm' ? config?.xtermPreload || null : config?.windowPreload || null;
    window.electron_desktop_API.createWindowContentView({
      windowId, url, preload,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
    });
    setViewCreated(true);

    return () => {
      window.electron_desktop_API.destroyWindowContentView({ windowId });
    };
  }, [windowId, win?.closing]); // Пересоздавать только при смене окна или его закрытии

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

  // Обновление при изменении геометрии
  useEffect(() => {
    if (!viewCreated) return;
    sendUpdate();
  }, [sendUpdate, viewCreated, win.ghost, win.contentScale, win.minimized, win.closing, isGrid, overviewScrollTop]);

  // Отслеживание ресайза и скролла
  useEffect(() => {
    if (!viewCreated) return;
    const el = contentRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => sendUpdate());
    observer.observe(el);
    window.addEventListener('scroll', sendUpdate);
    window.addEventListener('resize', sendUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', sendUpdate);
      window.removeEventListener('resize', sendUpdate);
    };
  }, [viewCreated, sendUpdate, contentRef]);

  // Обновление z-index
  useEffect(() => {
    if (!viewCreated) return;
    window.electron_desktop_API.setWindowContentZIndex({ windowId, zIndex: win.z || 0 });
  }, [viewCreated, windowId, win.z]);

  return { viewCreated, sendUpdate };
}