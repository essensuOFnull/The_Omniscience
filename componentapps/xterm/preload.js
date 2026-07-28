import electronPkg from 'electron';
const { contextBridge, ipcRenderer } = electronPkg;

contextBridge.exposeInMainWorld('electron_componentapp_xterm_API', {
	on: (event, callback) => {
		ipcRenderer.on(event, (_, data) => callback(data));
	},
	send: (event, data) => {
		ipcRenderer.send(event, data);
	}
});