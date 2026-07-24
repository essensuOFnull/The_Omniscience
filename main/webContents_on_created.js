import electronPkg from 'electron';
const{app}=electronPkg;

export default function webContents_on_created() {
    app.on('web-contents-created', (_, wc) => {
        const type=wc.getType();
        if(type === 'webview'){
	        global.$.applyContextMenu(wc);
        }
        // BrowserView уже имеют preload, webview получит preload через сессию
        if (type === 'browserView' || type === 'webview') return;

        wc.on('dom-ready', () => {
            wc.executeJavaScript(global._.theme_css_filter).catch(() => {});
        });
    });
}