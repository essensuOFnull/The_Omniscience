export default function () {
    if(global.activeTabIndex===null)return;
    
    global.tabs[global.activeTabIndex].setBounds({
        x: 0,
        y: global.config.tabBarHeight,
        width: global.mainWindowWidth,
        height: global.mainWindowHeight - global.config.tabBarHeight
    });
}