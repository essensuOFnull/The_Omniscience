import electronPkg from 'electron';
const{ipcMain}=electronPkg;
import { readdir, stat } from 'fs/promises';
import os from 'os';
import { join, resolve } from 'path';

export default function () {
	ipcMain.handle('get-default-folders', async () => {
		const home = os.homedir();
		const projectRoot = resolve(global.paths.componentappsDir, '..', '..', '..');

		const folders = [
			{ id: 'project', name: 'The Omniscience', path: projectRoot },
			{ id: 'home', name: 'Домашняя папка', path: home },
			{ id: 'downloads', name: 'Загрузки', path: join(home, 'Downloads') },
			{ id: 'pictures', name: 'Картинки', path: join(home, 'Pictures') },
			{ id: 'documents', name: 'Документы', path: join(home, 'Documents') },
			{ id: 'music', name: 'Музыка', path: join(home, 'Music') },
			{ id: 'videos', name: 'Видео', path: join(home, 'Videos') },
		];

		if (process.platform === 'win32') {
			// Добавляем корни всех доступных дисков (простой вариант – C:, D:)
			// Более полный вариант можно сделать через PowerShell, пока ограничимся C:
			folders.unshift({ id: 'c_root', name: 'Диск C:', path: 'C:\\' });
			// При желании легко добавить D: и т.д. через child_process
		} else {
			folders.unshift({ id: 'root', name: 'Корень ФС', path: '/' });
		}

		return folders;
	});
}