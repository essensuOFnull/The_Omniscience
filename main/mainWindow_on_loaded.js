// main/mainWindow_on_loaded.js
export default async function () {
	global.mainWindow.maximize();

	/* фон, панель вкладок, bounds, ивенты, ipc */
	global.$.background_create();
	global.$.tabBar_create();
	global.$.mainWindow_bounds_update();

	//global.mainWindow.on('resize', global.$.mainWindow_bounds_update);
	//global.mainWindow.on('maximize', global.$.mainWindow_bounds_update);
	//global.mainWindow.on('enter-full-screen', global.$.mainWindow_bounds_update);
	//global.mainWindow.on('leave-full-screen', global.$.mainWindow_bounds_update);
	//global.mainWindow.on('unmaximize', global.$.mainWindow_bounds_update);
	global.mainWindow.on('closed', () => { });

	global.$.ipc_setup();
}
