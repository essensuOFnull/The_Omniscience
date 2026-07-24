// tab_go_back.js
export default function (index) {
    const tab = global.tabs[index];
    if (tab?.webContents?.canGoBack()) {
        tab.webContents.goBack();
    }
}