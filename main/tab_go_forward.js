// tab_go_forward.js
export default function (index) {
    const tab = global.tabs[index];
    if (tab?.webContents?.canGoForward()) {
        tab.webContents.goForward();
    }
}