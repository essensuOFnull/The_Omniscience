import electronPkg from 'electron';
const { BrowserWindow, ipcMain, screen, webContents } = electronPkg;
import { pathToFileURL } from 'url';
import path from 'path';
import { attachToWebContents } from './ipc_browserContextMenu.js';

/* ------------------------------------------------------------------ */
/* Реестр окон                                                         */
/* ------------------------------------------------------------------ */

const windows = new Map();   // appId → { win, meta }

function xidToHex(xid) {
  return '0x' + (xid >>> 0).toString(16).padStart(8, '0').toLowerCase();
}

function getXid(win) {
  try {
    const h = win.getNativeWindowHandle();
    if (h && h.length >= 4) {
      return xidToHex(h.readUInt32LE(0));
    }
  } catch { /* ignore */ }
  return null;
}

function send(channel, data) {
  if (!global.mainWindow || global.mainWindow.isDestroyed()) return;
  global.mainWindow.webContents.send(channel, data);
}

function getShellSession() {
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    return global.mainWindow.webContents.session;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* URL resolver                                                        */
/* ------------------------------------------------------------------ */

function resolveAppUrl(url) {
  if (!url) return 'about:blank';
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  if (path.isAbsolute(url)) {
    try { return pathToFileURL(url).href; } catch { return url; }
  }
  const firstSlash = url.indexOf('/');
  const firstPart = firstSlash === -1 ? url : url.slice(0, firstSlash);
  if (firstPart.includes('.')) return 'https://' + url;
  try {
    const abs = path.join(global.paths.distDir, url);
    return pathToFileURL(abs).href;
  } catch {
    return url;
  }
}

function buildFinalUrl(rawUrl, { id, desktopId, extra }) {
  const resolved = resolveAppUrl(rawUrl);
  if (resolved.startsWith('file://') && id) {
    try {
      const u = new URL(resolved);
      u.searchParams.set('windowId', id);
      if (desktopId) u.searchParams.set('desktopId', desktopId);
      if (extra && typeof extra === 'object') {
        for (const [k, v] of Object.entries(extra)) {
          if (v == null) continue;
          u.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v));
        }
      }
      return u.href;
    } catch { return resolved; }
  }
  return resolved;
}

/* ------------------------------------------------------------------ */
/* Публичное API                                                       */
/* ------------------------------------------------------------------ */

export function getWindowById(id) {
  return windows.get(id)?.win || null;
}

export function getXidForWindow(id) {
  const entry = windows.get(id);
  if (!entry) return null;
  if (entry.meta.xid) return entry.meta.xid;
  try {
    const xid = getXid(entry.win);
    entry.meta.xid = xid;
    return xid;
  } catch { return null; }
}

export function listWindows() {
  return Array.from(windows.entries())
    .filter(([, entry]) => !entry.meta.isShell)
    .map(([id, entry]) => ({
      id,
      appId: entry.meta.appId,
      url: entry.win.webContents.getURL(),
      title: entry.win.getTitle() || entry.meta.title || '',
      icon: entry.meta.icon || null,
      minimized: entry.win.isMinimized(),
      maximized: entry.win.isMaximized(),
      focused: entry.win.isFocused(),
      bounds: entry.win.getBounds(),
      xid: entry.meta.xid,
      isBridgeOverlay: !!entry.meta.isBridgeOverlay,
      daemonWindowId: entry.meta.daemonWindowId || null,
    }));
}

/* ------------------------------------------------------------------ */
/* События окна                                                        */
/* ------------------------------------------------------------------ */

function attachWindowEvents(id, win) {
  const emit = (type, extra = {}) => {
    send('shell:window-event', { id, type, ...extra });
    global.topbarBroadcast?.();
  };

  // Отправляет renderer'у актуальное состояние окна.
  // Preload слушает 'window-state-changed' через electron_mainWindow_API.onWindowStateChange.
  const sendState = () => {
    if (win.isDestroyed()) return;
    try {
      win.webContents.send('window-state-changed', {
        maximized: win.isMaximized(),
        minimized: win.isMinimized(),
        fullscreen: win.isFullScreen(),
      });
    } catch { /* webContents мог быть destroyed */ }
  };

  win.on('focus', () => {
    global.__focusedWindowId = id;
    const entry = windows.get(id);
    if (entry && !entry.meta.xid) entry.meta.xid = getXid(win);
    global.topbarBroadcast?.();
    emit('focus');
  });
  win.on('blur', () => emit('blur'));
  win.on('minimize', () => { sendState(); emit('minimize'); });
  win.on('restore',  () => { sendState(); emit('restore'); });
  win.on('maximize', () => { sendState(); emit('maximize'); });
  win.on('unmaximize', () => { sendState(); emit('unmaximize'); });
  win.on('enter-full-screen', sendState);
  win.on('leave-full-screen', sendState);
  win.on('move', () => emit('moved', { bounds: win.getBounds() }));
  win.on('resize', () => emit('resized', { bounds: win.getBounds() }));

  win.webContents.on('page-title-updated', (_e, title) => {
    emit('title-changed', { title });
  });
  win.webContents.on('did-navigate', (_e, url) => emit('navigated', { url }));
  win.webContents.on('did-navigate-in-page', (_e, url) => emit('navigated', { url }));
  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error(`[windowManager] load failed for "${id}": ${code} ${desc} (${url})`);
  });

  // После загрузки renderer'а шлём начальное состояние — чтобы UI сразу
  // знал, развёрнуто ли окно, свёрнуто ли.
  win.webContents.on('did-finish-load', sendState);

  win.on('closed', () => {
    windows.delete(id);
    emit('closed');
  });
}

