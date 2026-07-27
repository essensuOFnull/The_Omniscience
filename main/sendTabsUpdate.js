export default function() {
    if (!global.mainWindow || global.mainWindow.isDestroyed()) return;
    const tabsData = global.tabs.map(item => item.tabData);
    const activeIndex = global.activeTabIndex !== undefined ? global.activeTabIndex : -1;
    global.mainWindow.webContents.send('tabs_on_update', {
        tabsData,
        activeTabIndex: activeIndex,
    });
};