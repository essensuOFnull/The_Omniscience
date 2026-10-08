(function () {
    if (process.contextIsolated) {
        if (window.electron_overview_API) return;
        try {
            contextBridge.exposeInMainWorld('electron_overview_API', {
                invoke: (channel, data) => ipcRenderer.invoke(channel, data),
                send: (channel, data) => ipcRenderer.send(channel, data),
                on: (channel, cb) => {
                    const listener = (_e, ...args) => cb(...args);
                    ipcRenderer.on(channel, listener);
                    return () => ipcRenderer.removeListener(channel, listener);
                },
            });
        } catch (err) {
            console.error('[preload] contextBridge failed:', err);
        }
    }
})();