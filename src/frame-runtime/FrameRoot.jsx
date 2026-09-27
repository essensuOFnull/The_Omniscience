import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TitleBar from './TitleBar.jsx';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#a855f7' },
    background: { paper: '#2a002a', default: 'transparent' },
    text: { primary: '#fff', secondary: 'rgba(255,255,255,0.7)' },
  },
});

export default function FrameRoot({ ctx }) {
  const { windowId, ipcRenderer } = ctx;
  const hostRef = useRef(null);

  const [props, setProps] = useState({
    title: document.title || 'Окно',
    icon: null,
    isFocused: false,
    maximized: false,
    closing: false,
  });

  const [browserMode, setBrowserMode] = useState(false);
  const [navState, setNavState] = useState({
    currentUrl: location.href,
    canGoBack: false,
    canGoForward: false,
    loading: false,
  });

  // ---------- Padding на html под высоту нашей панели ----------
  useEffect(() => {
    const el = document.getElementById('__omniscience_frame_host__');
    if (!el) return;
    hostRef.current = el;

    const update = () => {
      const h = el.offsetHeight;
      document.documentElement.style.setProperty('padding-top', h + 'px', 'important');
    };
    const obs = new ResizeObserver(update);
    obs.observe(el);
    update();
    return () => obs.disconnect();
  }, [browserMode]);

  // ---------- Props от shell ----------
  useEffect(() => {
    const handler = (_e, data) => setProps((p) => ({ ...p, ...(data || {}) }));
    ipcRenderer.on('frame:props', handler);
    return () => ipcRenderer.removeListener('frame:props', handler);
  }, [ipcRenderer]);

  // ---------- Навигационное состояние ----------
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
    update();
    window.navigation?.addEventListener('navigatesuccess', update);
    window.navigation?.addEventListener('navigate', update);
    window.addEventListener('popstate', update);
    window.addEventListener('hashchange', update);
    return () => {
      window.navigation?.removeEventListener('navigatesuccess', update);
      window.navigation?.removeEventListener('navigate', update);
      window.removeEventListener('popstate', update);
      window.removeEventListener('hashchange', update);
    };
  }, []);

  // ---------- Title ----------
  useEffect(() => {
    const update = () => setProps((p) => ({ ...p, title: document.title || p.title }));
    const titleEl = document.querySelector('title');
    if (!titleEl) return;
    const obs = new MutationObserver(update);
    obs.observe(titleEl, { childList: true, characterData: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  // ---------- Drag / Resize (pointer lock) ----------
  const modeRef = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      if (!document.pointerLockElement || !modeRef.current) return;
      const m = modeRef.current;
      if (m === 'drag') {
        ipcRenderer.send('frame:drag-delta', { windowId, dx: e.movementX, dy: e.movementY });
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

  const beginDrag = useCallback((e) => {
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

  // ---------- Действия ----------
  const send = (type, payload) => ipcRenderer.send('frame:event', { windowId, type, payload });

  const onClose = () => { if (!props.closing) send('close', {}); };
  const onMinimize = () => { if (!props.closing) send('minimize', {}); };
  const onMaximize = () => { if (!props.closing) send('toggle-maximize', {}); };
  const onToggleBrowser = () => setBrowserMode((v) => !v);

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

  return (
    <ThemeProvider theme={darkTheme}>
      <TitleBar
        title={props.title}
        icon={props.icon}
        browserMode={browserMode}
        maximized={props.maximized}
        closing={props.closing}
        isFocused={props.isFocused}
        onMouseDown={beginDrag}
        onDoubleClick={onMaximize}
        onToggleBrowser={onToggleBrowser}
        onMinimize={onMinimize}
        onMaximize={onMaximize}
        onClose={onClose}
        // AddressBar
        currentUrl={navState.currentUrl}
        canGoBack={navState.canGoBack}
        canGoForward={navState.canGoForward}
        loading={navState.loading}
        onNavigateTo={onNavigateTo}
        onBack={onBack}
        onForward={onForward}
        onReload={onReload}
      />

      {!props.maximized && !props.closing && (
        <>
          <div onMouseDown={beginResize('n')}  style={rz('n')} />
          <div onMouseDown={beginResize('s')}  style={rz('s')} />
          <div onMouseDown={beginResize('w')}  style={rz('w')} />
          <div onMouseDown={beginResize('e')}  style={rz('e')} />
          <div onMouseDown={beginResize('nw')} style={rz('nw')} />
          <div onMouseDown={beginResize('ne')} style={rz('ne')} />
          <div onMouseDown={beginResize('sw')} style={rz('sw')} />
          <div onMouseDown={beginResize('se')} style={rz('se')} />
        </>
      )}
    </ThemeProvider>
  );
}

const EDGE = 6;
function rz(dir) {
  const base = { position: 'fixed', pointerEvents: 'auto', zIndex: 2147483646 };
  const cursors = {
    n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
    nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize',
  };
  const c = { cursor: cursors[dir] };
  // Учитываем высоту титульника (36) + AddressBar (40, если открыт) в top-ручках.
  // Пока фиксируем 36, потому что AddressBar влияет на верх — уточним позже.
  const top = 36;
  if (dir === 'n')  return { ...base, ...c, top: 0, left: 0, right: 0, height: EDGE };
  if (dir === 's')  return { ...base, ...c, bottom: 0, left: 0, right: 0, height: EDGE };
  if (dir === 'w')  return { ...base, ...c, top, bottom: 0, left: 0, width: EDGE };
  if (dir === 'e')  return { ...base, ...c, top, bottom: 0, right: 0, width: EDGE };
  if (dir === 'nw') return { ...base, ...c, top: 0, left: 0, width: EDGE, height: EDGE };
  if (dir === 'ne') return { ...base, ...c, top: 0, right: 0, width: EDGE, height: EDGE };
  if (dir === 'sw') return { ...base, ...c, bottom: 0, left: 0, width: EDGE, height: EDGE };
  if (dir === 'se') return { ...base, ...c, bottom: 0, right: 0, width: EDGE, height: EDGE };
  return base;
}