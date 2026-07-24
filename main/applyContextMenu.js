import electronPkg from 'electron';
const{Menu}=electronPkg;
import videoPip from './videoPip.js';
import layoutSwap from './layoutSwap.js';
import originalMenu from './originalMenu.js';

export default function applyContextMenu(webContents) {
    webContents.on('context-menu', (event, params) => {
        const items = [];
        videoPip(items, params, webContents);
        layoutSwap(items, params, webContents);
        originalMenu(items, params, webContents);

        if (items.length > 0) {
            Menu.buildFromTemplate(items).popup({ window: webContents });
        }
    });
}