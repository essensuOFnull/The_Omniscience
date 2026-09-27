import electronPkg from 'electron';
const { WebContentsView, ipcMain, webContents } = electronPkg;
import { rebuildZOrder } from './ipc_windowContentView.js';

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

// windowId -> frame webContentsId
const frameRegistry = new Map();
// windowId -> последние props (для нового подписчика)
const propsCache = new Map();

function createFrameView(windowId, { url, preload, initialBounds }) {
	const key = `frame:${windowId}`;

	if (global.windowContentViews[key]) {
		const entry = global.windowContentViews[key];
		if (url && entry.url !== url) {
			entry.view.webContents.loadURL(url);
			entry.url = url;
		}
		return entry.view;
	}

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

	global.mainWindow.contentView.addChildView(view);
	const bounds = initialBounds || { x: 0, y: 0, width: 0, height: 0 };
	view.setBounds(bounds);

	global.windowContentViews[key] = {
		view, bounds, zIndex: 0,
		url: url || 'about:blank',
		requestedPreload: preload,
		windowId,
		type: 'frame',
	};

	frameRegistry.set(windowId, view.webContents.id);

	// Как только frame загрузился — отдаём ему кэшированные props
	view.webContents.on('did-finish-load', () => {
		const cached = propsCache.get(windowId);
		if (cached) view.webContents.send('frame:props', cached);
	});

	view.webContents.once('destroyed', () => {
		frameRegistry.delete(windowId);
	});

	return view;
}

function updateFrameView(windowId, { x, y, width, height }) {
	const entry = global.windowContentViews[`frame:${windowId}`];
	if (!entry) return;
	const bounds = {
		x: Math.round(x), y: Math.round(y),
		width: Math.round(width), height: Math.round(height),
	};
	entry.view.setBounds(bounds);
	entry.bounds = bounds;
}

function destroyFrameView(windowId) {
	const key = `frame:${windowId}`;
	const entry = global.windowContentViews[key];
	if (!entry) return;
	global.mainWindow.contentView.removeChildView(entry.view);
	entry.view.webContents.destroy();
	delete global.windowContentViews[key];
	frameRegistry.delete(windowId);
	propsCache.delete(windowId);
}

export default function () {
	ipcMain.on('create-frame-view', (_e, data) => {
		createFrameView(data.windowId, {
			url: data.url, preload: data.preload, initialBounds: data.bounds,
		});
	});

	ipcMain.on('update-frame-view', (_e, data) => {
		updateFrameView(data.windowId, {
			x: data.x, y: data.y, width: data.width, height: data.height,
		});
	});

	ipcMain.on('destroy-frame-view', (_e, data) => {
		destroyFrameView(data.windowId);
	});

	ipcMain.on('set-frame-zindex', (_e, data) => {
		const contentEntry = global.windowContentViews[data.windowId];
		const frameEntry = global.windowContentViews[`frame:${data.windowId}`];
		if (contentEntry) contentEntry.zIndex = data.zIndex;
		if (frameEntry) frameEntry.zIndex = data.zIndex;
		rebuildZOrder();
	});

	// Frame → Shell
	ipcMain.on('frame:event', (event, { windowId, type, payload }) => {
		if (!global.mainWindow || global.mainWindow.isDestroyed()) return;
		global.mainWindow.webContents.send('shell:frame-event', {
			fromId: event.sender.id, windowId, type, payload,
		});
	});

	// Shell → Frame (props)
	ipcMain.on('shell:send-to-frame', (_e, { windowId, data }) => {
		propsCache.set(windowId, data);
		const wcId = frameRegistry.get(windowId);
		if (wcId == null) return;
		const wc = webContents.fromId(wcId);
		if (wc && !wc.isDestroyed()) wc.send('frame:props', data);
	});
}