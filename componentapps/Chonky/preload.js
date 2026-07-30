import electronPkg from 'electron';
const { contextBridge, ipcRenderer } = electronPkg;

contextBridge.exposeInMainWorld('electron_componentapp_API', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  on: (channel, listener) => {
    const wrapped = (event, ...args) => listener(...args);
    ipcRenderer.on(channel, wrapped);
    return wrapped;
  },
  removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener),
});
