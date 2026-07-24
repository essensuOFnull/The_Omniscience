import electronPkg from 'electron';
const{ipcMain}=electronPkg;
import { readFile } from 'fs/promises';

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
}