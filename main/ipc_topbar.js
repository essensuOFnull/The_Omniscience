import electronPkg from 'electron';
const { ipcMain } = electronPkg;
import { listWindows, destroyWindowById, getWindowById } from './ipc_windowManager.js';

let focusedWindowId = null;
let cachedApps = [];

// Вызывается один раз при старте, после mainWindow_create
export async function initTopbarState() {
  try {
    const mod = await import('./ipc_getAppsList.js');
    if (typeof mod.buildAppsList === 'function') {
      cachedApps = await mod.buildAppsList();
    }
  } catch (err) {
    console.error('[topbar] buildAppsList failed:', err.message);
  }
}

function buildState() {
  const cfg = global.config?.topbar || {};
  return {
    quickLaunch:    cfg.quickLaunch    || [],
    windows:        listWindows().map((w) => ({ ...w, focused: w.id === focusedWindowId })),
    apps:           cachedApps,
    overviewTabs:   cfg.overviewTabs   || [{ id: 'settings', visible: true }],
    showWindowList: cfg.showWindowList ?? true,
    showClock:      cfg.showClock      ?? true,
    showClockMs:    cfg.showClockMs    ?? false,
    mode:           cfg.__mode         || 'normal',
  };
}

export function broadcastTopbarState() {
  const w = global.topbarWindow;
  if (!w || w.isDestroyed()) return;
  w.webContents.send('topbar:state-update', buildState());
}

export default function () {
  global.topbarBroadcast = broadcastTopbarState;

  ipcMain.handle('topbar:get-state', () => buildState());

  ipcMain.on('topbar:set-mode', (_e, { mode }) => {
    global.config.topbar = global.config.topbar || {};
    global.config.topbar.__mode = mode;
    broadcastTopbarState();
  });

  ipcMain.on('topbar:focus-window', (_e, { id }) => {
    const win = getWindowById(id);
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
    focusedWindowId = id;
    broadcastTopbarState();
  });

  ipcMain.on('topbar:close-window', (_e, { id }) => destroyWindowById(id));

  ipcMain.on('topbar:open-devtools', (_e, { id }) => {
    const targetId = id || focusedWindowId;
    if (!targetId) return;
    const win = getWindowById(targetId);
    if (!win) return;
    win.webContents.openDevTools({ mode: 'detach' });
  });

  ipcMain.on('topbar:launch-app', (_e, { app }) => {
    console.log('[topbar] launch', app);
    // TODO: native → launch-native-app; componentapp → createWindowByRequest
  });

  ipcMain.on('topbar:open-launcher', () => { /* TODO */ });
  ipcMain.on('topbar:open-search',   () => { /* TODO */ });
  ipcMain.on('topbar:open-settings', () => { /* TODO */ });

  setTimeout(() => { initTopbarState(); }, 0);
}