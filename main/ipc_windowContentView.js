import electronPkg from 'electron';
const { WebContentsView, ipcMain } = electronPkg;

function resolvePreload(requested) {
	const themeEnabled = global.themeEnabled !== false;
	const themedPath = global.paths.reactPreload;
	const cleanPath = global.paths.reactPreloadNoTheme;

	if (!requested) return themeEnabled ? themedPath : cleanPath;
	if (requested === themedPath || requested === cleanPath) {
		return themeEnabled ? themedPath : cleanPath;
	}
	return requested;
}

function createWindowContentView(windowId, { url, preload, initialBounds }) {
	if (global.windowContentViews[windowId]) {
		const entry = global.windowContentViews[windowId];
		if (url && entry.url !== url) {
			entry.view.webContents.loadURL(url);
			entry.url = url;
		}
		return entry.view;
	}

	const requestedPreload = preload;
	const actualPreload = resolvePreload(preload);

	const view = new WebContentsView({
		webPreferences: {
			preload: actualPreload,
			nodeIntegration: false,
			contextIsolation: true,
			transparent: true,
			backgroundColor: '#00000000',
			sandbox: false,
			webSecurity: true,
			webviewTag: true,
		},
	});

	view.setBackgroundColor('#00000000');
	view.webContents.loadURL(url || 'about:blank');

	const webContents = view.webContents;

	const sendNavigationUpdate = (errorInfo) => {
		const canGoBack = webContents.navigationHistory.canGoBack?.() || false;
		const canGoForward = webContents.navigationHistory.canGoForward?.() || false;
		const isLoading = webContents.isLoading?.() || false;
		const currentUrl = webContents.getURL?.() || '';
		const title = webContents.getTitle?.() || '';

		if (global.mainWindow && !global.mainWindow.isDestroyed()) {
			global.mainWindow.webContents.send('window-navigation-update', {
				windowId, url: currentUrl, title, canGoBack, canGoForward, loading: isLoading,
				error: errorInfo || null,
			});
		}
	};

	webContents.on('did-navigate', () => sendNavigationUpdate());
	webContents.on('did-navigate-in-page', () => sendNavigationUpdate());
	webContents.on('did-start-loading', () => sendNavigationUpdate());
	webContents.on('did-stop-loading', () => sendNavigationUpdate());
	webContents.on('page-title-updated', () => sendNavigationUpdate());

	webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
		sendNavigationUpdate({ errorCode, errorDescription, validatedURL, isMainFrame });
	});

	global.mainWindow.contentView.addChildView(view);

	const bounds = initialBounds || { x: 0, y: 0, width: 0, height: 0 };
	view.setBounds(bounds);

	global.windowContentViews[windowId] = {
		view, bounds, scale: 1, zIndex: 0,
		url: url || 'about:blank',
		requestedPreload,
		type: 'content',
		windowId,
	};

	view._navListeners = [sendNavigationUpdate];
	return view;
}

function updateWindowContentView(windowId, { x, y, width, height, scale }) {
	const entry = global.windowContentViews[windowId];
	if (!entry) return;

	const bounds = {
		x: Math.round(x), y: Math.round(y),
		width: Math.round(width), height: Math.round(height),
	};
	entry.view.setBounds(bounds);
	entry.bounds = bounds;

	if (scale !== undefined && scale !== entry.scale) {
		entry.view.webContents.setZoomFactor(scale);
		entry.scale = scale;
	}
}

function destroyWindowContentView(windowId) {
	const entry = global.windowContentViews[windowId];
	if (!entry) return;
	global.mainWindow.contentView.removeChildView(entry.view);
	entry.view.webContents.destroy();
	delete global.windowContentViews[windowId];
}

// ⚠ Общая функция: пересортировывает ВСЁ, включая пары frame+content.
export function rebuildZOrder() {
	const entries = Object.entries(global.windowContentViews);
	entries.sort((a, b) => {
		const za = a[1].zIndex || 0;
		const zb = b[1].zIndex || 0;
		if (za !== zb) return za - zb;
		// один и тот же z: frame идёт раньше (ниже), content — позже (выше)
		const ta = a[1].type === 'frame' ? 0 : 1;
		const tb = b[1].type === 'frame' ? 0 : 1;
		return ta - tb;
	});

	for (const [, e] of entries) {
		global.mainWindow.contentView.removeChildView(e.view);
	}
	for (const [, e] of entries) {
		global.mainWindow.contentView.addChildView(e.view);
		e.view.setBounds(e.bounds);
	}
}

