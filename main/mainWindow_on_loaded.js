// main/mainWindow_on_loaded.js
import { ipcMain, BrowserWindow } from 'electron'; // обязательно добавьте этот импорт, если его нет

export default async function () {
	global.mainWindow.maximize();

	global.mainWindow.loadURL(global.paths.reactIndex);

	global.$.mainWindow_bounds_update();

	global.mainWindow.on('resize', global.$.mainWindow_bounds_update);
	global.mainWindow.on('maximize', global.$.mainWindow_bounds_update);
	global.mainWindow.on('enter-full-screen', global.$.mainWindow_bounds_update);
	global.mainWindow.on('leave-full-screen', global.$.mainWindow_bounds_update);
	global.mainWindow.on('unmaximize', global.$.mainWindow_bounds_update);
	global.mainWindow.on('closed', () => { });

	global.$.ipc_setup();

	global.$.tabs_send_updated();
}