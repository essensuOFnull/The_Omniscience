import electronPkg from 'electron';
const { BrowserWindow, screen, app, ipcMain } = electronPkg;
import { attachToWebContents } from './ipc_browserContextMenu.js';

export default async function () {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    const isSession = process.env.OMNISCIENCE_SESSION === '1';

    global.mainWindow = new BrowserWindow({
        x: 0,
        y: 0,
        width,
        height,
        transparent: true,
        backgroundColor: '#00000000',
        resizable: true,
        show: true,
        ...(isSession ? { type: 'desktop' } : {}),
        frame: false,
        icon: global.paths.icon,
        webPreferences: {
            enableRemoteModule: false,
            nodeIntegration: false,
            contextIsolation: true,
            autoplayPolicy: 'no-user-gesture-required',
            webSecurity: true,
            webviewTag: true,
        },
    });

    attachToWebContents(global.mainWindow.webContents);
    await global.$.mainWindow_on_loaded();
}