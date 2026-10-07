// main/mainWindow_on_loaded.js
export default async function () {
	global.topbarWindow.loadURL(global.paths.topBarIndex);

	global.topbarWindow.on('closed', () => { });

	//await global.$.loadComponentIpc();
}