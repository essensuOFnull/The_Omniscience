import electronPkg from 'electron';
const { WebContentsView, ipcMain } = electronPkg;

/* ------------------------------------------------------------------ */
/* Утилиты                                                             */
/* ------------------------------------------------------------------ */

function resolvePreload(requested) {
    const themeEnabled = global.themeEnabled !== false;
    const themed = global.paths.reactPreload;
    const clean = global.paths.reactPreloadNoTheme;
    if (!requested) return themeEnabled ? themed : clean;
    if (requested === themed || requested === clean) return themeEnabled ? themed : clean;
    return requested;
}

function effectiveZ(entry) {
    if (entry.kind === 'panel' && entry.parentId && global.views[entry.parentId]) {
        return (global.views[entry.parentId].zIndex || 0) + 0.5;
    }
    return entry.zIndex || 0;
}

function clampPanelBounds(bounds) {
    if (!global.mainWindow || global.mainWindow.isDestroyed()) return bounds;
    const cb = global.mainWindow.contentView.getBounds();
    const vpW = cb.width;
    const vpH = cb.height;

    let { x, y, width, height } = bounds;

    if (width > vpW) { width = vpW; x = 0; }
    else { if (x < 0) x = 0; if (x + width > vpW) x = vpW - width; }

    if (height > vpH) { height = vpH; y = 0; }
    else { if (y < 0) y = 0; if (y + height > vpH) y = vpH - height; }

    return { x, y, width, height };
}

function reorderAll() {
    if (!global.mainWindow || global.mainWindow.isDestroyed()) return;

    const list = Object.entries(global.views);
    list.sort((a, b) => {
        const za = effectiveZ(a[1]);
        const zb = effectiveZ(b[1]);
        if (za !== zb) return za - zb;
        if (a[1].kind === 'window' && b[1].kind === 'panel' && b[1].parentId === a[0]) return -1;
        if (a[1].kind === 'panel' && b[1].kind === 'window' && a[1].parentId === b[0]) return 1;
        return 0;
    });

    for (const [, e] of list) {
        try { global.mainWindow.contentView.removeChildView(e.view); } catch (_) { }
    }
    for (const [, e] of list) {
        global.mainWindow.contentView.addChildView(e.view);
        e.view.setBounds(e.bounds);
    }
}

/* ------------------------------------------------------------------ */
/* Публичное API                                                       */
/* ------------------------------------------------------------------ */

export function createView(id, { kind, url, preload, bounds, parentId }) {
    if (!global.mainWindow || global.mainWindow.isDestroyed()) return null;
    if (global.views[id]) return global.views[id].view;

    const view = new WebContentsView({
        webPreferences: {
            preload: resolvePreload(preload),
            nodeIntegration: false,
            contextIsolation: true,
            transparent: true,
            backgroundColor: '#00000000',
            sandbox: false,
            webSecurity: true,
            webviewTag: false,
        },
    });
    view.setBackgroundColor('#00000000');
    view.webContents.loadURL(url || 'about:blank');

    const b = bounds || { x: 0, y: 0, width: 100, height: 100 };
    view.setBounds(b);

    const entry = {
        view,
        bounds: { ...b },
        zIndex: 0,
        kind: kind || 'window',
        parentId: parentId || null,
        children: [],
        url: url || 'about:blank',
        requestedPreload: preload || null,
        scale: 1,
    };
    global.views[id] = entry;

    if (parentId && global.views[parentId]) {
        global.views[parentId].children.push(id);
    }

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
        wc.on('did-fail-load', (_e, ec, ed, uv, imf) => sendNav({ errorCode: ec, errorDescription: ed, validatedURL: uv, isMainFrame: imf }));
    }

    reorderAll();
    return view;
}

export function updateBounds(id, bounds, { moveChildren = false } = {}) {
    const entry = global.views[id];
    if (!entry) return;

    const prev = entry.bounds;
    const next = {
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
    };
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;

    entry.view.setBounds(next);
    entry.bounds = next;

    if (bounds.scale !== undefined && bounds.scale !== entry.scale) {
        entry.view.webContents.setZoomFactor(bounds.scale);
        entry.scale = bounds.scale;
    }

    if (moveChildren && (dx !== 0 || dy !== 0)) {
        for (const childId of entry.children) {
            const child = global.views[childId];
            if (!child) continue;

            let nextChildBounds = {
                x: child.bounds.x + dx,
                y: child.bounds.y + dy,
                width: child.bounds.width,
                height: child.bounds.height,
            };

            // 👇 Панель не должна уезжать за пределы viewport mainWindow
            if (child.kind === 'panel') {
                nextChildBounds = clampPanelBounds(nextChildBounds);
            }

            updateBounds(childId, nextChildBounds, { moveChildren: true });
        }
    }
}

