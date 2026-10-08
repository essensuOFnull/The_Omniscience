import electronPkg from 'electron';
const { ipcMain } = electronPkg;
import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';
import { listWindows, getWindowById } from './ipc_windowManager.js';
import {
  getNativeState,
  focusWindowById,
  closeWindowById,
  minimizeWindowById,
  maximizeWindowById,
} from './ipc_nativeWindows.js';
import { openOverview, closeOverview, toggleOverview, isOverviewOpen } from './ipc_overview.js';

const execAsync = promisify(exec);

let cachedApps = [];

/* ------------------------------------------------------------------ */
/* Фиксация высоты TopBar'а в 72px                                     */
/* ------------------------------------------------------------------ */

const TOPBAR_HEIGHT = 72;

function enforceTopbarGeometry() {
  const w = global.topbarWindow;
  if (!w || w.isDestroyed()) return;
  try {
    // Жёсткие границы по высоте: min=72, max=72. Ширина — свободная (1..9999).
    w.setMinimumSize(1, TOPBAR_HEIGHT);
    w.setMaximumSize(9999, TOPBAR_HEIGHT);

    const b = w.getBounds();
    if (b.height !== TOPBAR_HEIGHT) {
      w.setBounds({ x: b.x, y: b.y, width: b.width, height: TOPBAR_HEIGHT });
    }
  } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/* Инициализация                                                       */
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
/* Сборка состояния                                                    */
/* ------------------------------------------------------------------ */

function normalizeXid(x) {
  return x ? String(x).toLowerCase() : null;
}

function buildState() {
  const cfg = global.config?.topbar || {};
  const { windows: nativeWindows, activeXid } = getNativeState();
  const activeNorm = normalizeXid(activeXid);

  const ourWindows = listWindows().map((w) => {
    const xid = normalizeXid(w.xid);
    const b = w.bounds || {};
    return {
      id: w.id,
      xid,
      kind: 'our',
      title: w.title || '',
      icon: w.icon || null,
      maximized: !!w.maximized,
      minimized: !!w.minimized,
      focused: !!(activeNorm && xid && xid === activeNorm),
      wmClass: null,
      x: b.x, y: b.y, width: b.width, height: b.height,
    };
  });

  const ourXids = new Set(ourWindows.map((w) => w.xid).filter(Boolean));

  const native = nativeWindows
    .filter((w) => !ourXids.has(normalizeXid(w.id)))
    .map((w) => ({
      id: w.id,
      xid: w.id,
      kind: 'native',
      title: w.title || w.wmClass || 'Окно',
      icon: w.icon || null,
      maximized: !!w.isMaximized,
      minimized: !!w.isMinimized,
      focused: !!(activeNorm && normalizeXid(w.id) === activeNorm),
      wmClass: w.wmClass,
      x: w.x, y: w.y, width: w.width, height: w.height,
    }));

  const windows = [...ourWindows, ...native];
  const activeWindow = windows.find((w) => w.focused) || null;

  return {
    windows,
    activeWindow,
    apps: cachedApps,
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
/* Модуль                                                              */
/* ------------------------------------------------------------------ */

export default function () {
  global.topbarBroadcast = broadcastTopbarState;

  ipcMain.handle('topbar:get-state', () => buildState());

  /* -------- Overview toggle -------- */

  ipcMain.on('topbar:toggle-overview', () => {
    try { toggleOverview(); } catch (e) {
      console.error('[topbar:toggle-overview]', e?.message || e);
    }
  });

  ipcMain.on('topbar:open-overview', () => {
    try { openOverview(); } catch (e) {
      console.error('[topbar:open-overview]', e?.message || e);
    }
  });

  ipcMain.on('topbar:close-overview', () => {
    try { closeOverview(); } catch (e) {
      console.error('[topbar:close-overview]', e?.message || e);
    }
  });

  /* -------- Управление окнами -------- */

  ipcMain.on('topbar:focus-window', (_e, { id }) => {
    focusWindowById(id).catch((e) =>
      console.error('[topbar:focus-window]', e?.message || e));
  });

  ipcMain.on('topbar:close-window', (_e, { id }) => {
    closeWindowById(id).catch((e) =>
      console.error('[topbar:close-window]', e?.message || e));
  });

  ipcMain.on('topbar:minimize-window', (_e, { id }) => {
    minimizeWindowById(id).catch((e) =>
      console.error('[topbar:minimize-window]', e?.message || e));
  });

  ipcMain.on('topbar:maximize-window', (_e, { id, maximized }) => {
    maximizeWindowById(id, maximized).catch((e) =>
      console.error('[topbar:maximize-window]', e?.message || e));
  });

  ipcMain.on('topbar:open-devtools', (_e, { id }) => {
    if (!id) return;
    const win = getWindowById(id);
    if (!win) return;
    win.webContents.openDevTools({ mode: 'detach' });
  });

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

  ipcMain.handle('topbar:get-window-bounds', (_e, { id }) => {
    const win = getWindowById(id);
    return win ? win.getBounds() : null;
  });

  setTimeout(() => { initTopbarState(); }, 0);
}