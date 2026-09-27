(function () {
	if (window.electron_frame_API) return;

	contextBridge.exposeInMainWorld('electron_frame_API', {
		sendEvent: (windowId, type, payload) =>
			ipcRenderer.send('frame:event', { windowId, type, payload }),

		onProps: (cb) => {
			const wrapped = (_e, data) => cb(data || {});
			ipcRenderer.on('frame:props', wrapped);
			return () => ipcRenderer.removeListener('frame:props', wrapped);
		},

		// Drag / Resize через pointer lock (работает и на Wayland)
		startDrag: (windowId) => ipcRenderer.send('frame:drag-start', { windowId }),
		dragDelta: (windowId, dx, dy) => ipcRenderer.send('frame:drag-delta', { windowId, dx, dy }),
		endDrag: (windowId) => ipcRenderer.send('frame:drag-end', { windowId }),

		startResize: (windowId, direction) => ipcRenderer.send('frame:resize-start', { windowId, direction }),
		resizeDelta: (windowId, direction, dx, dy) =>
			ipcRenderer.send('frame:resize-delta', { windowId, direction, dx, dy }),
		endResize: (windowId) => ipcRenderer.send('frame:resize-end', { windowId }),
	});
})();