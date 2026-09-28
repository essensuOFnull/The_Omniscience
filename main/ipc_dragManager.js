import electronPkg from 'electron';
const { ipcMain, webContents } = electronPkg;

function sendToShell(channel, data) {
	if (!global.mainWindow || global.mainWindow.isDestroyed()) return;
	global.mainWindow.webContents.send(channel, data);
}

export default function () {
	// Определяем, какому windowId принадлежит вызывающий webContents
	ipcMain.handle('frame:get-window-id', (event) => {
		const senderId = event.sender.id;
		for (const [wid, entry] of Object.entries(global.windowContentViews || {})) {
			if (entry.view?.webContents?.id === senderId) {
				return entry.windowId || wid;
			}
		}
		return null;
	});

	// ---- Drag ----
	ipcMain.on('frame:drag-start', (_e, { windowId }) => {
		sendToShell('shell:frame-drag-start', { windowId });
	});
	ipcMain.on('frame:drag-delta', (_e, { windowId, dx, dy }) => {
		sendToShell('shell:frame-drag-delta', { windowId, dx, dy });
	});
	ipcMain.on('frame:drag-end', (_e, { windowId }) => {
		sendToShell('shell:frame-drag-end', { windowId });
	});

	// ---- Resize ----
	ipcMain.on('frame:resize-start', (_e, { windowId, direction }) => {
		sendToShell('shell:frame-resize-start', { windowId, direction });
	});
	ipcMain.on('frame:resize-delta', (_e, { windowId, direction, dx, dy }) => {
		sendToShell('shell:frame-resize-delta', { windowId, direction, dx, dy });
	});
	ipcMain.on('frame:resize-end', (_e, { windowId }) => {
		sendToShell('shell:frame-resize-end', { windowId });
	});

	// ---- Кнопки окна ----
	ipcMain.on('frame:event', (event, { windowId, type, payload }) => {
		sendToShell('shell:frame-event', {
			fromId: event.sender.id, windowId, type, payload,
		});
	});

	// ---- Shell → View: props (title/icon/isFocused/maximized) ----
	ipcMain.on('shell:send-to-frame', (_e, { windowId, data }) => {
		const entry = global.windowContentViews?.[windowId];
		if (!entry) return;
		const wc = entry.view?.webContents;
		if (wc && !wc.isDestroyed()) wc.send('frame:props', data);
	});

	// Рамка двигается
	ipcMain.on('frame:move-start', (_e, { windowId }) => {
		sendToShell('shell:frame-move-start', { windowId });
	});
	ipcMain.on('frame:move-delta', (_e, { windowId, dx, dy }) => {
		sendToShell('shell:frame-move-delta', { windowId, dx, dy });
	});
	ipcMain.on('frame:move-end', (_e, { windowId }) => {
		sendToShell('shell:frame-move-end', { windowId });
	});
}