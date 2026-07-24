import electronPkg from 'electron';
const{BrowserWindow,screen,app}=electronPkg;

export default async function() {
    /*получаем размеры экрана*/
    const primaryDisplay=screen.getPrimaryDisplay();
    const {width,height}=primaryDisplay.workAreaSize;
    /*пока никакая вкладка не активна*/
    global.activeTabIndex=null;
    /*генерируем preload'ы*/
    await global.$.texts_load();
	await global.$.preloads_generate();
    /*создаем само окно*/
    global.mainWindow = new BrowserWindow({
        x:0,
        y:0,
        width,
        height,
        transparent:false,
        show: true,
        frame: false,
        icon: global.paths.icon,
        webPreferences: { enableRemoteModule:false, nodeIntegration: false, contextIsolation: true },
    });

    app.commandLine.appendSwitch('disable-blink-features','AutomationControlled')

    /*когда окно загрузится*/
    await global.$.mainWindow_on_loaded();
}
