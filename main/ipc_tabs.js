import electronPkg from 'electron';
const{ipcMain}=electronPkg;
import path from 'path';

export default function () {
    ipcMain.on('desktop_create', (event) => {global.$.tab_create(global.paths.desktopIndex, 'desktop',global.paths.desktopPreload)});
    ipcMain.on('tab_create', (event) => {global.$.tab_create(global.config.homepageUrl, 'web',global.paths.webtabPreload)});
    ipcMain.on('xterm_create', (event) => {global.$.tab_create(global.paths.xtermIndex, 'xterm',global.paths.xtermPreload)});
    ipcMain.on('tab_activate', (event, index) => { global.$.tab_activate(index); global.$.tabs_send_updated(); });
    ipcMain.on('tab_close', (event, index) => { global.$.tab_close(index); global.$.tabs_send_updated(); });
    ipcMain.on('tab_url_update', (event, index, newUrl) => { global.$.tab_url_update(index, newUrl); global.$.tabs_send_updated(); });
    ipcMain.on('tab_move', (event, from, to) => { global.$.tab_move(from, to); global.$.tabs_send_updated(); });
    ipcMain.on('tab_context_menu', (event, index, x, y) => global.$.tabBar_contextMenu_show(index, x, y));
    ipcMain.on('tab_go_back', (event, index) => {global.$.tab_go_back(index)});
    ipcMain.on('tab_go_forward', (event, index) => {global.$.tab_go_forward(index)});
}
