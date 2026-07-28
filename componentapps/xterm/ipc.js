import { ipcMain } from 'electron';
import { spawn } from 'node-pty';

let ptyProcess = null;

export default function () {
	ipcMain.on('terminal-start', (event) => {
		if (ptyProcess) {
			// уже запущен
			return;
		}

		// Выбираем shell в зависимости от ОС
		const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
		ptyProcess = spawn(shell, [], {
			name: 'xterm-color',
			cols: 80,
			rows: 30,
			cwd: process.cwd(),
			env: process.env
		});

		ptyProcess.on('data', (data) => {
			event.sender.send('terminal-data', data);
		});

		ptyProcess.on('exit', () => {
			ptyProcess = null;
		});
	});

	ipcMain.on('terminal-input', (event, data) => {
		if (ptyProcess) {
			ptyProcess.write(data);
		}
	});

	ipcMain.on('terminal-resize', (event, { cols, rows }) => {
		if (ptyProcess) {
			ptyProcess.resize(cols, rows);
		}
	});
}