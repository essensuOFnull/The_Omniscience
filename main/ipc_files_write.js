import electronPkg from 'electron';
const{ipcMain}=electronPkg;
import { writeFile } from 'fs/promises';

export default function () {
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