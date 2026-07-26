(function () {
	contextBridge.exposeInMainWorld('electron_desktop_API', {
		getConfig: () => ipcRenderer.invoke('get-config'),
		getAppsList: () => ipcRenderer.invoke('get-apps-list'),
		registerWebview: (webContentsId, appId, windowId) =>
			ipcRenderer.invoke('register-webview', { webContentsId, appId, windowId }),
		getWebviewPreloadPath: () => ipcRenderer.invoke('get-webview-preload-path'),
		invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
		// новые методы для событий
		send: (channel, ...args) => ipcRenderer.send(channel, ...args),
		on: (channel, listener) => {
			const wrappedListener = (event, ...args) => listener(...args);
			ipcRenderer.on(channel, wrappedListener);
			return wrappedListener; // возвращаем, чтобы можно было снять
		},
		removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener),

		createWindowContentView: (data) => ipcRenderer.send('create-window-content-view', data),
		updateWindowContentView: (data) => ipcRenderer.send('update-window-content-view', data),
		destroyWindowContentView: (data) => ipcRenderer.send('destroy-window-content-view', data),
		setWindowContentZIndex: (data) => ipcRenderer.send('set-window-content-zindex', data),

		getDesktopViewBounds: () => ipcRenderer.invoke('get-desktop-view-bounds'),
		onDesktopViewBoundsChanged: (callback) => {
			ipcRenderer.on('desktop-view-bounds-changed', (event, bounds) => callback(bounds));
			return () => ipcRenderer.removeListener('desktop-view-bounds-changed', callback);
		},

		// Навигация
		goBack: (windowId) => ipcRenderer.send('window-go-back', windowId),
		goForward: (windowId) => ipcRenderer.send('window-go-forward', windowId),
		reload: (windowId) => ipcRenderer.send('window-reload', windowId),
		loadUrl: (windowId, url) => ipcRenderer.send('window-load-url', windowId, url),
		stopLoad: (windowId) => ipcRenderer.send('window-stop-load', windowId),

		// Получить состояние навигации
		getWindowNavState: (windowId) => ipcRenderer.invoke('get-window-nav-state', windowId),

		// Подписаться на обновления навигации
		onWindowNavigationUpdate: (callback) => {
			ipcRenderer.on('window-navigation-update', (event, data) => callback(data));
			return () => ipcRenderer.removeListener('window-navigation-update', callback);
		},
	});
})();