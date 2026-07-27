import { ipcMain, BrowserWindow } from 'electron';

let resizeState = null;

function sendWindowState(win) {
	if (win && !win.isDestroyed()) {
		win.webContents.send('window-state-changed', {
			maximized: win.isMaximized(),
			fullscreen: win.isFullScreen(),
		});
	}
}

export default function () {
	// Изменения состояния окна
	global.mainWindow.on('maximize', () => sendWindowState(global.mainWindow));
	global.mainWindow.on('unmaximize', () => sendWindowState(global.mainWindow));
	global.mainWindow.on('enter-full-screen', () => sendWindowState(global.mainWindow));
	global.mainWindow.on('leave-full-screen', () => sendWindowState(global.mainWindow));

	// Кастомный ресайз через IPC
	ipcMain.on('start-resize', (event, direction) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		// Игнорируем, если окно не то, или развёрнуто/полноэкранное
		if (!win || win !== global.mainWindow || win.isMaximized() || win.isFullScreen()) return;

		const bounds = win.getBounds();
		resizeState = {
			win,
			direction,
			startBounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
			startMouse: null,
			minWidth: 400,
			minHeight: 300,
		};
	});

	ipcMain.on('resize-move', (event, screenX, screenY) => {
		if (!resizeState) return;
		const { win, direction, startBounds, minWidth, minHeight } = resizeState;

		if (!resizeState.startMouse) {
			resizeState.startMouse = { x: screenX, y: screenY };
			return;
		}

		const dx = screenX - resizeState.startMouse.x;
		const dy = screenY - resizeState.startMouse.y;
		const newBounds = {
			x: startBounds.x,
			y: startBounds.y,
			width: startBounds.width,
			height: startBounds.height,
		};

		if (direction.includes('right')) newBounds.width = Math.max(minWidth, startBounds.width + dx);
		if (direction.includes('left')) {
			const newWidth = Math.max(minWidth, startBounds.width - dx);
			newBounds.x = startBounds.x + startBounds.width - newWidth;
			newBounds.width = newWidth;
		}
		if (direction.includes('bottom')) newBounds.height = Math.max(minHeight, startBounds.height + dy);
		if (direction.includes('top')) {
			const newHeight = Math.max(minHeight, startBounds.height - dy);
			newBounds.y = startBounds.y + startBounds.height - newHeight;
			newBounds.height = newHeight;
		}

		win.setBounds(newBounds);
	});

	ipcMain.on('resize-end', () => {
		resizeState = null;
	});

	// -------------------------------------------------------
	// Обработчики управления окном – свернуть/развернуть/закрыть
	// -------------------------------------------------------
	ipcMain.on('window_minimize', (event) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		if (win) win.minimize();
	});

	ipcMain.on('window_maximize', (event) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		if (!win) return;
		win.isMaximized() ? win.unmaximize() : win.maximize();
	});

	ipcMain.on('window_close', (event) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		if (win) win.close();
	});

	ipcMain.on('set-webview-bounds', (event, { id, bounds }) => {
		const tab = global.tabs.find(item => item.tabData.id === id);
		if (tab && tab.view) {
			tab.view.setBounds(bounds);
		}
	});
}