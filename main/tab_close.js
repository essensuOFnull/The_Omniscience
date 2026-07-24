// tab_close.js
export default function (index) {
    const tabs = global.tabs;
    if (tabs && index >= 0 && index < tabs.length) {
        const tab = tabs[index];
        // Уничтожаем tab.view, если он есть
        // 1. Уничтожаем веб-контент представления
        if (tab.webContents && !tab.webContents.isDestroyed()) {
            tab.webContents.destroy();
        }
        // 3. Сбрасываем ссылку для сборщика мусора
        tab.view = null;
        // Удаляем из массива
        tabs.splice(index, 1);
        // Сдвигаем активный индекс при необходимости
        if (global.activeTabIndex >= tabs.length) {
            global.activeTabIndex = Math.max(0, tabs.length - 1);
        }
    }
}