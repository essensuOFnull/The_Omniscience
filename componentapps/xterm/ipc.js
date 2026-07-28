import * as os from 'node:os';
import pty from 'node-pty';
import electronPkg from 'electron';
const { ipcMain } = electronPkg;

export default function (targetWindowOrView) {
	if (!targetWindowOrView || !targetWindowOrView.webContents) return;

	// Определяем системную оболочку (по умолчанию bash для Linux)
	const shellExecutable = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

	// Создаем честный PTY-процесс
	const ptyProcess = pty.spawn(shellExecutable, ['-i'], {
		name: 'xterm-256color',
		cols: 80, // Стартовые дефолтные размеры
		rows: 24,
		cwd: process.env.HOME,
		env: {
			...process.env,
			TERM: 'xterm-256color',
			FORCE_COLOR: 'true'
		}
	});

	// ptyProcess отдает единый поток данных (включая stderr и TUI-графику)
	ptyProcess.onData((data) => {
		if (targetWindowOrView.webContents && !targetWindowOrView.webContents.isDestroyed()) {
			targetWindowOrView.webContents.send('terminal-incoming-data', data);
		}
	});

	// Перехват ввода из xterm.js (теперь \r проходит нативно, без подмен)
	ipcMain.on('terminal-out-data', (event, data) => {
		if (ptyProcess) {
			ptyProcess.write(data);
		}
	});

	// Идеальный ресайз одной нативной командой
	ipcMain.on('terminal-resize', (event, size) => {
		if (ptyProcess && size && size.cols && size.rows) {
			try {
				ptyProcess.resize(size.cols, size.rows);
			} catch (err) {
				console.error('Ошибка изменения размера PTY:', err);
			}
		}
	});

	// Очистка при уничтожении окна/вью, чтобы не плодить зомби-процессы
	targetWindowOrView.webContents.on('destroyed', () => {
		try {
			ptyProcess.kill();
		} catch (e) {}
	});
}
