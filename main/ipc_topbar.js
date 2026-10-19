import electronPkg from 'electron';
const { ipcMain, BrowserWindow, screen } = electronPkg;
import { spawn, exec, execFile } from 'child_process';
import { promisify } from 'util';
import { readFileSync, readlinkSync, existsSync } from 'fs';
import path from 'path';
import {
  listWindows,
  getWindowById,
  listDevTools,
  registerOwnWindow,
  unregisterOwnWindow,
} from './ipc_windowManager.js';
import {
  getNativeState,
  focusWindowById,
  closeWindowById,
  minimizeWindowById,
  maximizeWindowById,
} from './ipc_nativeWindows.js';
import { findAncestorWindowPid } from './ipc_pidTree.js';
import {
  openOverview, closeOverview, toggleOverview, isOverviewOpen,
} from './ipc_overview.js';

const execAsync = promisify(exec);

let cachedApps = [];
let windowSettingsWin = null;

/* ------------------------------------------------------------------ */
/* Topbar geometry                                                     */
/* ------------------------------------------------------------------ */

const TOPBAR_HEIGHT = 72;

function enforceTopbarGeometry() {
  const w = global.topbarWindow;
  if (!w || w.isDestroyed()) return;
  try {
    w.setMinimumSize(1, TOPBAR_HEIGHT);
    w.setMaximumSize(9999, TOPBAR_HEIGHT);
    const b = w.getBounds();
    if (b.height !== TOPBAR_HEIGHT) {
      w.setBounds({ x: b.x, y: b.y, width: b.width, height: TOPBAR_HEIGHT });
    }
  } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/* Init                                                                */
/* ------------------------------------------------------------------ */

export async function initTopbarState() {
  try {
    const mod = await import('./ipc_getAppsList.js');
    if (typeof mod.buildAppsList === 'function') {
      cachedApps = await mod.buildAppsList();
    }
  } catch (err) {
    console.error('[topbar] buildAppsList failed:', err.message);
  }
  enforceTopbarGeometry();
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function normalizeXid(x) {
  return x ? String(x).toLowerCase() : null;
}

function bridgeGtkXidFor(w) {
  if (!w || !w.isBridgeOverlay || !w.daemonWindowId) return null;
  const map = global.gtkBridgeXidMap;
  if (!map) return null;
  const xid = map.get(w.daemonWindowId);
  return xid ? normalizeXid(xid) : null;
}

// Ищем уже существующий bridge-overlay для данного XID native-окна.
function findOverlayForXid(xid) {
  const norm = normalizeXid(xid);
  if (!norm) return null;
  const list = listWindows();
  for (const w of list) {
    if (!w.isBridgeOverlay || !w.daemonWindowId) continue;
    const ovXid = bridgeGtkXidFor(w);
    if (ovXid && ovXid === norm) return w;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* /proc helpers — для перезапуска приложения с хуком                  */
/* ------------------------------------------------------------------ */

function readProcExe(pid) {
  try { return readlinkSync(`/proc/${pid}/exe`); }
  catch { return null; }
}

function readProcCmdline(pid) {
  try {
    const data = readFileSync(`/proc/${pid}/cmdline`, 'utf8');
    return data.split('\0').filter(Boolean);
  } catch { return null; }
}

function launchScriptPath() {
  const root = global.paths?.projectRoot;
  if (!root) return null;
  const p = path.join(root, 'gtk-bridge', 'launch.sh');
  return existsSync(p) ? p : null;
}

async function waitForProcessExit(pid, timeoutMs = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { process.kill(pid, 0); }
    catch { return true; }
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

// Перезапускает native-приложение с LD_PRELOAD через launch.sh.
// Возвращает { ok, error?, pid? }.
async function restartWithHook(windowId) {
  const data = getWindowData(windowId);
  if (!data) return { ok: false, error: 'window not found' };
  if (data.kind !== 'native') return { ok: false, error: 'not native window' };
  if (!data.pid) return { ok: false, error: 'no pid for window' };

  const exe = readProcExe(data.pid);
  if (!exe) return { ok: false, error: 'cannot read /proc/<pid>/exe' };

  const launcher = launchScriptPath();
  if (!launcher) return { ok: false, error: 'gtk-bridge/launch.sh not found' };

  console.log(`[overlay] restarting pid=${data.pid} (${exe}) via ${launcher}`);

  try { process.kill(data.pid, 'SIGTERM'); }
  catch (e) { console.warn('[overlay] kill failed:', e.message); }

  await waitForProcessExit(data.pid, 2000);
  await new Promise((r) => setTimeout(r, 300));

  try {
    const child = spawn(launcher, [exe], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env },
    });
    child.unref();
    return { ok: true, pid: child.pid };
  } catch (e) {
    console.error('[overlay] spawn failed:', e.message);
    return { ok: false, error: e.message };
  }
}

/* ------------------------------------------------------------------ */
/* Build state                                                         */
/* ------------------------------------------------------------------ */

function buildState() {
  const cfg = global.config?.topbar || {};
  const { windows: nativeWindows, activeXid } = getNativeState();
  const activeNorm = normalizeXid(activeXid);

  /* --- Electron BrowserWindow'ы --- */
  const ourWindows = listWindows().map((w) => {
    const xid = normalizeXid(w.xid);
    const b = w.bounds || {};
    return {
      id: w.id, xid, kind: 'our',
      title: w.title || '', icon: w.icon || null,
      maximized: !!w.maximized, minimized: !!w.minimized,
      isHidden: !!w.minimized,
      focused: !!(activeNorm && xid && xid === activeNorm),
      wmClass: null,
      x: b.x, y: b.y, width: b.width, height: b.height,
      isBridgeOverlay: !!w.isBridgeOverlay,
      daemonWindowId: w.daemonWindowId || null,
      gtkXid: bridgeGtkXidFor(w),
      isDevTools: false,
      ownerId: null,
      pid: null,
      parentXid: null,
      overlayWindowId: null,
    };
  });

  /* --- DevTools webContents --- */
  const devToolsWindows = [];
  try {
    for (const d of listDevTools()) {
      devToolsWindows.push({
        id: d.id, xid: null, kind: 'devtools',
        title: 'DevTools', icon: null,
        maximized: false, minimized: false,
        isHidden: false,
        focused: !!d.focused, wmClass: null,
        x: d.bounds?.x ?? 0, y: d.bounds?.y ?? 0,
        width: d.bounds?.width ?? 0, height: d.bounds?.height ?? 0,
        isBridgeOverlay: false, daemonWindowId: null, gtkXid: null,
        isDevTools: true, ownerId: d.ownerId || null,
        pid: null, parentXid: null,
        overlayWindowId: null,
      });
    }
  } catch (e) {
    console.warn('[topbar] listDevTools failed:', e.message);
  }

  /* --- Native X11 окна --- */
  const ourXids = new Set(ourWindows.map((w) => w.xid).filter(Boolean));

  const pidToXid = new Map();
  for (const w of nativeWindows) {
    const p = Number(w.pid);
    if (Number.isFinite(p) && p > 0) pidToXid.set(p, normalizeXid(w.id));
  }
  const knownPids = [...pidToXid.keys()];

  const native = nativeWindows
    .filter((w) => !ourXids.has(normalizeXid(w.id)))
    .map((w) => {
      const pidNum = Number(w.pid) || null;
      let parentXid = null;
      if (pidNum) {
        const ancestorPid = findAncestorWindowPid(pidNum, knownPids);
        if (ancestorPid) parentXid = pidToXid.get(ancestorPid) || null;
      }
      const normId = normalizeXid(w.id);

      // Ищем уже существующий bridge-overlay для этого окна
      const ov = findOverlayForXid(normId);

      return {
        id: w.id, xid: normId, kind: 'native',
        title: w.title || w.wmClass || 'Окно',
        icon: w.icon || null,
        maximized: !!w.isMaximized, minimized: !!w.isMinimized,
        isHidden: !!w.isMinimized,
        focused: !!(activeNorm && normId === activeNorm),
        wmClass: w.wmClass,
        x: w.x, y: w.y, width: w.width, height: w.height,
        isBridgeOverlay: false, daemonWindowId: null, gtkXid: null,
        isDevTools: false, ownerId: null,
        pid: pidNum, parentXid,
        overlayWindowId: ov ? ov.id : null,
      };
    });

  const allWindows = [...ourWindows, ...devToolsWindows, ...native];
  const windows = [
    ...allWindows.filter((w) => !w.isHidden),
    ...allWindows.filter((w) => w.isHidden),
  ];

  const activeWindow = windows.find((w) => w.focused) || null;

  return {
    windows, activeWindow, apps: cachedApps,
    overviewTabs: cfg.overviewTabs || [
      { id: 'apps-list', visible: true },
      { id: 'settings', visible: true },
    ],
    showWindowList: cfg.showWindowList ?? true,
    showClock: cfg.showClock ?? true,
    showClockMs: cfg.showClockMs ?? false,
    overviewOpen: isOverviewOpen(),
  };
}

export function broadcastTopbarState() {
  try {
    const w = global.topbarWindow;
    if (!w || w.isDestroyed()) return;
    w.webContents.send('topbar:state-update', buildState());
  } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/* Window settings — окно                                    */
/* ------------------------------------------------------------------ */

function settingsUrlFor(windowId) {
  const base = `file://${global.paths.distDir}/componentapps/window-settings/index.html`;
  const q = new URLSearchParams({ windowId });
  return `${base}?${q.toString()}`;
}

function openWindowSettings(windowId) {
  if (!windowId) return;

  if (windowSettingsWin && !windowSettingsWin.isDestroyed()) {
    windowSettingsWin.loadURL(settingsUrlFor(windowId));
    windowSettingsWin.focus();
    return;
  }

  const display = screen.getPrimaryDisplay();
  const wa = display.workAreaSize;
  const W = 320, H = 560;

  const win = new BrowserWindow({
    width: W, height: H,
    x: Math.max(0, wa.width - W - 20),
    y: 90,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    type: 'toolbar',
    show: false,
    hasShadow: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      transparent: true,
      backgroundColor: '#00000000',
    },
  });

  try { win.setAlwaysOnTop(true, 'screen-saver'); } catch { /* ignore */ }

  win.loadURL(settingsUrlFor(windowId));

  try {
    registerOwnWindow(win, '__window_settings__', {
      appId: 'window-settings',
      title: 'Window Settings',
      icon: null,
    });
  } catch { /* ignore */ }

  win.once('ready-to-show', () => {
    if (win.isDestroyed()) return;
    win.show();
    win.focus();
  });

  win.on('closed', () => {
    try { unregisterOwnWindow('__window_settings__'); } catch { /* ignore */ }
    windowSettingsWin = null;
  });

  windowSettingsWin = win;
}

/* ------------------------------------------------------------------ */
/* getWindowData — для окна настроек                                   */
/* ------------------------------------------------------------------ */

function getWindowData(id) {
  if (!id) return null;

  const ourList = listWindows();
  const ourWin = ourList.find((x) => x.id === id);
  if (ourWin) {
    const b = ourWin.bounds || {};
    return {
      id: ourWin.id, kind: 'our',
      title: ourWin.title, icon: ourWin.icon,
      xid: ourWin.xid, pid: null, wmClass: null,
      maximized: !!ourWin.maximized, minimized: !!ourWin.minimized,
      x: b.x, y: b.y, width: b.width, height: b.height,
      isBridgeOverlay: !!ourWin.isBridgeOverlay,
      daemonWindowId: ourWin.daemonWindowId || null,
      gtkXid: bridgeGtkXidFor(ourWin),
      ownerId: null,
      opacity: 1.0,
      overlayWindowId: null,
    };
  }

  if (String(id).startsWith('__devtools__:')) {
    const d = listDevTools().find((x) => x.id === id);
    if (d) {
      return {
        id: d.id, kind: 'devtools', title: 'DevTools', icon: null,
        xid: null, pid: null, wmClass: null,
        maximized: false, minimized: false,
        x: d.bounds?.x ?? 0, y: d.bounds?.y ?? 0,
        width: d.bounds?.width ?? 0, height: d.bounds?.height ?? 0,
        isBridgeOverlay: false, daemonWindowId: null, gtkXid: null,
        ownerId: d.ownerId || null, opacity: 1.0,
        overlayWindowId: null,
      };
    }
  }

  const { windows: nativeList } = getNativeState();
  const norm = normalizeXid(id);
  const native = nativeList.find((x) => normalizeXid(x.id) === norm);
  if (native) {
    const ov = findOverlayForXid(norm);
    return {
      id: native.id, kind: 'native',
      title: native.title || native.wmClass || 'Окно',
      icon: native.icon, xid: normalizeXid(native.id),
      pid: native.pid, wmClass: native.wmClass,
      maximized: !!native.isMaximized, minimized: !!native.isMinimized,
      x: native.x, y: native.y, width: native.width, height: native.height,
      isBridgeOverlay: false, daemonWindowId: null, gtkXid: null,
      ownerId: null, opacity: 1.0,
      overlayWindowId: ov ? ov.id : null,
    };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export default function () {
  global.topbarBroadcast = broadcastTopbarState;

  ipcMain.handle('topbar:get-state', () => buildState());

  /* --- Overview --- */
  ipcMain.on('topbar:toggle-overview', () => {
    try { toggleOverview(); } catch (e) { console.error('[topbar:toggle-overview]', e?.message || e); }
  });
  ipcMain.on('topbar:open-overview', () => {
    try { openOverview(); } catch (e) { console.error('[topbar:open-overview]', e?.message || e); }
  });
  ipcMain.on('topbar:close-overview', () => {
    try { closeOverview(); } catch (e) { console.error('[topbar:close-overview]', e?.message || e); }
  });

  /* --- Управление окнами --- */
  ipcMain.on('topbar:focus-window', (_e, { id }) => {
    focusWindowById(id).catch((e) => console.error('[topbar:focus-window]', e?.message || e));
  });
  ipcMain.on('topbar:close-window', (_e, { id }) => {
    closeWindowById(id).catch((e) => console.error('[topbar:close-window]', e?.message || e));
  });
  ipcMain.on('topbar:minimize-window', (_e, { id }) => {
    minimizeWindowById(id).catch((e) => console.error('[topbar:minimize-window]', e?.message || e));
  });
  ipcMain.on('topbar:maximize-window', (_e, { id, maximized }) => {
    maximizeWindowById(id, maximized).catch((e) => console.error('[topbar:maximize-window]', e?.message || e));
  });

  ipcMain.on('topbar:open-devtools', (_e, { id }) => {
    if (!id) return;
    const win = getWindowById(id);
    if (!win) return;
    win.webContents.openDevTools({ mode: 'detach' });
  });

  /* --- Window settings --- */
  ipcMain.on('topbar:open-window-settings', (_e, { id }) => {
    try { openWindowSettings(id); }
    catch (e) { console.error('[topbar:open-window-settings]', e?.message || e); }
  });

  ipcMain.handle('window-settings:get', (_e, { id }) => getWindowData(id));

  ipcMain.on('window-settings:set-opacity', async (_e, { id, opacity }) => {
    if (!id || typeof opacity !== 'number') return;
    try {
      const { setWindowOpacityById } = await import('./ipc_nativeWindows.js');
      await setWindowOpacityById(id, opacity);
    } catch (e) {
      console.error('[window-settings:set-opacity]', e?.message || e);
    }
  });

  /* --- Bridge overlay --- */
  // Если overlay уже есть — фокус на него.
  // Если нет — перезапуск приложения через launch.sh с хуком.
  ipcMain.on('topbar:open-overlay', async (_e, { id }) => {
    try {
      const norm = normalizeXid(id);
      if (!norm) return;

      const overlay = findOverlayForXid(norm);
      if (overlay) {
        console.log('[overlay] already exists for', norm, '-> focus');
        focusWindowById(overlay.id).catch(() => {});
        return;
      }

      const res = await restartWithHook(id);
      if (!res.ok) console.warn('[overlay] restart failed:', res.error);
    } catch (e) {
      console.error('[topbar:open-overlay]', e?.message || e);
    }
  });

  /* --- Прочее --- */
  ipcMain.on('topbar:launch-app', (_e, { app }) => {
    console.log('[topbar] launch', app);
  });

  ipcMain.on('topbar:open-search', async () => {
    try {
      try { await execAsync('qdbus org.kde.krunner /App display'); }
      catch { spawn('krunner', [], { detached: true, stdio: 'ignore' }).unref(); }
    } catch (err) {
      console.error('[topbar:open-search]', err.message);
    }
  });

  ipcMain.on('topbar:open-settings', () => {
    try { spawn('systemsettings', [], { detached: true, stdio: 'ignore' }).unref(); }
    catch (err) { console.error('[topbar:open-settings]', err.message); }
  });

  ipcMain.on('topbar:logout', () => {
    try { exec('qdbus6 org.kde.LogoutPrompt /LogoutPrompt org.kde.LogoutPrompt.promptAll')}
    catch (err) { console.error('[topbar:logout]', err.message); }
  });

  ipcMain.handle('topbar:get-window-bounds', (_e, { id }) => {
    const win = getWindowById(id);
    return win ? win.getBounds() : null;
  });

  setTimeout(() => { initTopbarState(); }, 0);
}