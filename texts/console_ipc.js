(async () => {
    contextBridge.exposeInMainWorld('omniscience', {
        onConsoleData: cb => ipcRenderer.on('console:data', (_e, chunk) => cb(chunk)),
        consoleReady: () => ipcRenderer.send('console:ready'),
    });
})();