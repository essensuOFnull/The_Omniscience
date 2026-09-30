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

export default function PanelContainer() {
  const api = window.electron_panel_API;

  const [props, setProps] = useState({
    windowId: null,
    title: '',
    icon: null,
    isFocused: false,
    maximized: false,
    loading: false,
    currentUrl: '',
    canGoBack: false,
    canGoForward: false,
    hasActiveWindow: false,
  });

  const [mode, setMode] = useState('control');
  const modeRef = useRef(null);
  const panelBoundsRef = useRef(null);
  const panelDragRef = useRef(null);
  const mainSizeRef = useRef(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  // ---- Props от shell + ready-сигнал ----
  useEffect(() => {
    if (!api) return;
    const off = api.on('panel:props', (data) => {
      setProps((p) => ({ ...p, ...(data || {}) }));
    });
    // Сообщаем main, что мы готовы получить последнее состояние
    api.send('panel:ready');
    return off;
  }, [api]);

  // ---- Начальные bounds + размер главного окна ----
  useEffect(() => {
    if (!api) return;
    api.invoke('view:get-bounds', { id: 'panel:global' }).then((b) => {
      if (b) panelBoundsRef.current = b;
    });
    api.getMainSize().then((s) => {
      if (s) mainSizeRef.current = s;
    });
  }, [api]);

  // ---- Pointer lock ----
  useEffect(() => {
    const onMove = (e) => {
      if (!document.pointerLockElement || !modeRef.current) return;
      const m = modeRef.current;
      const windowId = propsRef.current.windowId;

      if (m === 'panelMove') {
        const cur = panelBoundsRef.current;
        const mainSize = mainSizeRef.current;
        if (!cur || !mainSize) return;

        const vp = { width: mainSize.width, height: mainSize.height };
        if (!panelDragRef.current) {
          panelDragRef.current = {
            startCX: cur.x + cur.width / 2,
            startCY: cur.y + cur.height / 2,
            width: cur.width, height: cur.height,
            accX: 0, accY: 0,
          };
        }
        const { cx, cy } = dragBy(panelDragRef.current, e.movementX, e.movementY, vp);
        const next = {
          x: Math.round(cx - cur.width / 2),
          y: Math.round(cy - cur.height / 2),
          width: cur.width, height: cur.height,
        };
        panelBoundsRef.current = next;
        api.updateOwnBounds(next);
      } else if (m === 'windowDrag' && windowId) {
        api.send('frame:drag-delta', { windowId, dx: e.movementX, dy: e.movementY });
      } else if (m && m.resize && windowId) {
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
      const windowId = propsRef.current.windowId;
      if (windowId) {
        if (m === 'windowDrag') api.send('frame:drag-end', { windowId });
        else if (m.resize) api.send('frame:resize-end', { windowId });
      }
    };

    const onLock = () => { if (!document.pointerLockElement) finish(); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', finish);
    document.addEventListener('pointerlockchange', onLock);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', finish);
      document.removeEventListener('pointerlockchange', onLock);
    };
  }, [api]);

  const lock = () => { try { document.body.requestPointerLock(); } catch (_) {} };

  const onPanelDragStart = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    panelDragRef.current = null;
    api.invoke('view:get-bounds', { id: 'panel:global' }).then((b) => {
      if (b) panelBoundsRef.current = b;
    });
    api.getMainSize().then((s) => { if (s) mainSizeRef.current = s; });
    modeRef.current = 'panelMove';
    lock();
  }, [api]);

  const onPanelDoubleClick = useCallback(() => {
    const mainSize = mainSizeRef.current;
    const cur = panelBoundsRef.current;
    if (!mainSize || !cur) return;
    const next = {
      x: Math.round((mainSize.width - cur.width) / 2),
      y: Math.round((mainSize.height - cur.height) / 2),
      width: cur.width, height: cur.height,
    };
    panelBoundsRef.current = next;
    api.updateOwnBounds(next);
  }, [api]);

  const onWindowDragStart = useCallback((e) => {
    const windowId = propsRef.current.windowId;
    if (!windowId || propsRef.current.maximized || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    modeRef.current = 'windowDrag';
    lock();
    api.send('frame:drag-start', { windowId });
  }, [api]);

  const beginResize = useCallback((dir) => (e) => {
    const windowId = propsRef.current.windowId;
    if (!windowId || propsRef.current.maximized || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    modeRef.current = { resize: dir };
    lock();
    api.send('frame:resize-start', { windowId, direction: dir });
  }, [api]);

  const send = useCallback((type, payload) => {
    const windowId = propsRef.current.windowId;
    if (!windowId) return;
    api.send('panel:event', { windowId, type, payload });
  }, [api]);

  const onClose = useCallback(() => send('close', {}), [send]);
  const onMinimize = useCallback(() => send('minimize', {}), [send]);
  const onMaximize = useCallback(() => send('toggle-maximize', {}), [send]);
  const onToggleMode = useCallback(() => {
    setMode((m) => (m === 'control' ? 'search' : 'control'));
  }, []);
  const onOpenDevTools = useCallback(() => send('open-devtools', {}), [send]);

  const onNavigateTo = useCallback((url) => {
    const windowId = propsRef.current.windowId;
    if (!url || !windowId) return;
    try {
      if (!/^[a-z]+:/i.test(url)) url = 'https://' + url;
      api.send('window-load-url', windowId, url);
    } catch (_) {}
  }, [api]);
  const onBack = useCallback(() => {
    const windowId = propsRef.current.windowId;
    if (windowId) api.send('window-go-back', windowId);
  }, [api]);
  const onForward = useCallback(() => {
    const windowId = propsRef.current.windowId;
    if (windowId) api.send('window-go-forward', windowId);
  }, [api]);
  const onReload = useCallback(() => {
    const windowId = propsRef.current.windowId;
    if (windowId) api.send('window-reload', windowId);
  }, [api]);

  const cell = 28, gap = 1, pad = 4;

  return (
    <ThemeProvider theme={darkTheme}>
      <Panel
        x={0} y={0} width="100%" height="100%"
        cell={cell} gap={gap} pad={pad}
        mode={mode}
        title={props.title}
        icon={props.icon}
        isFocused={props.isFocused}
        maximized={props.maximized}
        closing={false}
        loading={props.loading}
        currentUrl={props.currentUrl}
        canGoBack={props.canGoBack}
        canGoForward={props.canGoForward}
        hasActiveWindow={props.hasActiveWindow}
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