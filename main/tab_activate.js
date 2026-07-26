export default function(index) {
    if (!global.tabs || index < 0 || index >= global.tabs.length) return;

    // Скрываем все view
    global.tabs.forEach((item, i) => {
        if (item.view) {
            if (i === index) {
                // Для активной вкладки позже установим правильные размеры из renderer
                // Пока оставляем как есть (возможно, уже есть размеры)
            } else {
                // Скрываем остальные
                item.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
            }
        }
    });

    global.activeTabIndex = index;
    if (global.$.sendTabsUpdate) {
        global.$.sendTabsUpdate();
    }

    // Если активная вкладка имеет view, запрашиваем у renderer текущие размеры контейнера
    const activeItem = global.tabs[index];
    if (activeItem.view) {
        // Отправляем событие в renderer, чтобы тот прислал новые размеры
        if (global.mainWindow && !global.mainWindow.isDestroyed()) {
            global.mainWindow.webContents.send('request-webview-bounds', activeItem.tabData.id);
        }
    }
};