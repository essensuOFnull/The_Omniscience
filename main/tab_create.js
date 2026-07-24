import electronPkg from 'electron';
const{BrowserView}=electronPkg;

export default function (url, type, preload) {
	const view = new BrowserView({
		webPreferences: {
			preload,
			backgroundColor: '#00000000',
			transparent: true,
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: false,
			webviewTag: true,
			webSecurity: false,
		},
	});

	global.mainWindow.addBrowserView(view);
	view.webContents.loadURL(url);

	const tabData = {
		id: view.webContents.id,
		type,
		url,
		title: type === 'desktop' ? `Рабочий стол ${global.desktopCounter++}` : url,
	};
	view.tabData = tabData;

	global.tabs.push(view);
	const newIndex = global.tabs.length - 1;
	global.$.tab_on_didNavigate(view);
	global.$.tab_activate(newIndex);

	/*применяем контекстное меню*/
	global.$.applyContextMenu(view.webContents);

	if(type === 'xterm'){
		global.$.ipc_xterm(view);
	}

	return view;
}
