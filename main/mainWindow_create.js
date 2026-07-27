import electronPkg from 'electron';
const { BrowserWindow, screen, app } = electronPkg;

export default async function () {
    /* получаем размеры экрана */
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    /* пока никакая вкладка не активна */
    global.activeTabIndex = null;

    /* генерируем preload'ы */
    await global.$.texts_load();
    await global.$.preloads_generate();

    /* создаем само окно */
    global.mainWindow = new BrowserWindow({
        x: 0,
        y: 0,
        width,
        height,
        transparent:true,
        backgroundColor:'#000000ff',
        resizable:true,
        show: true,

        // --- ИЗМЕНЕНИЯ ДЛЯ СОВРЕМЕННОЙ РАМКИ ВКЛАДОК ---
        frame: false,                     // Скрываем стандартную рамку ОС
        // ----------------------------------------------

        icon: global.paths.icon,
        webPreferences: {
            webviewTag: true,
            enableRemoteModule: false,
            nodeIntegration: false,
            contextIsolation: true,
            preload: global.paths.reactPreload,
        },
    });

    app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

    // Функция для отправки актуальных размеров окна в рендерер при изменении размера
    const sendWindowBounds = () => {
        if (!global.mainWindow || global.mainWindow.isDestroyed()) return;
        const bounds = global.mainWindow.getBounds();
        global.mainWindow.webContents.send('window-resize', {
            width: bounds.width,
            height: bounds.height
        });
    };

    /* когда окно загрузится */
    await global.$.mainWindow_on_loaded();
}