/* ------------------------------------------------------------------ */
/* Создание окна                                                       */
/* ------------------------------------------------------------------ */

export function createWindowByRequest({
  id, appId, url, preload, title, icon,
  bounds, maximized = false, desktopId,
  extra = null,
}) {
  const existing = windows.get(id);
  if (existing) {
    existing.win.focus();
    return existing.win;
  }

  const display = screen.getPrimaryDisplay();
  const workArea = display.workAreaSize;

  const b = bounds && bounds.width && bounds.height
    ? bounds
    : {
      x: Math.round((workArea.width - 900) / 2),
      y: Math.round((workArea.height - 600) / 2),
      width: 900,
      height: 600,
    };

  const session = getShellSession();
  const finalUrl = buildFinalUrl(url, { id, desktopId, extra });

  const win = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height,
    minWidth: 200, minHeight: 120,
    title: title || 'Omniscience',
    icon: global.paths.icon,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: true,
    show: false,
    skipTaskbar: false,
    webPreferences: {
      preload: preload || undefined,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      webviewTag: true,
      transparent: true,
      backgroundColor: '#00000000',
    },
  });

  win.setBackgroundColor('#00000000');

  try { attachToWebContents(win.webContents); } catch { /* ignore */ }

  try {
    win.webContents.setWindowOpenHandler(({ url: openUrl, disposition }) => {
      send('shell:open-window-request', {
        sourceWindowId: id,
        url: openUrl,
        disposition,
      });
      return { action: 'deny' };
    });
  } catch { /* ignore */ }

  win.loadURL(finalUrl);

  windows.set(id, {
    win,
    meta: { appId, icon, title, url: finalUrl, preload, xid: null },
  });

  win.once('ready-to-show', () => {
    const entry = windows.get(id);
    if (entry && !entry.meta.xid) {
      entry.meta.xid = getXid(win);
      global.topbarBroadcast?.();
    }
    if (maximized) win.maximize();
    win.show();
    send('shell:window-event', { id, type: 'ready' });
  });

  attachWindowEvents(id, win);

  send('shell:window-event', {
    id, type: 'created', appId, url: finalUrl, title, icon,
    bounds: win.getBounds(),
  });

  global.topbarBroadcast?.();

  return win;
}

export function destroyWindowById(id) {
  const entry = windows.get(id);
  if (!entry) return;
  try { entry.win.close(); } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/* IPC                                                                 */
/* ------------------------------------------------------------------ */

// Находит окно, из которого пришёл IPC. Для «своих» окон (не shell),
// которые шлют window_close / window_minimize / window_maximize из preload.
function getSenderWindow(event) {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win && !win.isDestroyed() ? win : null;
  } catch { return null; }
}

