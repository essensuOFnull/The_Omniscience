(function () {
	if (window.electron_devtools_API) return;

	contextBridge.exposeInMainWorld('electron_devtools_API', {
		send: (channel, ...args) => ipcRenderer.send(channel, ...args),
		invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
		on: (channel, cb) => {
			const wrapped = (_e, data) => cb(data);
			ipcRenderer.on(channel, wrapped);
			return () => ipcRenderer.removeListener(channel, wrapped);
		},
		removeListener: (channel, cb) => ipcRenderer.removeListener(channel, cb),
	});
})();