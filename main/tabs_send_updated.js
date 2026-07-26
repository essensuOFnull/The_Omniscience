export default function() {
    if (!global.tabBar || !global.tabs) return;

    const tabsData = global.tabs.map((view, index) => ({
        ...view.tabData
    }));

    global.tabBar.webContents.send('tabs_on_update',{
        tabsData,

        mainWindowWidth:global.mainWindowWidth,
        mainWindowHeight:global.mainWindowHeight,
        activeTabIndex:global.activeTabIndex
    });
}