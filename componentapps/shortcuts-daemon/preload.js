const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('shortcutAPI', {
    list:    () => ipcRenderer.invoke('shortcuts:list'),
    set:     (accelerator, command) => ipcRenderer.invoke('shortcuts:set', { accelerator, command }),
    remove:  (accelerator) => ipcRenderer.invoke('shortcuts:remove', accelerator),
    execute: (command)     => ipcRenderer.invoke('shortcuts:execute', command),
    layoutsGet:        ()     => ipcRenderer.invoke('layouts:get'),
    layoutsSet:        (list) => ipcRenderer.invoke('layouts:set', list),
    layoutsSwitchNext: ()     => ipcRenderer.invoke('layouts:switch-next'),
});