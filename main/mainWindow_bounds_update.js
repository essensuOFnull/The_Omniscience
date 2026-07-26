export default function () {
	/*получаем полноэкранно ли окно в global*/
	global.$.isFullScreen_update();
	/*получаем новые размры окна в global*/
	global.$.mainWindow_size_update();
	/*обновляем размеры активной вкладки и скрываем остальные*/
	global.$.tab_activate(global.activeTabIndex);

	const view = global.tabs?.[global.activeTabIndex];
    if (view && global.mainWindow) {
        const bounds = view.getBounds();
        global.mainWindow.webContents.send('desktop-view-bounds-changed', bounds);
    }
}