import electronPkg from 'electron';
const { WebContentsView, ipcMain } = electronPkg;
import { attachToWebContents } from './ipc_browserContextMenu.js';
import { getWindowById } from './ipc_windowManager.js';

/* ------------------------------------------------------------------ */
/* Резолвер родительского окна                                         */
/* ------------------------------------------------------------------ */

/**
 * Возвращает BrowserWindow по символическому parentWindowId:
 *   null / undefined  → mainWindow
 *   'main'            → mainWindow
 *   'topbar'          → topbarWindow
 *   любое другое      → ищем в реестре ipc_windowManager (обычные окна + shell)
 *                       с фолбэком на mainWindow
 */
function resolveParentWindow(parentWindowId) {
    if (!parentWindowId) return global.mainWindow || null;
    if (parentWindowId === 'main') return global.mainWindow || null;
    if (parentWindowId === 'topbar') return global.topbarWindow || null;

    try {
        const w = getWindowById(parentWindowId);
        if (w && !w.isDestroyed()) return w;
    } catch { /* ignore */ }

    return global.mainWindow || null;
}

/* ------------------------------------------------------------------ */
/* Z-order                                                             */
/* ------------------------------------------------------------------ */

function reorderAll() {
    if (!global.mainWindow) return;

    const groups = new Map();   // parentWindow → [entries]
    for (const [, e] of Object.entries(global.views)) {
        const pw = e.parentWindow || global.mainWindow;
        if (!groups.has(pw)) groups.set(pw, []);
        groups.get(pw).push(e);
    }

    for (const [parentWindow, list] of groups) {
        if (!parentWindow || parentWindow.isDestroyed()) continue;
        list.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        for (const e of list) {
            try { parentWindow.contentView.removeChildView(e.view); } catch (_) { }
        }
        for (const e of list) {
            try { parentWindow.contentView.addChildView(e.view); } catch (_) { }
            e.view.setBounds(e.bounds);
        }
    }
}

/* ------------------------------------------------------------------ */
/* Автоочистка views при закрытии родительского окна                   */
/* ------------------------------------------------------------------ */

function hookParentCleanup(parentWindow) {
    if (!parentWindow || parentWindow.isDestroyed()) return;
    if (parentWindow.__omniViewCleanupHooked) return;
    parentWindow.__omniViewCleanupHooked = true;

    parentWindow.on('closed', () => {
        for (const [vid, ve] of Object.entries(global.views)) {
            if (ve.parentWindow === parentWindow) {
                try { ve.view.webContents.destroy(); } catch (_) { }
                delete global.views[vid];
            }
        }
    });
}

/* ------------------------------------------------------------------ */
/* Публичное API                                                       */
/* ------------------------------------------------------------------ */

export function createView(id, { kind, url, preload, bounds, parentWindowId }) {
    const parentWindow = resolveParentWindow(parentWindowId);
    if (!parentWindow || parentWindow.isDestroyed()) return null;
    if (global.views[id]) return global.views[id].view;

    const view = new WebContentsView({
        webPreferences: {
            preload: preload || undefined,
            nodeIntegration: false,
            contextIsolation: true,
            transparent: true,
            backgroundColor: '#00000000',
            webSecurity: true,
            webviewTag: false,
        },
    });
    view.setBackgroundColor('#00000000');
    if (url) view.webContents.loadURL(url);

    const b = bounds || { x: 0, y: 0, width: 100, height: 100 };
    view.setBounds(b);

    const entry = {
        view,
        parentWindow,
        parentWindowId: parentWindowId || null,   // ← сохраняем для recreateAllViews
        bounds: { ...b },
        zIndex: 0,
        kind: kind || 'window',
        url: url || 'about:blank',
        requestedPreload: preload || undefined,
        scale: 1,
    };

    global.views[id] = entry;
    parentWindow.contentView.addChildView(view);
    hookParentCleanup(parentWindow);

    // Навигационные события — только для окон
    if (kind === 'window') {
        const wc = view.webContents;
        const sendNav = (err) => {
            if (!global.mainWindow || global.mainWindow.isDestroyed()) return;
            global.mainWindow.webContents.send('window-navigation-update', {
                windowId: id,
                url: wc.getURL?.() || '',
                title: wc.getTitle?.() || '',
                canGoBack: wc.navigationHistory.canGoBack?.() || false,
                canGoForward: wc.navigationHistory.canGoForward?.() || false,
                loading: wc.isLoading?.() || false,
                error: err || null,
            });
        };
        wc.on('did-navigate', () => sendNav());
        wc.on('did-navigate-in-page', () => sendNav());
        wc.on('did-start-loading', () => sendNav());
        wc.on('did-stop-loading', () => sendNav());
        wc.on('page-title-updated', () => sendNav());
        wc.on('did-fail-load', (_e, ec, ed, uv, imf) =>
            sendNav({ errorCode: ec, errorDescription: ed, validatedURL: uv, isMainFrame: imf }));
    }

    // Перехват window.open() и target="_blank".
    try {
        view.webContents.setWindowOpenHandler(({ url, frameName, features, disposition, referrer, postBody }) => {
            if (!global.mainWindow || global.mainWindow.isDestroyed()) {
                return { action: 'deny' };
            }
            global.mainWindow.webContents.send('shell:open-window-request', {
                sourceWindowId: id,
                url,
                disposition,
                frameName,
                features,
                referrer,
                hasPostBody: !!postBody,
            });
            return { action: 'deny' };
        });
        attachToWebContents(view.webContents);
    } catch (err) {
        console.error('[viewManager] setWindowOpenHandler failed:', err);
    }

    reorderAll();
    return view;
}

