//tab_on_didNavigate.js
//у нас tab содержит и webContents, и tabData
import path from 'path';
import fs from "fs";

export default function(tab) {
    tab.webContents.on('page-title-updated', (event, title) => {
        tab.tabData.title = title;
        global.$.tabs_send_updated();
    });
    tab.webContents.on('did-navigate', (event, url) => {
        tab.tabData.url = url;
        global.$.tabs_send_updated();
    });
}