function setWindowContentZIndex(windowId, zIndex) {
	const contentEntry = global.windowContentViews[windowId];
	const frameEntry = global.windowContentViews[`frame:${windowId}`];
	if (contentEntry) contentEntry.zIndex = zIndex;
	if (frameEntry) frameEntry.zIndex = zIndex;
	rebuildZOrder();
}

function getWindowView(windowId) {
	const entry = global.windowContentViews?.[windowId];
	return entry?.view;
}

function recreateAllViews() {
	const snapshots = Object.entries(global.windowContentViews || {}).map(([id, e]) => ({
		id,
		url: e.url,
		bounds: e.bounds,
		scale: e.scale || 1,
		zIndex: e.zIndex || 0,
		requestedPreload: e.requestedPreload,
		type: e.type,
		windowId: e.windowId,
	}));

	if (snapshots.length === 0) return;

	for (const snap of snapshots) {
		if (snap.type === 'frame') continue;
		destroyWindowContentView(snap.id);
	}

	for (const snap of snapshots) {
		if (snap.type === 'frame') continue;
		createWindowContentView(snap.id, {
			url: snap.url,
			preload: snap.requestedPreload,
			initialBounds: snap.bounds,
		});

		const entry = global.windowContentViews[snap.id];
		if (!entry) continue;
		entry.zIndex = snap.zIndex;
		if (snap.scale !== 1) {
			entry.view.webContents.setZoomFactor(snap.scale);
			entry.scale = snap.scale;
		}
	}

	rebuildZOrder();
}

export default function () {
	global.windowContentViews = {};
	if (global.themeEnabled === undefined) global.themeEnabled = true;

	ipcMain.on('create-window-content-view', (event, data) => {
		createWindowContentView(data.windowId, {
			url: data.url, preload: data.preload, initialBounds: data.bounds,
		});
	});

	ipcMain.on('update-window-content-view', (event, data) => {
		updateWindowContentView(data.windowId, {
			x: data.x, y: data.y, width: data.width, height: data.height, scale: data.scale,
		});
	});

	ipcMain.on('destroy-window-content-view', (event, data) => {
		destroyWindowContentView(data.windowId);
	});

	ipcMain.on('set-window-content-zindex', (event, data) => {
		setWindowContentZIndex(data.windowId, data.zIndex);
	});

	ipcMain.handle('get-desktop-view-bounds', () => ({ x: 0, y: 0, width: 0, height: 0 }));

	ipcMain.on('window-go-back', (event, windowId) => {
		const view = getWindowView(windowId);
		if (view?.webContents?.canGoBack?.()) view.webContents.goBack();
	});
	ipcMain.on('window-go-forward', (event, windowId) => {
		const view = getWindowView(windowId);
		if (view?.webContents?.canGoForward?.()) view.webContents.goForward();
	});
	ipcMain.on('window-reload', (event, windowId) => {
		const view = getWindowView(windowId);
		if (view?.webContents) view.webContents.reload();
	});
	ipcMain.on('window-load-url', (event, windowId, url) => {
		const view = getWindowView(windowId);
		if (view?.webContents) view.webContents.loadURL(url);
	});
	ipcMain.on('window-stop-load', (event, windowId) => {
		const view = getWindowView(windowId);
		if (view?.webContents?.isLoading?.()) view.webContents.stop();
	});

	ipcMain.handle('get-window-nav-state', (event, windowId) => {
		const view = getWindowView(windowId);
		if (!view) return null;
		const webContents = view.webContents;
		return {
			url: webContents.getURL?.() || '',
			title: webContents.getTitle?.() || '',
			canGoBack: webContents.navigationHistory.canGoBack?.() || false,
			canGoForward: webContents.navigationHistory.canGoForward?.() || false,
			loading: webContents.isLoading?.() || false,
		};
	});

	ipcMain.on('theme:enabled-changed', (_e, enabled) => {
		global.themeEnabled = !!enabled;
		recreateAllViews();
	});
}

export { createWindowContentView, updateWindowContentView, destroyWindowContentView, setWindowContentZIndex };