import electronPkg from 'electron';
const { contextBridge, ipcRenderer } = electronPkg;

contextBridge.exposeInMainWorld('electron_min_API', {
    sendNotification: (title, body) => {
        ipcRenderer.send('show-notification', { title, body });
    },
    startServer: (port) => {
        ipcRenderer.send('start-server', port);
    },
    stopServer: () => {
        ipcRenderer.send('stop-server');
    },
    onServerStarted: (callback) => {
        ipcRenderer.once('server-started', (event, port) => callback(null, port));
        ipcRenderer.once('server-error', (event, error) => callback(error));
    },
});