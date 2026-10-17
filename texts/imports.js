const { contextBridge, ipcRenderer, webUtils } = require('electron');
const projectRoot = ipcRenderer.sendSync('get-project-root');
contextBridge.exposeInMainWorld('__PROJECT_ROOT__', projectRoot);