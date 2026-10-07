import electronPkg from 'electron';
const { ipcMain } = electronPkg;
import { listWindows, destroyWindowById, getWindowById } from './ipc_windowManager.js';
import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

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
    const activeXid = global.__activeXid || null;

    const ourWindows = listWindows().map((w) => ({
        id: w.id,
        kind: 'our',
        title: w.title,
        icon: w.icon || null,
        maximized: !!w.maximized,
        minimized: !!w.minimized,
        focused: !!(activeXid && w.xid === activeXid),
        xid: w.xid || null,
    }));

    const nativeWindows = (global.__lastNativeWindows || []).map((w) => ({
        id: w.id,                 // X11 XID, например '0x03400004'
        kind: 'native',
        title: w.title || w.wmClass || 'Окно',
        icon: w.icon || null,
        maximized: !!w.isMaximized,
        minimized: !!w.isMinimized,
        focused: !!(activeXid && w.id === activeXid),
        wmClass: w.wmClass,
    }));

    const windows = [...ourWindows, ...nativeWindows];
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
        mode: cfg.__mode || 'normal',
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

    ipcMain.on('topbar:open-search', async () => {
        try {
            try { await execAsync('qdbus org.kde.krunner /App display'); }
            catch (_) { spawn('krunner', [], { detached: true, stdio: 'ignore' }).unref(); }
        } catch (err) { console.error('[topbar:open-search]', err.message); }
    });

    ipcMain.on('topbar:open-settings', () => {
        try { spawn('systemsettings', [], { detached: true, stdio: 'ignore' }).unref(); }
        catch (err) { console.error('[topbar:open-settings]', err.message); }
    });

    ipcMain.handle('topbar:get-window-bounds', (_e, { id }) => {
        const win = getWindowById(id);
        return win ? win.getBounds() : null;
    });

    ipcMain.on('topbar:move-window', (_e, { id, x, y }) => {
        const win = getWindowById(id);
        if (!win) return;
        const b = win.getBounds();
        win.setBounds(
            { x: Math.round(x), y: Math.round(y), width: b.width, height: b.height },
            false,   // без анимации
        );
    });

    ipcMain.on('topbar:resize-window', (_e, { id, x, y, width, height }) => {
        const win = getWindowById(id);
        if (!win) return;
        win.setBounds(
            { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) },
            false,
        );
    });

    ipcMain.on('topbar:minimize-window', (_e, { id }) => {
        getWindowById(id)?.minimize();
    });

    ipcMain.on('topbar:maximize-window', (_e, { id, maximized }) => {
        const win = getWindowById(id);
        if (!win) return;
        if (maximized) win.unmaximize();
        else win.maximize();
    });

    setTimeout(() => { initTopbarState(); }, 0);
}