import { useEffect, useRef, useState } from 'react';

const BASE_W = 200;
const BASE_H = 100;
const EDGE_INSET = 16;

export default function usePanelView({ windowId, win, app, isFocused, pageTitle }) {
  const [created, setCreated] = useState(false);
  const createdRef = useRef(false);

  const frameUrl = (() => {
    try {
      const isDev = window.location.protocol === 'http:';
      const p = isDev ? 'src/frame/index.html' : 'frame/index.html';
      return new URL(p, window.location.href).href
        + `?windowId=${encodeURIComponent(windowId)}`;
    } catch { return null; }
  })();

  // create / destroy
  useEffect(() => {
    if (!win || win.closing) return;
    if (createdRef.current) return;
    if (!frameUrl) return;

    const g = win.ghost || { centerX: 400, centerY: 300, width: 800, height: 600 };
    const x = Math.round(g.centerX + g.width / 2 - BASE_W - EDGE_INSET);
    const y = Math.round(g.centerY + g.height / 2 - BASE_H - EDGE_INSET);

    window.electron_desktop_API.send('create-panel-view', {
      windowId,
      url: frameUrl,
      bounds: { x, y, width: BASE_W, height: BASE_H },
    });

    createdRef.current = true;
    setCreated(true);

    return () => {
      createdRef.current = false;
      window.electron_desktop_API.send('destroy-panel-view', { windowId });
    };
  }, [windowId, win?.closing, frameUrl]);

  // push props
  useEffect(() => {
    if (!created) return;
    window.electron_desktop_API.send('shell:send-to-panel', {
      windowId,
      data: {
        title: pageTitle || app?.title || 'Окно',
        icon: app?.icon || null,
        isFocused: !!isFocused,
        maximized: !!win.maximized,
      },
    });
  }, [created, windowId, pageTitle, app?.icon, app?.title, isFocused, win?.maximized]);

  return { created };
}