export default function () {
  ipcMain.on('window:create', (_e, req) => {
    try { createWindowByRequest(req || {}); }
    catch (err) { console.error('[windowManager] create failed:', err); }
  });

  ipcMain.on('window:focus', (_e, { id }) => {
    const entry = windows.get(id);
    if (!entry) return;
    if (entry.win.isMinimized()) entry.win.restore();
    entry.win.focus();
  });

  ipcMain.handle('window:minimize', (_e, { id }) => {
    const win = windows.get(id)?.win;
    if (!win) return { ok: false };
    win.minimize();
    return { ok: true };
  });

  ipcMain.handle('window:maximize', (_e, { id }) => {
    const win = windows.get(id)?.win;
    if (!win) return { ok: false };
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    return { ok: true };
  });

  ipcMain.handle('window:unmaximize', (_e, { id }) => {
    const win = windows.get(id)?.win;
    if (!win) return { ok: false };
    win.unmaximize();
    return { ok: true };
  });

  ipcMain.handle('window:close', (_e, { id }) => {
    destroyWindowById(id);
    return { ok: true };
  });

  ipcMain.on('window:minimize', (_e, { id }) => {
    windows.get(id)?.win.minimize();
  });

  ipcMain.on('window:maximize', (_e, { id }) => {
    const win = windows.get(id)?.win;
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });

  ipcMain.on('window:unmaximize', (_e, { id }) => {
    windows.get(id)?.win.unmaximize();
  });

  ipcMain.on('window:close', (_e, { id }) => destroyWindowById(id));

  ipcMain.on('window:set-bounds', (_e, { id, bounds }) => {
    const win = windows.get(id)?.win;
    if (!win || !bounds) return;
    win.setBounds({
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    });
  });

  ipcMain.handle('window:list', () => listWindows());

  ipcMain.handle('window:get-bounds', (_e, { id }) => {
    const win = windows.get(id)?.win;
    return win ? win.getBounds() : null;
  });

  ipcMain.on('window:load-url', (_e, { id, url }) => {
    const win = windows.get(id)?.win;
    if (win && url) win.loadURL(url);
  });

  ipcMain.on('window:go-back', (_e, { id }) => {
    const wc = windows.get(id)?.win?.webContents;
    if (wc?.canGoBack?.()) wc.goBack();
  });

  ipcMain.on('window:go-forward', (_e, { id }) => {
    const wc = windows.get(id)?.win?.webContents;
    if (wc?.canGoForward?.()) wc.goForward();
  });

  ipcMain.on('window:reload', (_e, { id }) => {
    const wc = windows.get(id)?.win?.webContents;
    if (wc) wc.reload();
  });

  ipcMain.handle('window:get-nav-state', (_e, { id }) => {
    const win = windows.get(id)?.win;
    if (!win) return null;
    const wc = win.webContents;
    return {
      url: wc.getURL(),
      title: wc.getTitle(),
      canGoBack: wc.navigationHistory.canGoBack(),
      canGoForward: wc.navigationHistory.canGoForward(),
      loading: wc.isLoading(),
    };
  });

  /* ───────────────────────────────────────────────────────────────
   * Каналы для «своих» окон (window_close, window_minimize, ...)
   *
   * Preload этих окон (electron_mainWindow_API) шлёт именно так —
   * с подчёркиваниями, без id. Окно определяется по отправителю.
   * ─────────────────────────────────────────────────────────────── */

  ipcMain.on('window_close', (event) => {
    const win = getSenderWindow(event);
    if (win) win.close();
  });

  ipcMain.on('window_minimize', (event) => {
    const win = getSenderWindow(event);
    if (win) win.minimize();
  });

  ipcMain.on('window_maximize', (event) => {
    const win = getSenderWindow(event);
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });

  ipcMain.on('window_restore', (event) => {
    const win = getSenderWindow(event);
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
}

/* ------------------------------------------------------------------ */
/* Shell-окна (Overview, TopBar и т.п.)                                */
/* ------------------------------------------------------------------ */

export function registerShellWindow(win, id, meta = {}) {
  if (!id || !win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) {
    return false;
  }
  windows.set(id, {
    win,
    meta: {
      appId: id,
      title: meta.title || id,
      icon: meta.icon || null,
      isShell: true,
      xid: getXid(win),
      ...meta,
    },
  });
  return true;
}

export function unregisterShellWindow(id) {
  if (!id) return;
  windows.delete(id);
}

export function isShellWindow(id) {
  return !!windows.get(id)?.meta?.isShell;
}

/* ------------------------------------------------------------------ */
/* Bridge-оверлеи (gtk-bridge)                                         */
/* ------------------------------------------------------------------ */

export function registerBridgeOverlay(win, id, meta = {}) {
  if (!id || !win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) {
    return false;
  }
  windows.set(id, {
    win,
    meta: {
      appId: 'gtk-bridge',
      title: meta.title || id,
      icon: meta.icon || null,
      xid: getXid(win),
      isBridgeOverlay: true,
      daemonWindowId: meta.daemonWindowId || null,
      ...meta,
    },
  });
  return true;
}

export function unregisterBridgeOverlay(id) {
  if (!id) return;
  windows.delete(id);
}

/* ------------------------------------------------------------------ */
/* Наши обычные окна (window-settings и подобные)                      */
/* ------------------------------------------------------------------ */

export function registerOwnWindow(win, id, meta = {}) {
  if (!id || !win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) {
    return false;
  }
  windows.set(id, {
    win,
    meta: {
      appId: meta.appId || 'app',
      title: meta.title || id,
      icon: meta.icon || null,
      xid: getXid(win),
      ...meta,
    },
  });
  return true;
}

export function unregisterOwnWindow(id) {
  if (!id) return;
  windows.delete(id);
}

/* ------------------------------------------------------------------ */
/* DevTools webContents — не BrowserWindow, но полноценные окна        */
/* ------------------------------------------------------------------ */

export function listDevTools() {
  const out = [];
  try {
    for (const wc of webContents.getAllWebContents()) {
      try {
        if (wc.getType() !== 'devtools') continue;
        if (wc.isDestroyed()) continue;

        const owner = wc.getOwnerBrowserWindow?.();
        if (!owner || owner.isDestroyed()) continue;

        let ownerId = null;
        for (const [id, entry] of windows) {
          if (entry.win === owner) { ownerId = id; break; }
        }
        if (!ownerId) continue;

        out.push({
          id: '__devtools__:' + wc.id,
          ownerId,
          title: 'DevTools',
          webContentsId: wc.id,
          focused: wc.isFocused?.() || false,
          bounds: wc.getBounds?.() || null,
        });
      } catch { /* ignore individual */ }
    }
  } catch { /* ignore */ }
  return out;
}