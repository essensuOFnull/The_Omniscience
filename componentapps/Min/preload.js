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
    ipcRenderer.on('server-started', (event, port) => callback(null, port));
    ipcRenderer.on('server-error', (event, error) => callback(error));
  },
  removeServerListeners: () => {
    ipcRenderer.removeAllListeners('server-started');
    ipcRenderer.removeAllListeners('server-error');
  }
});