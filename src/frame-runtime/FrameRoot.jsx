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

const BASE_CELL = 28;
const BASE_GAP = 1;
const BASE_PAD = 4;
const EDGE_INSET = 16;
const COL_MULT = 5.3; // 1 + 1 + 1.3 + 1 + 1

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

  // 👇 ЛОКАЛЬНАЯ позиция панели. null = "использовать дефолт".
  const [panelPos, setPanelPos] = useState({ x: null, y: null });

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

  // ---- Размеры панели ----
  const scale = props.frameState?.panelScale ?? 1;
  const cell = BASE_CELL * scale;
  const gap = BASE_GAP * scale;
  const pad = BASE_PAD * scale;

  const panelW = cell * COL_MULT + gap * 4 + pad * 2;
  const panelH = cell * 3 + gap * 2 + pad * 2;

  const defaultX = vp.w - panelW - EDGE_INSET;
  const defaultY = vp.h - panelH - EDGE_INSET;

  const rawX = panelPos.x ?? defaultX;
  const rawY = panelPos.y ?? defaultY;

  // Клампим внутри viewport, чтобы панель не улетела за края
  const panelX = Math.max(0, Math.min(vp.w - panelW, rawX));
  const panelY = Math.max(0, Math.min(vp.h - panelH, rawY));

  // ---- Pointer lock: window drag / window resize / panel move ----
  const modeRef = useRef(null);
  const panelDragRef = useRef({ startX: 0, startY: 0 });

  useEffect(() => {
    const onMove = (e) => {
      if (!document.pointerLockElement || !modeRef.current) return;
      const m = modeRef.current;

      if (m === 'drag') {
        ipcRenderer.send('frame:drag-delta', { windowId, dx: e.movementX, dy: e.movementY });
      } else if (m === 'panelMove') {
        // 👇 Локально, без IPC
        const next = {
          x: panelDragRef.current.startX + e.movementX,
          y: panelDragRef.current.startY + e.movementY,
        };
        panelDragRef.current.startX = next.x;
        panelDragRef.current.startY = next.y;
        setPanelPos(next);
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
      else if (m.resize) ipcRenderer.send('frame:resize-end', { windowId });
      // panelMove — нечего завершать, локально
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
  const send = useCallback((type, payload) => {
    ipcRenderer.send('frame:event', { windowId, type, payload });
  }, [ipcRenderer, windowId]);

  // ---- Обработчики панели ----
  const onPanelDragStart = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    modeRef.current = 'panelMove';
    panelDragRef.current.startX = panelX;
    panelDragRef.current.startY = panelY;
    try {
      const p = document.body.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (_) {}
  }, [panelX, panelY]);

  const onPanelDoubleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Локальный сброс в дефолтный угол
    setPanelPos({ x: null, y: null });
  }, []);

  // ---- Обработчики окна ----
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

  const onClose = useCallback(() => { if (!props.closing) send('close', {}); }, [props.closing, send]);
  const onMinimize = useCallback(() => { if (!props.closing) send('minimize', {}); }, [props.closing, send]);
  const onMaximize = useCallback(() => { if (!props.closing) send('toggle-maximize', {}); }, [props.closing, send]);
  const onToggleMode = useCallback(() => {
    setMode((m) => (m === 'control' ? 'search' : 'control'));
  }, []);

  const onNavigateTo = useCallback((url) => {
    if (!url) return;
    try {
      if (!/^[a-z]+:/i.test(url)) url = 'https://' + url;
      location.href = url;
    } catch (_) {}
  }, []);
  const onBack = useCallback(() => { try { window.navigation?.back(); } catch (_) {} }, []);
  const onForward = useCallback(() => { try { window.navigation?.forward(); } catch (_) {} }, []);
  const onReload = useCallback(() => { try { location.reload(); } catch (_) {} }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <Panel
        x={panelX}
        y={panelY}
        width={panelW}
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