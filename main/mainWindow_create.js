import electronPkg from 'electron';
const { BrowserWindow, screen, app, ipcMain } = electronPkg;
import { attachToWebContents } from './ipc_browserContextMenu.js';
import { connectLogSocket } from '../session/log-client.mjs';

// Защита от повторного запуска: before-quit, SIGTERM/SIGINT могут
// сработать почти одновременно, а процедура завершения — не быстрая.
let shuttingDown = false;

/**
 * Корректное завершение Omniscience.
 *
 * Порядок:
 *   1. Берём список всех BrowserWindow, кроме главного.
 *   2. Закрываем их по одному; после каждого — короткий yield
 *      (setImmediate), чтобы event loop успел обработать close и,
 *      если приложение плодит окна прямо сейчас — увидеть новые.
 *   3. Цикл повторяется, пока чужих окон не останется.
 *      Это закрывает случай "новое окно появилось посреди завершения".
 *   4. Закрываем сам mainWindow.
 *   5. app.quit() — гарантированный выход процесса.
 *
 * Идемпотентна: повторные вызовы ничего не делают.
 */

export default async function () {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    global.mainWindow = new BrowserWindow({
        x: 0,
        y: 0,
        width,
        height,
        transparent: true,
        backgroundColor: '#00000000',
        resizable: true,
        show: true,
        type: 'desktop',
        frame: false,
        icon: global.paths.icon,
        focusable: true,
        skipTaskbar: true,
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

    // Если mainWindow закрывают напрямую (X, Alt+F4, kill окна) —
    // перехватываем quit и проводим ту же процедуру.
    app.on('before-quit', (e) => {
        if (!shuttingDown) {
            e.preventDefault();
        }
    });

    // Логи из socket → renderer.
    let disconnectLog = connectLogSocket(chunk => {
      if (global.mainWindow && !global.mainWindow.isDestroyed()) {
        global.mainWindow.webContents.send('console:data', chunk);
      }
    });
    
    // renderer попросил прислать — уже готов.
    ipcMain.on('console:ready', () => {
      // буфер уже отправлен через socket при подключении,
      // но если что-то прилетело раньше монтирования — оно в буфере
      // log-client'а и уже переслано наверх.
    });

    await global.$.mainWindow_on_loaded();
}