(function () {
    contextBridge.exposeInMainWorld('electron_tabBar_API', {
        tabs_on_update: (callback) => ipcRenderer.on('tabs_on_update', (event, data) => callback(data)),
        tab_create: () => ipcRenderer.send('tab_create'),
        desktop_create: () => ipcRenderer.send('desktop_create'),
        xterm_create: () => ipcRenderer.send('xterm_create'),
        tab_activate: (index) => ipcRenderer.send('tab_activate', index),
        tab_close: (index) => ipcRenderer.send('tab_close', index),
        tab_url_update: (index, newUrl) => ipcRenderer.send('tab_url_update', index, newUrl),
        tab_move: (from, to) => ipcRenderer.send('tab_move', from, to),
        tab_context_menu: (index, x, y) => ipcRenderer.send('tab_context_menu', index, x, y),
        tab_edit_url: (callback) => ipcRenderer.on('tab_edit_url', (event, index) => callback(index)),
        // Новые методы для управления окном
        window_minimize: () => ipcRenderer.send('window_minimize'),
        window_maximize: () => ipcRenderer.send('window_maximize'),
        window_close: () => ipcRenderer.send('window_close'),
    });
})();