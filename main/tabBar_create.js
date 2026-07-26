import electronPkg from 'electron';
const { WebContentsView } = electronPkg;

export default function() {
    global.tabBar = new WebContentsView({
        webPreferences: {
            transparent:true,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            preload:global.paths.tabbarPreload
        },
    });
    /*устанавливаем html, который будет в панели*/
    global.tabBar.webContents.loadURL(global.paths.tabBarHTML);
    /*отображаем панель*/
    global.mainWindow.contentView.addChildView(global.tabBar);
}