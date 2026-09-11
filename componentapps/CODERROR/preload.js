// preload.js — тоже в корень приложения.
import electronPkg from 'electron';
const { contextBridge, ipcRenderer } = electronPkg;

contextBridge.exposeInMainWorld('fs', {
  /** @returns {Promise<string|Uint8Array>} */
  readFile: (rel, encoding = null) => ipcRenderer.invoke('fs:readFile', rel, encoding),
  /** data: string | Uint8Array | ArrayBuffer */
  writeFile: (rel, data, encoding = null) =>
    ipcRenderer.invoke('fs:writeFile', rel, data, encoding),
  /** @returns {Promise<{name:string,isDirectory:boolean,isFile:boolean}[]>} */
  list: (rel = '.') => ipcRenderer.invoke('fs:list', rel),
  exists: (rel) => ipcRenderer.invoke('fs:exists', rel),
  mkdir: (rel) => ipcRenderer.invoke('fs:mkdir', rel),
  stat: (rel) => ipcRenderer.invoke('fs:stat', rel),
  unlink: (rel) => ipcRenderer.invoke('fs:unlink', rel),
  rmdir: (rel) => ipcRenderer.invoke('fs:rmdir', rel),
});