import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Panel from './Panel.jsx';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#a855f7' },
    background: { paper: 'rgba(28,0,28,0.88)', default: 'transparent' },
    text: { primary: '#fff', secondary: 'rgba(255,255,255,0.7)' },
  },
});

// Размеры в пикселях при scale = 1
const BASE_CELL = 28;
const BASE_GAP = 1;
const BASE_PAD = 4;
const EDGE_INSET = 16; // отступ от края viewport, если панель не перемещали

export default function FrameRoot({ ctx }) {
  const { windowId, ipcRenderer } = ctx;

  const [props, setProps] = useState({
    title: document.title || 'Окно',
    icon: null,
    isFocused: false,
    maximized: false,
    closing: false,
    frameState: null,
  });

  const [mode, setMode] = useState('control'); // 'control' | 'search'
  const [navState, setNavState] = useState({
    currentUrl: location.href,
    canGoBack: false,
    canGoForward: false,
    loading: false,
  });

  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });

  // ---- Props от shell ----
  useEffect(() => {
    const handler = (_e, data) => setProps((p) => ({ ...p, ...(data || {}) }));
    ipcRenderer.on('frame:props', handler);
    return () => ipcRenderer.removeListener('frame:props', handler);
  }, [ipcRenderer]);

  // ---- Навигация ----
  useEffect(() => {
    const update = () => {
      const nav = window.navigation;
      setNavState({
        currentUrl: location.href,
        canGoBack: nav?.canGoBack ?? false,
        canGoForward: nav?.canGoForward ?? false,
        loading: false,
      });
    };
    const onStart = () => setNavState((s) => ({ ...s, loading: true }));
    const onStop = () => setNavState((s) => ({ ...s, loading: false }));

    update();
    window.navigation?.addEventListener('navigatesuccess', update);
    window.navigation?.addEventListener('navigate', onStart);
    window.addEventListener('popstate', update);
    window.addEventListener('hashchange', update);
    window.addEventListener('beforeunload', onStart);
    window.addEventListener('load', onStop);

    return () => {
      window.navigation?.removeEventListener('navigatesuccess', update);
      window.navigation?.removeEventListener('navigate', onStart);
      window.removeEventListener('popstate', update);
      window.removeEventListener('hashchange', update);
      window.removeEventListener('beforeunload', onStart);
      window.removeEventListener('load', onStop);
    };
  }, []);

  // ---- Title ----
  useEffect(() => {
    const update = () => setProps((p) => ({ ...p, title: document.title || p.title }));
    const titleEl = document.querySelector('title');
    if (!titleEl) return;
    const obs = new MutationObserver(update);
    obs.observe(titleEl, { childList: true, characterData: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  // ---- Viewport ----
  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ---- Pointer lock: drag окна / resize окна / move панели ----
  const modeRef = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      if (!document.pointerLockElement || !modeRef.current) return;
      const m = modeRef.current;
      if (m === 'drag') {
        ipcRenderer.send('frame:drag-delta', { windowId, dx: e.movementX, dy: e.movementY });
      } else if (m === 'panelMove') {
        ipcRenderer.send('frame:move-delta', { windowId, dx: e.movementX, dy: e.movementY });
      } else if (m.resize) {
        ipcRenderer.send('frame:resize-delta', {
          windowId, direction: m.resize,
          dx: e.movementX, dy: e.movementY,
        });
      }
    };
    const finish = () => {
      const m = modeRef.current;
      if (!m) return;
      modeRef.current = null;
      try { document.exitPointerLock?.(); } catch (_) {}
      if (m === 'drag') ipcRenderer.send('frame:drag-end', { windowId });
      else if (m === 'panelMove') ipcRenderer.send('frame:move-end', { windowId });
      else if (m.resize) ipcRenderer.send('frame:resize-end', { windowId });
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
  }, [ipcRenderer, windowId]);

  // ---- Действия ----
  const send = (type, payload) => ipcRenderer.send('frame:event', { windowId, type, payload });
  const updateFrame = (patch) => send('update-frame', { patch });

  const onPanelDragStart = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    modeRef.current = 'panelMove';
    try {
      const p = document.body.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (_) {}
    ipcRenderer.send('frame:move-start', { windowId });
  }, [ipcRenderer, windowId]);

  const onPanelDoubleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    updateFrame({ x: null, y: null });
  }, []);

  const onWindowDragStart = useCallback((e) => {
    if (props.maximized || props.closing || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    modeRef.current = 'drag';
    try {
      const p = document.body.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (_) {}
    ipcRenderer.send('frame:drag-start', { windowId });
  }, [props.maximized, props.closing, ipcRenderer, windowId]);

  const beginResize = useCallback((dir) => (e) => {
    if (props.maximized || props.closing || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    modeRef.current = { resize: dir };
    try {
      const p = document.body.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (_) {}
    ipcRenderer.send('frame:resize-start', { windowId, direction: dir });
  }, [props.maximized, props.closing, ipcRenderer, windowId]);

  const onClose = () => { if (!props.closing) send('close', {}); };
  const onMinimize = () => { if (!props.closing) send('minimize', {}); };
  const onMaximize = () => { if (!props.closing) send('toggle-maximize', {}); };
  const onToggleMode = () => setMode((m) => (m === 'control' ? 'search' : 'control'));

  const onNavigateTo = (url) => {
    if (!url) return;
    try {
      if (!/^[a-z]+:/i.test(url)) url = 'https://' + url;
      location.href = url;
    } catch (_) {}
  };
  const onBack = () => { try { window.navigation?.back(); } catch (_) {} };
  const onForward = () => { try { window.navigation?.forward(); } catch (_) {} };
  const onReload = () => { try { location.reload(); } catch (_) {} };

  // ---- Размеры панели ----
  const scale = props.frameState?.panelScale ?? 1;
  const cell = BASE_CELL * scale;
  const gap = BASE_GAP * scale;
  const pad = BASE_PAD * scale;

  const panelW = cell * 5 + gap * 4 + pad * 2;
  const panelH = cell * 3 + gap * 2 + pad * 2;

  // ---- Позиция панели ----
  const defaultX = vp.w - panelW - EDGE_INSET;
  const defaultY = vp.h - panelH - EDGE_INSET;

  const rawX = props.frameState?.x ?? defaultX;
  const rawY = props.frameState?.y ?? defaultY;

  // Клемпим, чтобы панель не выходила за viewport
  const panelX = Math.max(0, Math.min(vp.w - panelW, rawX));
  const panelY = Math.max(0, Math.min(vp.h - panelH, rawY));

  // ---- Скрытие панели (по x) ----
  // Пока просто игнорируем — не реализовано до интеграции с taskbar.
  // Кнопка x в текущей итерации НЕ используется. См. Panel.jsx.

  return (
    <ThemeProvider theme={darkTheme}>
      <Panel
        x={panelX}
        y={panelY}
        width={'max-content'}
        height={panelH}
        cell={cell}
        gap={gap}
        pad={pad}
        mode={mode}
        scale={scale}
        title={props.title}
        icon={props.icon}
        isFocused={props.isFocused}
        maximized={props.maximized}
        closing={props.closing}
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
      />
    </ThemeProvider>
  );
}