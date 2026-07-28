// main/mainWindow_on_loaded.js
import { ipcMain, BrowserWindow } from 'electron'; // обязательно добавьте этот импорт, если его нет

export default async function () {
	global.mainWindow.loadURL(global.paths.reactIndex);

	global.mainWindow.on('closed', () => { });

	global.$.ipc_setup();

	await global.$.loadComponentIpc();

	global.mainWindow.maximize();
}