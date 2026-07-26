// background_create.js
import electronPkg from 'electron';
const { WebContentsView } = electronPkg;

export default function() {
    global.background = new WebContentsView({
        webPreferences: {
            transparent: true,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false
        },
    });
    global.background.webContents.loadURL(global.paths.backgroundHTML);
    global.mainWindow.contentView.addChildView(global.background);
}