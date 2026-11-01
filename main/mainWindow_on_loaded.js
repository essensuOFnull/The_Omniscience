// main/mainWindow_on_loaded.js
export default async function () {
	global.mainWindow.loadURL(global.paths.reactIndex);

	global.mainWindow.on('closed', () => { });

	await global.$.loadComponentIpc();

	if (process.platform !== 'win32') {
		global.mainWindow.maximize();
	}
}