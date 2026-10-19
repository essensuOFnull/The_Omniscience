// GTK bridge preload — API для окон-зеркал.
// Работает через contextBridge, потому что contextIsolation=true.
(() => {
  const FRAME_CHANNEL = 'gtk-bridge:frame';

  contextBridge.exposeInMainWorld('gtkBridge', {
    // Подписка на кадры. Возвращает функцию отписки.
    onFrame: (cb) => {
      if (typeof cb !== 'function') return () => { };
      const handler = (_e, frame) => {
        try { cb(frame); }
        catch (err) { console.error('[gtkBridge.onFrame]', err); }
      };
      ipcRenderer.on(FRAME_CHANNEL, handler);
      return () => ipcRenderer.removeListener(FRAME_CHANNEL, handler);
    },

    // Отправка клика/значения в GTK
    send: (payload) => {
      try { ipcRenderer.send('gtk-bridge:send', payload); }
      catch (err) { console.error('[gtkBridge.send]', err); }
    },

    // Закрыть окно-зеркало
    closeSelf: () => ipcRenderer.send('gtk-bridge:close-self'),

    // Диагностика
    getEnabled: () => ipcRenderer.invoke('gtk-bridge:get-enabled'),
  });
})();