const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron_componentapp_xterm_API', {
  on: (event, callback) => {
    const wrapped = (_, data) => callback(data);
    ipcRenderer.on(event, wrapped);
    // Возвращаем функцию для снятия слушателя.
    return () => ipcRenderer.removeListener(event, wrapped);
  },
  send: (event, data) => {
    ipcRenderer.send(event, data);
  },
});