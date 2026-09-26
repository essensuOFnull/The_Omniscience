import electronPkg from 'electron';
const { ipcMain, webContents } = electronPkg;

// Реестр view, которые когда-либо подписывались (для cleanup при уничтожении)
const subscribedViews = new Map(); // webContentsId -> WebContents

function forwardToShell(channel, data) {
	if (!global.mainWindow || global.mainWindow.isDestroyed()) return;
	global.mainWindow.webContents.send(channel, data);
}

export default function () {
	ipcMain.handle('get-project-root', () => global.paths.projectRoot || '');
	// ---- View → Shell: dispatch действия ----
	ipcMain.on('view:dispatch', (event, { type, payload }) => {
		forwardToShell('shell:view-dispatch', {
			fromId: event.sender.id,
			type,
			payload,
		});
	});

	// ---- View → Shell: подписки ----
	ipcMain.on('view:subscribe', (event, { paths }) => {
		const wc = event.sender;

		// Регистрируем webContents, чтобы знать, когда он умрёт
		if (!subscribedViews.has(wc.id)) {
			subscribedViews.set(wc.id, wc);
			wc.once('destroyed', () => {
				subscribedViews.delete(wc.id);
				forwardToShell('shell:view-gone', { fromId: wc.id });
			});
		}

		forwardToShell('shell:view-subscribe', {
			fromId: wc.id,
			paths: Array.isArray(paths) ? paths : [paths],
		});
	});

	ipcMain.on('view:unsubscribe', (event, { paths }) => {
		forwardToShell('shell:view-unsubscribe', {
			fromId: event.sender.id,
			paths: Array.isArray(paths) ? paths : [paths],
		});
	});

	// ---- Shell → View: push обновлений ----
	ipcMain.on('shell:send-to-view', (_event, { toId, channel, data }) => {
		const wc = webContents.fromId(toId);
		if (wc && !wc.isDestroyed()) {
			wc.send(channel, data);
		}
	});
}