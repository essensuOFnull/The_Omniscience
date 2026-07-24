import electronPkg from 'electron';
const{BrowserView}=electronPkg;

export default function() {
    global.background = new BrowserView({
        webPreferences: {
            transparent:true,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false
        },
    });
    /*устанавливаем html, который будет у фона*/
    global.background.webContents.loadFile(global.paths.backgroundHTML);
    /*отображаем фон рабочего стола*/
    global.mainWindow.addBrowserView(global.background);
}