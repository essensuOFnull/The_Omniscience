(function () {
  contextBridge.exposeInMainWorld('electron_mainWindow_API', {
    // Состояние окна (maximize/fullscreen)
    onWindowStateChange: (callback) => {
      const handler = (_, state) => callback(state);
      ipcRenderer.on('window-state-changed', handler);
      // Возвращаем функцию для отписки, если понадобится
      return () => ipcRenderer.removeListener('window-state-changed', handler);
    },

    // Запуск ресайза (только направление)
    startResize: (direction) => {
      ipcRenderer.send('start-resize', direction);
    },

    // Передача координат мыши во время движения
    sendResizeMove: (screenX, screenY) => {
      ipcRenderer.send('resize-move', screenX, screenY);
    },

    // Завершение ресайза
    endResize: () => {
      ipcRenderer.send('resize-end');
    }
  });
})();