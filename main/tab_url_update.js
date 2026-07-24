// tab_url_update.js
export default function (index, newUrl) {
    const tab = global.tabs[index];
    if (!tab || tab.tabData.type !== 'web') return;
    
    tab.tabData.url = newUrl;
    tab.webContents.loadURL(newUrl);
    // опционально сбросить заголовок, пока страница не загрузится
    tab.tabData.title = '';
}