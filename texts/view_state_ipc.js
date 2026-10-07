(function () {
	if (process.contextIsolated) {
		try {
			if (window.electron_view_API) return;

			contextBridge.exposeInMainWorld('electron_view_API', {
				dispatch: (type, payload) =>
					ipcRenderer.send('view:dispatch', { type, payload }),

				subscribe: (paths) =>
					ipcRenderer.send('view:subscribe', {
						paths: Array.isArray(paths) ? paths : [paths],
					}),

				unsubscribe: (paths) =>
					ipcRenderer.send('view:unsubscribe', {
						paths: Array.isArray(paths) ? paths : [paths],
					}),

				onStateUpdate: (cb) => {
					const wrapped = (_event, data) => cb(data);
					ipcRenderer.on('view:state-update', wrapped);
					return () => ipcRenderer.removeListener('view:state-update', wrapped);
				},

				getAppsList: () => ipcRenderer.invoke('get-apps-list'),
				getProjectRoot: () => ipcRenderer.invoke('get-project-root'),
			});
		} catch (err) {
			console.error('[preload] contextBridge failed:', err);
		}
	}
})();