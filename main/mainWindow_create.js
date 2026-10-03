import electronPkg from 'electron';
const { BrowserWindow, screen, app } = electronPkg;

export default async function () {
    /* получаем размеры экрана */
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
    app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
    app.commandLine.appendSwitch('disable-renderer-backgrounding');
    app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

    /* генерируем preload'ы */
    await global.$.texts_load();
    await global.$.preloads_generate();

    const isSession = process.env.OMNISCIENCE_SESSION === '1';
    /* создаем само окно */
    global.mainWindow = new BrowserWindow({
        x: 0,
        y: 0,
        width,
        height,
        transparent: true,
        backgroundColor: '#000000ff',
        resizable: true,
        show: true,
        // type: 'desktop' — только для сессии из LightDM.
        // Когда Omniscience запущен как программа внутри другого DE —
        // окно должно быть обычным по задумке.
        ...(isSession ? { type: 'desktop' } : {}),
        // --- ИЗМЕНЕНИЯ ДЛЯ СОВРЕМЕННОЙ РАМКИ ВКЛАДОК ---
        frame: false,                     // Скрываем стандартную рамку ОС
        // ----------------------------------------------

        icon: global.paths.icon,
        webPreferences: {
            enableRemoteModule: false,
            nodeIntegration: false,
            contextIsolation: true,
            autoplayPolicy: "no-user-gesture-required",
            webSecurity: true,
            webviewTag: true,
        },
    });

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