export function destroyView(id) {
    const entry = global.views[id];
    if (!entry) return;

    for (const childId of [...entry.children]) {
        destroyView(childId);
    }

    if (entry.parentId && global.views[entry.parentId]) {
        const p = global.views[entry.parentId];
        p.children = p.children.filter((x) => x !== id);
    }

    try { global.mainWindow.contentView.removeChildView(entry.view); } catch (_) { }
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
        parentId: e.parentId, zIndex: e.zIndex, scale: e.scale,
    }));

    if (snapshot.length === 0) return;

    for (const s of snapshot) {
        if (s.kind === 'window') destroyView(s.id);
    }
    for (const s of snapshot) {
        if (s.kind !== 'window') continue;
        createView(s.id, {
            kind: 'window', url: s.url, preload: s.requestedPreload, bounds: s.bounds,
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

    /* -------- Универсальные операции с view -------- */

    ipcMain.on('view:create', (_e, { id, kind, url, preload, bounds, parentId }) => {
        createView(id, { kind, url, preload, bounds, parentId });
    });

    ipcMain.on('view:update-bounds', (_e, { id, bounds, moveChildren }) => {
        updateBounds(id, bounds, { moveChildren });
    });

    ipcMain.on('view:update-own-bounds', (event, { bounds, moveChildren }) => {
        const id = findIdByWebContents(event.sender.id);
        if (!id) return;
        const entry = global.views[id];
        if (!entry) return;

        let b = bounds;
        if (entry.kind === 'panel') {
            b = clampPanelBounds(bounds);
        }
        updateBounds(id, b, { moveChildren });
    });

    ipcMain.on('view:destroy', (_e, { id }) => {
        destroyView(id);
    });

    ipcMain.on('view:set-z', (_e, { id, z }) => {
        setZIndex(id, z);
    });

    ipcMain.handle('view:get-bounds', (_e, { id }) => getBounds(id));

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

    /* -------- Shell ↔ Panel -------- */

    ipcMain.on('panel:event', (event, { windowId, type, payload }) => {
        sendToShell('shell:panel-event', {
            fromId: event.sender.id, windowId, type, payload,
        });
    });

    ipcMain.on('shell:send-to-panel', (_e, { windowId, data }) => {
        const pid = `panel:${windowId}`;
        const entry = global.views[pid];
        if (!entry) return;
        const wc = entry.view.webContents;
        if (wc && !wc.isDestroyed()) wc.send('panel:props', data);
    });

    /* -------- Frame: drag/resize окна (инициируется из панели) -------- */

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

    /* -------- Тема -------- */

    ipcMain.on('theme:enabled-changed', (_e, enabled) => {
        global.themeEnabled = !!enabled;
        recreateAllViews();
    });

    /* -------- Заглушка для совместимости -------- */

    ipcMain.handle('get-desktop-view-bounds', () => ({ x: 0, y: 0, width: 0, height: 0 }));

    ipcMain.on('view:test-original-devtools', (_e, { id }) => {
        const entry = global.views[id];
        if (!entry?.view?.webContents) {
            console.log('[test] no view for', id);
            return;
        }

        const devtoolsId = `devtools-original:${id}`;
        if (global.views[devtoolsId]) {
            console.log('[test] already exists');
            return;
        }

        const devtoolsView = new WebContentsView({
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
            },
        });

        global.mainWindow.contentView.addChildView(devtoolsView);
        devtoolsView.setBounds({ x: 200, y: 200, width: 900, height: 600 });

        global.views[devtoolsId] = {
            view: devtoolsView,
            kind: 'devtools-original',
            parentId: id,
            bounds: { x: 200, y: 200, width: 900, height: 600 },
            zIndex: 99999,
        };

        // Закрыть существующие DevTools, если открыты
        if (entry.view.webContents.isDevToolsOpened()) {
            entry.view.webContents.closeDevTools();
        }

        // Привязать
        entry.view.webContents.setDevToolsWebContents(devtoolsView.webContents);

        // Открыть БЕЗ mode
        entry.view.webContents.openDevTools();

        console.log('[test] original devtools opened for', id);
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
        const cb = global.mainWindow.contentView.getBounds();
        updateBounds(id, {
            x: 0,
            y: 0,
            width: cb.width,
            height: cb.height,
        });
    });
}