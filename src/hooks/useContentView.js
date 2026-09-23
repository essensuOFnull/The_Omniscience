import { useState, useEffect, useCallback, useRef } from 'react';

const OFFSCREEN = { x: -10000, y: -10000, width: 1, height: 1, scale: 1 };

export default function useContentView(windowId, win, app, config, contentRef, desktopOffset, isGrid, overviewScrollTop, isActive) {
  const [viewCreated, setViewCreated] = useState(false);
  const rafIdRef = useRef(null);
  const isActiveRef = useRef(isActive);

  // Кэш последних отправленных bounds — чтобы не спамить IPC одинаковыми значениями
  const lastSentRef = useRef({ x: NaN, y: NaN, width: NaN, height: NaN, scale: NaN });

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
  }, [windowId, win?.closing]);

  const sendUpdate = useCallback(() => {
    if (!viewCreated) return;

    // --- 1. Рабочий стол неактивен → view за экран ---
    if (!isActiveRef.current) {
      const w = Math.max(1, Math.round(win?.ghost?.width || 1));
      const h = Math.max(1, Math.round(win?.ghost?.height || 1));
      const next = { x: -10000, y: -10000, width: w, height: h, scale: 1 };
      const prev = lastSentRef.current;
      if (prev.x === next.x && prev.y === next.y && prev.width === next.width && prev.height === next.height) return;
      lastSentRef.current = next;
      window.electron_desktop_API.updateWindowContentView({ windowId, ...next });
      return;
    }

    const el = contentRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    // --- 2. Схлопнутое / минимализированное окно (scale → 0) → view за экран ---
    if (width <= 1 || height <= 1) {
      const prev = lastSentRef.current;
      if (prev.x === OFFSCREEN.x && prev.y === OFFSCREEN.y) return;
      lastSentRef.current = { ...OFFSCREEN };
      window.electron_desktop_API.updateWindowContentView({ windowId, ...OFFSCREEN });
      return;
    }

    // --- 3. Обычное обновление позиции ---
    const x = Math.round(rect.left + desktopOffset.x);
    const y = Math.round(rect.top + desktopOffset.y);
    const scale = win.contentScale || 1;

    const prev = lastSentRef.current;
    if (prev.x === x && prev.y === y && prev.width === width && prev.height === height && prev.scale === scale) {
      return;
    }
    lastSentRef.current = { x, y, width, height, scale };

    window.electron_desktop_API.updateWindowContentView({
      windowId, x, y, width, height, scale,
    });
  }, [windowId, win, desktopOffset, contentRef, viewCreated]);

  // Непрерывный цикл синхронизации через requestAnimationFrame
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

  // Обновляем z-index при изменении
  useEffect(() => {
    if (!viewCreated) return;
    window.electron_desktop_API.setWindowContentZIndex({ windowId, zIndex: win.z || 0 });
  }, [viewCreated, windowId, win.z]);

  return { viewCreated, sendUpdate };
}