export function updateBounds(id, bounds) {
    const entry = global.views[id];
    if (!entry) return;

    const next = {
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
    };

    entry.view.setBounds(next);
    entry.bounds = next;

    if (bounds.scale !== undefined && bounds.scale !== entry.scale) {
        entry.view.webContents.setZoomFactor(bounds.scale);
        entry.scale = bounds.scale;
    }
}

export function destroyView(id) {
    const entry = global.views[id];
    if (!entry) return;
    try { entry.parentWindow?.contentView?.removeChildView(entry.view); } catch (_) { }
    try { entry.view.webContents.destroy(); } catch (_) { }
    delete global.views[id];
}

export function setZIndex(id, z) {
    const entry = global.views[id];
    if (!entry) return;
    entry.zIndex = z;
    reorderAll();
}

export function getBounds(id) {
    const entry = global.views[id];
    return entry ? { ...entry.bounds } : null;
}

export function findIdByWebContents(wcId) {
    for (const [id, e] of Object.entries(global.views)) {
        if (e.view?.webContents?.id === wcId) return id;
    }
    return null;
}

export function recreateAllViews() {
    const snapshot = Object.entries(global.views).map(([id, e]) => ({
        id, kind: e.kind, url: e.url, bounds: e.bounds,
        requestedPreload: e.requestedPreload,
        zIndex: e.zIndex, scale: e.scale,
        parentWindowId: e.parentWindowId || null,   // ← переносим
    }));

    if (snapshot.length === 0) return;

    for (const s of snapshot) {
        if (s.kind === 'window') destroyView(s.id);
    }
    for (const s of snapshot) {
        if (s.kind !== 'window') continue;
        createView(s.id, {
            kind: 'window',
            url: s.url,
            preload: s.requestedPreload,
            bounds: s.bounds,
            parentWindowId: s.parentWindowId,       // ← восстанавливаем
        });
        const e = global.views[s.id];
        if (!e) continue;
        e.zIndex = s.zIndex;
        if (s.scale !== 1) { e.view.webContents.setZoomFactor(s.scale); e.scale = s.scale; }
    }
    reorderAll();
}

/* ------------------------------------------------------------------ */
/* IPC                                                                 */
/* ------------------------------------------------------------------ */

function sendToShell(channel, data) {
    if (!global.mainWindow || global.mainWindow.isDestroyed()) return;
    global.mainWindow.webContents.send(channel, data);
}

