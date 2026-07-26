export default function() {
    // Если tabBar не существует, но есть mainWindow – используем его
    if (!global.tabBar && global.mainWindow) {
        global.tabBar = global.mainWindow;
        console.log('tabs_send_updated: tabBar привязан к mainWindow');
    }

    // Если массив вкладок не создан – создаём пустой
    if (!global.tabs) {
        global.tabs = [];
        console.log('tabs_send_updated: создан пустой global.tabs');
    }

    // Если индекс активной вкладки не задан – ставим -1
    if (typeof global.activeTabIndex !== 'number') {
        global.activeTabIndex = -1;
        console.log('tabs_send_updated: activeTabIndex = -1');
    }

    // Если tabBar всё ещё отсутствует – выходим с предупреждением
    if (!global.tabBar) {
        console.warn('tabs_send_updated: нет tabBar, событие не отправлено');
        return;
    }

    // Формируем данные
    const tabsData = global.tabs.map((view, index) => ({
        ...view.tabData
    }));

    // Получаем webContents для отправки
    const webContents = global.tabBar.webContents || global.tabBar;
    if (webContents && !webContents.isDestroyed()) {
        webContents.send('tabs_on_update', {
            tabsData,
            mainWindowWidth: global.mainWindowWidth,
            mainWindowHeight: global.mainWindowHeight,
            activeTabIndex: global.activeTabIndex
        });
    } else {
        console.warn('tabs_send_updated: webContents недоступен или уничтожен');
    }
}