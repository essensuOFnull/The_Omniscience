import electronPkg from 'electron';
const{ipcMain}=electronPkg;

export default function() {
	if (!global.webviewRegistry) {
		global.webviewRegistry = new Map();
	}

	ipcMain.handle('register-webview', (_, { webContentsId, appId, windowId }) => {
		global.webviewRegistry.set(webContentsId, { appId, windowId });
		return true;
	});
}