export default function () {
    global.views = {};
    if (global.themeEnabled === undefined) global.themeEnabled = true;

    /* -------- Универсальные операции -------- */

    ipcMain.on('view:create', (_e, msg) => {
        console.log('[DBG] view:create id =', msg?.id,
                    'kind =', msg?.kind,
                    'parentWindowId =', msg?.parentWindowId);
        createView(msg.id, msg);
    });

    ipcMain.on('view:update-bounds', (_e, { id, bounds }) => {
        updateBounds(id, bounds);
    });

    ipcMain.on('view:update-own-bounds', (event, { bounds }) => {
        const id = findIdByWebContents(event.sender.id);
        if (!id) return;
        updateBounds(id, bounds);
    });

    ipcMain.on('view:destroy', (_e, { id }) => {
        destroyView(id);
    });

    ipcMain.on('view:set-z', (_e, { id, z }) => {
        setZIndex(id, z);
    });

    ipcMain.handle('view:get-bounds', (_e, { id }) => getBounds(id));

    ipcMain.handle('view:get-main-size', () => {
        if (!global.mainWindow || global.mainWindow.isDestroyed()) return null;
        const b = global.mainWindow.contentView.getBounds();
        return { width: b.width, height: b.height };
    });

    ipcMain.on('view:hide', (_e, { id }) => {
        const entry = global.views[id];
        if (!entry) return;
        entry._savedBounds = { ...entry.bounds };
        entry.view.setBounds({
            x: -10000, y: -10000,
            width: entry.bounds.width,
            height: entry.bounds.height,
        });
    });

    ipcMain.on('view:show', (_e, { id }) => {
        const entry = global.views[id];
        if (!entry) return;
        const b = entry._savedBounds || entry.bounds;
        entry.view.setBounds(b);
        entry.bounds = b;
    });

    ipcMain.on('view:move-by', (event, { dx, dy }) => {
        const id = findIdByWebContents(event.sender.id);
        if (!id) return;
        const entry = global.views[id];
        if (!entry) return;
        updateBounds(id, {
            x: entry.bounds.x + dx,
            y: entry.bounds.y + dy,
            width: entry.bounds.width,
            height: entry.bounds.height,
        });
    });

    ipcMain.on('view:resize-by', (event, { direction, dx, dy }) => {
        const id = findIdByWebContents(event.sender.id);
        if (!id) return;
        const entry = global.views[id];
        if (!entry) return;

        const b = entry.bounds;
        let x = b.x, y = b.y, w = b.width, h = b.height;

        if (direction.includes('e')) w = Math.max(300, w + dx);
        if (direction.includes('w')) {
            const newW = Math.max(300, w - dx);
            x = b.x + (b.width - newW);
            w = newW;
        }
        if (direction.includes('s')) h = Math.max(200, h + dy);
        if (direction.includes('n')) {
            const newH = Math.max(200, h - dy);
            y = b.y + (b.height - newH);
            h = newH;
        }

        updateBounds(id, { x, y, width: w, height: h });
    });

    ipcMain.on('view:maximize', (event) => {
        const id = findIdByWebContents(event.sender.id);
        if (!id) return;
        const entry = global.views[id];
        if (!entry) return;
        const cb = entry.parentWindow?.contentView?.getBounds?.();
        if (!cb) return;
        updateBounds(id, { x: 0, y: 0, width: cb.width, height: cb.height });
    });

    /* -------- Навигация окна -------- */

    ipcMain.on('window-go-back', (_e, windowId) => {
        const v = global.views[windowId];
        if (v?.view?.webContents?.canGoBack?.()) v.view.webContents.goBack();
    });
    ipcMain.on('window-go-forward', (_e, windowId) => {
        const v = global.views[windowId];
        if (v?.view?.webContents?.canGoForward?.()) v.view.webContents.goForward();
    });
    ipcMain.on('window-reload', (_e, windowId) => {
        const v = global.views[windowId];
        if (v?.view?.webContents) v.view.webContents.reload();
    });
    ipcMain.on('window-load-url', (_e, windowId, url) => {
        const v = global.views[windowId];
        if (v?.view?.webContents) v.view.webContents.loadURL(url);
    });
    ipcMain.on('window-stop-load', (_e, windowId) => {
        const v = global.views[windowId];
        if (v?.view?.webContents?.isLoading?.()) v.view.webContents.stop();
    });
    ipcMain.handle('get-window-nav-state', (_e, windowId) => {
        const v = global.views[windowId];
        if (!v) return null;
        const wc = v.view.webContents;
        return {
            url: wc.getURL?.() || '',
            title: wc.getTitle?.() || '',
            canGoBack: wc.navigationHistory.canGoBack?.() || false,
            canGoForward: wc.navigationHistory.canGoForward?.() || false,
            loading: wc.isLoading?.() || false,
        };
    });

    /* -------- Frame drag/resize (инициируется из панели) -------- */

    ipcMain.on('frame:drag-start', (_e, { windowId }) => {
        sendToShell('shell:frame-drag-start', { windowId });
    });
    ipcMain.on('frame:drag-delta', (_e, { windowId, dx, dy }) => {
        sendToShell('shell:frame-drag-delta', { windowId, dx, dy });
    });
    ipcMain.on('frame:drag-end', (_e, { windowId }) => {
        sendToShell('shell:frame-drag-end', { windowId });
    });

    ipcMain.on('frame:resize-start', (_e, { windowId, direction }) => {
        sendToShell('shell:frame-resize-start', { windowId, direction });
    });
    ipcMain.on('frame:resize-delta', (_e, { windowId, direction, dx, dy }) => {
        sendToShell('shell:frame-resize-delta', { windowId, direction, dx, dy });
    });
    ipcMain.on('frame:resize-end', (_e, { windowId }) => {
        sendToShell('shell:frame-resize-end', { windowId });
    });

    /* -------- DevTools -------- */

    ipcMain.on('devtools:attach', (event, { devtoolsViewId, targetViewId }) => {
        const devtoolsEntry = global.views[devtoolsViewId];
        const targetEntry = global.views[targetViewId];
        if (!devtoolsEntry || !targetEntry) {
            console.log('[devtools:attach] missing:', { devtoolsViewId, targetViewId });
            return;
        }
        const devtoolsWC = devtoolsEntry.view?.webContents;
        const targetWC = targetEntry.view?.webContents;
        if (!devtoolsWC || !targetWC) return;

        if (targetWC.isDevToolsOpened()) targetWC.closeDevTools();
        targetWC.setDevToolsWebContents(devtoolsWC);
        targetWC.openDevTools({ mode: 'detach' });
        console.log('[devtools:attach] ok:', devtoolsViewId, '→', targetViewId);
    });

    /* -------- Тема -------- */

    ipcMain.on('theme:enabled-changed', (_e, enabled) => {
        global.themeEnabled = !!enabled;
        recreateAllViews();
    });

    /* -------- Заглушка -------- */

    ipcMain.handle('get-desktop-view-bounds', () => ({ x: 0, y: 0, width: 0, height: 0 }));
}