(function () {
	if (process.contextIsolated) {
		try {
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

				getDesktopViewBounds: () => ipcRenderer.invoke('get-desktop-view-bounds'),

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
				setWebViewBounds: (id, bounds) => ipcRenderer.send('set-webview-bounds', { id, bounds }),
				onRequestWebViewBounds: (callback) => ipcRenderer.on('request-webview-bounds', (event, id) => callback(id)),
				createView: (opts) => ipcRenderer.send('view:create', opts),
				updateViewBounds: (opts) => ipcRenderer.send('view:update-bounds', opts),
				destroyView: (opts) => ipcRenderer.send('view:destroy', opts),
				setViewZ: (opts) => ipcRenderer.send('view:set-z', opts),
				getViewBounds: (id) => ipcRenderer.invoke('view:get-bounds', { id }),
				getProjectRoot: () => ipcRenderer.invoke('get-project-root'),
				// Файловая система (FileView)
				getUserDirs: () => ipcRenderer.invoke('fs:get-user-dirs'),
				readDir: (path) => ipcRenderer.invoke('fs:read-dir', { path }),
				getFileInfo: (path) => ipcRenderer.invoke('fs:get-info', { path }),
				getFileIcon: (path) => ipcRenderer.invoke('fs:get-icon', { path }),
				openPath: (path) => ipcRenderer.invoke('fs:open', { path }),
				revealPath: (path) => ipcRenderer.invoke('fs:reveal', { path }),
				trashPath: (path) => ipcRenderer.invoke('fs:trash', { path }),
				deletePath: (path) => ipcRenderer.invoke('fs:delete', { path }),
				renamePath: (path, newName) => ipcRenderer.invoke('fs:rename', { path, newName }),

				getAppsForFile: (path) => ipcRenderer.invoke('fs:get-apps-for-file', { path }),
				openWith: (path, desktopId) => ipcRenderer.invoke('fs:open-with', { path, desktopId }),

				watchStart: (path) => ipcRenderer.send('fs:watch-start', { path }),
				watchStop: (path) => ipcRenderer.send('fs:watch-stop', { path }),

				getTemplates: () => ipcRenderer.invoke('fs:get-templates'),
				createFolder: (dir, name) => ipcRenderer.invoke('fs:create-folder', { dir, name }),
				createFile: (dir, name) => ipcRenderer.invoke('fs:create-file', { dir, name }),
				createFromTemplate: (dir, templatePath, name) =>
					ipcRenderer.invoke('fs:create-from-template', { dir, templatePath, name }),
				openKRunner: () => ipcRenderer.invoke('shell:run-krunner'),
				openSystemSettings: () => ipcRenderer.invoke('shell:systemsettings'),
				openLogout: () => ipcRenderer.invoke('shell:logout'),
				setContextPaths: (payload) => ipcRenderer.send('fs:context-paths', payload),
				copyFiles: (paths) => ipcRenderer.invoke('fs:copy', { paths }),
				cutFiles: (paths) => ipcRenderer.invoke('fs:cut', { paths }),
				pasteFiles: (dir) => ipcRenderer.invoke('fs:paste', { dir }),
				getCutPaths: () => ipcRenderer.invoke('fs:get-cut'),
				clearCut: () => ipcRenderer.invoke('fs:clear-cut'),
				startDrag: (paths) => ipcRenderer.send('fs:start-drag', { paths }),
				dropPaths: (srcPaths, destDir, isMove) =>
					ipcRenderer.invoke('fs:drop-paths', { srcPaths, destDir, isMove }),

				// Для drag-in из внешних приложений (Electron 32+ требует webUtils)
				getPathForFile: (file) => {
					try {
						if (webUtils?.getPathForFile) return webUtils.getPathForFile(file);
					} catch (_) { }
					return file?.path || null;
				},
				writeDroppedFiles: (files, destDir) =>
					ipcRenderer.invoke('fs:write-dropped-files', { files, destDir }),
				enableKeyboardCapture: () => ipcRenderer.send('fs:enable-keyboard-capture'),
				disableKeyboardCapture: () => ipcRenderer.send('fs:disable-keyboard-capture'),
			});
		} catch (err) {
			console.error('[preload] contextBridge failed:', err);
		}
	}
})();