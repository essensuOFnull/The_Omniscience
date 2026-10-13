const { contextBridge, ipcRenderer } = require('electron');

const urlParams = new URLSearchParams(window.location.search);
const windowId = urlParams.get('windowId') || 'unknown';

contextBridge.exposeInMainWorld('gtkBridge', {
  windowId,

  onFrame: (cb) => {
    const handler = (_evt, frame) => {
      try { cb(frame); } catch (e) { console.error('[gtkBridge.onFrame]', e); }
    };
    ipcRenderer.on('gtk-frame', handler);
    return () => ipcRenderer.removeListener('gtk-frame', handler);
  },

  send: (payload) => ipcRenderer.send('gtk-send', payload),
  closeSelf: () => ipcRenderer.send('window-close-self'),

  version: process.versions.electron,
  platform: process.platform,
});