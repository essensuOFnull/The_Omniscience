import electronPkg from 'electron';
const { ipcMain } = electronPkg;
import { readFile, writeFile } from 'fs/promises';

export default function () {
	ipcMain.handle('read-file', async (event, filePath) => {
		try {
			const content = await readFile(filePath, 'utf-8');
			return { success: true, content };
		} catch (err) {
			console.error('Error reading file:', filePath, err);
			return { success: false, error: err.message };
		}
	});

	ipcMain.handle('write-file', async (event, filePath, content) => {
		try {
			await writeFile(filePath, content, 'utf-8');
			return { success: true };
		} catch (err) {
			console.error('Error writing file:', filePath, err);
			return { success: false, error: err.message };
		}
	});
}
