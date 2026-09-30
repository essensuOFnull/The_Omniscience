import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Panel from '../frame-runtime/Panel.jsx';
import { dragBy } from '../utils/pointerClamp.js';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#a855f7' },
    background: { paper: 'rgba(28,0,28,0.88)', default: 'transparent' },
    text: { primary: '#fff', secondary: 'rgba(255,255,255,0.7)' },
  },
});

export default function PanelContainer({ windowId }) {
  const api = window.electron_panel_API;

  const [props, setProps] = useState({
    title: document.title || 'Окно',
    icon: null,
    isFocused: false,
    maximized: false,
  });

  const [mode, setMode] = useState('control');
  const [navState, setNavState] = useState({
    currentUrl: location.href,
    canGoBack: false,
    canGoForward: false,
    loading: false,
  });

  const modeRef = useRef(null);
  const panelBoundsRef = useRef(null);   // { x, y, width, height } внутри main
  const panelDragRef = useRef(null);     // аккумулятор для dragBy
  const mainSizeRef = useRef(null);      // { width, height } главного окна

  // ---- Props от shell ----
  useEffect(() => {
    if (!api) return;
    return api.on('panel:props', (data) => {
      setProps((p) => ({ ...p, ...(data || {}) }));
    });
  }, [api]);

  // ---- Начальные bounds панели и размеры главного окна ----
  useEffect(() => {
    if (!api) return;

    api.invoke('view:get-bounds', { id: `panel:${windowId}` }).then((b) => {
      if (b) panelBoundsRef.current = b;
    });

    api.getMainSize().then((s) => {
      if (s) mainSizeRef.current = s;
    });
  }, [api, windowId]);

  // ---- Pointer lock ----
  useEffect(() => {
    const onMove = (e) => {
      if (!document.pointerLockElement || !modeRef.current) return;
      const m = modeRef.current;

      if (m === 'panelMove') {
        const cur = panelBoundsRef.current;
        const mainSize = mainSizeRef.current;
        if (!cur || !mainSize) return;

        const vp = { width: mainSize.width, height: mainSize.height };

        if (!panelDragRef.current) {
          panelDragRef.current = {
            startCX: cur.x + cur.width / 2,
            startCY: cur.y + cur.height / 2,
            width: cur.width,
            height: cur.height,
            accX: 0,
            accY: 0,
          };
        }

        const { cx, cy } = dragBy(panelDragRef.current, e.movementX, e.movementY, vp);
        const next = {
          x: Math.round(cx - cur.width / 2),
          y: Math.round(cy - cur.height / 2),
          width: cur.width,
          height: cur.height,
        };
        panelBoundsRef.current = next;
        api.updateOwnBounds(next, false);
      } else if (m === 'windowDrag') {
        api.send('frame:drag-delta', { windowId, dx: e.movementX, dy: e.movementY });
      } else if (m && m.resize) {
        api.send('frame:resize-delta', {
          windowId, direction: m.resize,
          dx: e.movementX, dy: e.movementY,
        });
      }
    };

    const finish = () => {
      const m = modeRef.current;
      if (!m) return;
      modeRef.current = null;
      panelDragRef.current = null;
      try { document.exitPointerLock?.(); } catch (_) {}
      if (m === 'windowDrag') api.send('frame:drag-end', { windowId });
      else if (m.resize) api.send('frame:resize-end', { windowId });
    };

    const onLockChange = () => { if (!document.pointerLockElement) finish(); };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', finish);
    document.addEventListener('pointerlockchange', onLockChange);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', finish);
      document.removeEventListener('pointerlockchange', onLockChange);
    };
  }, [api, windowId]);

  const lockPointer = () => {
    try {
      const p = document.body.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (_) {}
  };

  const onPanelDragStart = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    panelDragRef.current = null;

    // Свежие данные перед стартом
    api.invoke('view:get-bounds', { id: `panel:${windowId}` }).then((b) => {
      if (b) panelBoundsRef.current = b;
    });
    api.getMainSize().then((s) => {
      if (s) mainSizeRef.current = s;
    });

    modeRef.current = 'panelMove';
    lockPointer();
  }, [api, windowId]);

  const onPanelDoubleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: сброс в дефолтный угол (правый-нижний окна)
  }, []);

  const onWindowDragStart = useCallback((e) => {
    if (props.maximized || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    modeRef.current = 'windowDrag';
    lockPointer();
    api.send('frame:drag-start', { windowId });
  }, [api, windowId, props.maximized]);

  const beginResize = useCallback((dir) => (e) => {
    if (props.maximized || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    modeRef.current = { resize: dir };
    lockPointer();
    api.send('frame:resize-start', { windowId, direction: dir });
  }, [api, windowId, props.maximized]);

  const send = useCallback((type, payload) => {
    api.send('panel:event', { windowId, type, payload });
  }, [api, windowId]);

  const onClose = useCallback(() => send('close', {}), [send]);
  const onMinimize = useCallback(() => send('minimize', {}), [send]);
  const onMaximize = useCallback(() => send('toggle-maximize', {}), [send]);
  const onToggleMode = useCallback(() => {
    setMode((m) => (m === 'control' ? 'search' : 'control'));
  }, []);

  const onNavigateTo = (url) => {
    if (!url) return;
    try {
      if (!/^[a-z]+:/i.test(url)) url = 'https://' + url;
      api.send('window-load-url', windowId, url);
    } catch (_) {}
  };
  const onBack = () => api.send('window-go-back', windowId);
  const onForward = () => api.send('window-go-forward', windowId);
  const onReload = () => api.send('window-reload', windowId);

  const onOpenDevTools = useCallback(() => {
    api.send('panel:event', { windowId, type: 'open-devtools', payload: {} });
  }, [api, windowId]);

  const cell = 28;
  const gap = 1;
  const pad = 4;

  return (
    <ThemeProvider theme={darkTheme}>
      <Panel
        x={0} y={0} width="100%" height="100%"
        cell={cell} gap={gap} pad={pad}
        mode={mode}
        scale={1}
        title={props.title}
        icon={props.icon}
        isFocused={props.isFocused}
        maximized={props.maximized}
        closing={false}
        loading={navState.loading}
        currentUrl={navState.currentUrl}
        canGoBack={navState.canGoBack}
        canGoForward={navState.canGoForward}
        onPanelDragStart={onPanelDragStart}
        onPanelDoubleClick={onPanelDoubleClick}
        onWindowDragStart={onWindowDragStart}
        onResize={beginResize}
        onToggleMode={onToggleMode}
        onClose={onClose}
        onMinimize={onMinimize}
        onMaximize={onMaximize}
        onNavigateTo={onNavigateTo}
        onBack={onBack}
        onForward={onForward}
        onReload={onReload}
        onOpenDevTools={onOpenDevTools}
      />
    </ThemeProvider>
  );
}