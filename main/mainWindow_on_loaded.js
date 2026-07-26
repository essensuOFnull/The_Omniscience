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

	// -------------------------------------------------------
	// Обработчики управления окном – свернуть/развернуть/закрыть
	// -------------------------------------------------------
	ipcMain.on('window_minimize', (event) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		if (win) win.minimize();
	});

	ipcMain.on('window_maximize', (event) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		if (!win) return;
		win.isMaximized() ? win.unmaximize() : win.maximize();
	});

	ipcMain.on('window_close', (event) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		if (win) win.close();
	});

	ipcMain.on('set-webview-bounds', (event, { id, bounds }) => {
		const tab = global.tabs.find(item => item.tabData.id === id);
		if (tab && tab.view) {
			tab.view.setBounds(bounds);
		}
	});

	global.$.tabs_send_updated();
}