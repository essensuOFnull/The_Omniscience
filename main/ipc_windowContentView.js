import electronPkg from 'electron';
const { WebContentsView, ipcMain } = electronPkg;

function createWindowContentView(windowId, { url, preload, initialBounds }) {
	if (global.windowContentViews[windowId]) {
		// Если уже существует, просто обновляем URL (опционально)
		const entry = global.windowContentViews[windowId];
		if (url && entry.url !== url) {
			entry.view.webContents.loadURL(url);
			entry.url = url;
		}
		return entry.view;
	}

	const view = new WebContentsView({
		webPreferences: {
			preload: preload,
			nodeIntegration: false,
			contextIsolation: true,
			transparent: true,
			backgroundColor: '#00000000',
			sandbox: false,
		},
	});

	view.setBackgroundColor('#00000000');
	view.webContents.loadURL(url || 'about:blank');

	// Подписка на события для отправки в renderer
	const webContents = view.webContents;

	const sendNavigationUpdate = (errorInfo) => {
		const canGoBack = webContents.navigationHistory.canGoBack?.() || false;
		const canGoForward = webContents.navigationHistory.canGoForward?.() || false;
		const isLoading = webContents.isLoading?.() || false;
		const currentUrl = webContents.getURL?.() || '';
		const title = webContents.getTitle?.() || '';

		if (global.mainWindow && !global.mainWindow.isDestroyed()) {
			global.mainWindow.webContents.send('window-navigation-update', {
				windowId,
				url: currentUrl,
				title,
				canGoBack,
				canGoForward,
				loading: isLoading,
				error: errorInfo || null,   // <-- передаём ошибку, если есть
			});
		}
	};

	// События, после которых обновляем статус
	// вместо прямого присоединения sendNavigationUpdate оборачиваем
	webContents.on('did-navigate', () => sendNavigationUpdate());
	webContents.on('did-navigate-in-page', () => sendNavigationUpdate());
	webContents.on('did-start-loading', () => {
		sendNavigationUpdate();
	});
	webContents.on('did-stop-loading', () => sendNavigationUpdate());
	webContents.on('page-title-updated', (e, title) => {
		sendNavigationUpdate();
	});

	// Обработка ошибок загрузки
	webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
		sendNavigationUpdate({
			errorCode,
			errorDescription,
			validatedURL,
			isMainFrame,
		});
	});

	// Добавляем к главному окну
	global.mainWindow.contentView.addChildView(view);

	const bounds = initialBounds || { x: 0, y: 0, width: 0, height: 0 };
	view.setBounds(bounds);

	global.windowContentViews[windowId] = {
		view,
		bounds,
		scale: 1,
		zIndex: 0,
		url: url || 'about:blank',
	};

	view._navListeners = [sendNavigationUpdate]; // можно потом отписаться

	//пробуем костылями обернуть xterm
	if (url == global.paths.xtermIndex) {
		global.$.ipc_xterm(view);
	}

	return view;
}

function updateWindowContentView(windowId, { x, y, width, height, scale }) {
	const entry = global.windowContentViews[windowId];
	if (!entry) return;

	const bounds = {
		x: Math.round(x),
		y: Math.round(y),
		width: Math.round(width),
		height: Math.round(height),
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

function setWindowContentZIndex(windowId, zIndex) {
	const entry = global.windowContentViews[windowId];
	if (!entry) return;
	entry.zIndex = zIndex;

	const entries = Object.entries(global.windowContentViews);
	entries.sort((a, b) => (a[1].zIndex || 0) - (b[1].zIndex || 0));

	// Удаляем все и добавляем заново в правильном порядке
	for (const [, e] of entries) {
		global.mainWindow.contentView.removeChildView(e.view);
	}
	for (const [, e] of entries) {
		global.mainWindow.contentView.addChildView(e.view);
		e.view.setBounds(e.bounds); // восстанавливаем bounds
	}
}

// Функции для работы с навигацией конкретного окна
function getWindowView(windowId) {
	const entry = global.windowContentViews?.[windowId];
	return entry?.view;
}

export default function () {
	// Глобальное хранилище: windowId -> { view, bounds, scale, zIndex, url }
	global.windowContentViews = {};

	ipcMain.on('create-window-content-view', (event, data) => {
		createWindowContentView(data.windowId, {
			url: data.url,
			preload: data.preload,
			initialBounds: data.bounds,
		});
	});

	ipcMain.on('update-window-content-view', (event, data) => {
		updateWindowContentView(data.windowId, {
			x: data.x,
			y: data.y,
			width: data.width,
			height: data.height,
			scale: data.scale,
		});
	});

	ipcMain.on('destroy-window-content-view', (event, data) => {
		destroyWindowContentView(data.windowId);
	});

	ipcMain.on('set-window-content-zindex', (event, data) => {
		setWindowContentZIndex(data.windowId, data.zIndex);
	});

	ipcMain.handle('get-desktop-view-bounds', () => {
		const item = global.tabs?.[global.activeTabIndex];
		if (!item || !item.view) {
			return { x: 0, y: 0, width: 0, height: 0 };
		}
		const bounds = item.view.getBounds();
		return bounds;
	});

	ipcMain.on('window-go-back', (event, windowId) => {
		const view = getWindowView(windowId);
		if (view?.webContents?.canGoBack?.()) {
			view.webContents.goBack();
		}
	});

	ipcMain.on('window-go-forward', (event, windowId) => {
		const view = getWindowView(windowId);
		if (view?.webContents?.canGoForward?.()) {
			view.webContents.goForward();
		}
	});

	ipcMain.on('window-reload', (event, windowId) => {
		const view = getWindowView(windowId);
		if (view?.webContents) {
			view.webContents.reload();
		}
	});

	ipcMain.on('window-load-url', (event, windowId, url) => {
		const view = getWindowView(windowId);
		if (view?.webContents) {
			view.webContents.loadURL(url);
		}
	});

	// Также добавим возможность остановить загрузку
	ipcMain.on('window-stop-load', (event, windowId) => {
		const view = getWindowView(windowId);
		if (view?.webContents?.isLoading?.()) {
			view.webContents.stop();
		}
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
}