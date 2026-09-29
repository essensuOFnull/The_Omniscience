(function () {
  if (window.electron_panel_API) return;

  contextBridge.exposeInMainWorld('electron_panel_API', {
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    on: (channel, cb) => {
      const wrapped = (_e, data) => cb(data);
      ipcRenderer.on(channel, wrapped);
      return () => ipcRenderer.removeListener(channel, wrapped);
    },

    // Специальный метод: панель двигает ТОЛЬКО себя, id берётся из main
    updateOwnBounds: (bounds, moveChildren) =>
      ipcRenderer.send('view:update-own-bounds', { bounds, moveChildren }),
  });
})();