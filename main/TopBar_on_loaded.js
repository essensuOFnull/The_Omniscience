import { exec } from 'child_process';
import electronPkg from 'electron';
const { screen } = electronPkg;

// main/mainWindow_on_loaded.js
export default async function () {
	global.topbarWindow.loadURL(global.paths.topBarIndex);

	global.topbarWindow.on('closed', () => { });

	// В главном процессе Electron:
	const buffer = global.topbarWindow.getNativeWindowHandle();

	// На Linux/X11 это 4-байтный или 8-байтный Buffer с ID окна.
	// Переводим его в число, которое поймет xprop (в hex или dec):
	const winId = buffer.readUInt32LE(0);

	// Теперь можно запустить xprop через exec:
	const display = screen.getPrimaryDisplay();
	const { width, height } = display.size;
	exec(`xprop -id ${winId} -f _NET_WM_STRUT_PARTIAL 32c -set _NET_WM_STRUT_PARTIAL "0, 0, 72, 0, 0, 0, 0, 0, 0, ${width}, 0, 0"`);
}