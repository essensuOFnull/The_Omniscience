import electronPkg from 'electron';
const { ipcMain } = electronPkg;
import { readdir, stat } from 'fs/promises';
import os from 'os';
import { join, resolve } from 'path';

export default function () {
	ipcMain.handle('get-default-folders', async () => {
		const home = os.homedir();

		const folders = [
			{ id: 'project', name: 'The Omniscience', path: global.paths.projectRoot },
			{ id: 'home', name: 'Домашняя папка', path: home },
			{ id: 'downloads', name: 'Загрузки', path: join(home, 'Downloads') },
			{ id: 'pictures', name: 'Картинки', path: join(home, 'Pictures') },
			{ id: 'documents', name: 'Документы', path: join(home, 'Documents') },
			{ id: 'music', name: 'Музыка', path: join(home, 'Music') },
			{ id: 'videos', name: 'Видео', path: join(home, 'Videos') },
		];

		if (process.platform === 'win32') {
			folders.unshift({ id: 'c_root', name: 'Диск C:', path: 'C:\\' });
		} else {
			folders.unshift({ id: 'root', name: 'Корень ФС', path: '/' });
		}

		return folders;
	});

	ipcMain.handle('check-text-file', async (event, filePath) => {
		let fileHandle;
		try {
			fileHandle = await open(filePath, 'r');
			const buffer = Buffer.alloc(4096);
			const { bytesRead } = await fileHandle.read(buffer, 0, 4096, 0);
			for (let i = 0; i < bytesRead; i++) {
				if (buffer[i] === 0) return false;
			}
			return true;
		} catch (err) {
			return false;
		} finally {
			if (fileHandle) await fileHandle.close().catch(() => { });
		}
	});

	ipcMain.handle('get-files', async (event, dirPath) => {
		try {
			const entries = await readdir(dirPath, { withFileTypes: true });
			const result = [];
			for (const entry of entries) {
				try {
					const fullPath = join(dirPath, entry.name);
					const stats = await stat(fullPath);
					result.push({
						id: fullPath,
						name: entry.name,
						isDir: stats.isDirectory(),
						size: stats.size,
						modDate: stats.mtime.toISOString(),
					});
				} catch { }
			}
			return { success: true, files: result };
		} catch (err) {
			console.error('Error reading directory:', dirPath, err);
			return {
				success: false,
				error: err.code === 'EACCES' || err.code === 'EPERM' ? 'permission_denied' : 'unknown',
			};
		}
	});
}
