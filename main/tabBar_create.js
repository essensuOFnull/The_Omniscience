import electronPkg from 'electron';
const{BrowserView}=electronPkg;

export default function() {
    global.tabBar = new BrowserView({
        webPreferences: {
            transparent:true,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            preload:global.paths.tabbarPreload
        },
    });
    /*устанавливаем html, который будет в панели*/
    global.tabBar.webContents.loadFile(global.paths.tabBarHTML);
    /*отображаем панель*/
    global.mainWindow.addBrowserView(global.tabBar);
    /*устанавливаем панель вкладок выше всего*/
    global.mainWindow.setTopBrowserView(global.tabBar);
}