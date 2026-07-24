import electronPkg from 'electron';
const{ipcMain}=electronPkg;
import { open } from 'fs/promises';

export default function () {
  ipcMain.handle('check-text-file', async (event, filePath) => {
    let fileHandle;
    try {
      fileHandle = await open(filePath, 'r');
      const buffer = Buffer.alloc(4096);
      const { bytesRead } = await fileHandle.read(buffer, 0, 4096, 0);
      // Если есть хотя бы один нулевой байт, считаем файл бинарным
      for (let i = 0; i < bytesRead; i++) {
        if (buffer[i] === 0) return false;
      }
      return true;
    } catch (err) {
      return false;
    } finally {
      if (fileHandle) await fileHandle.close().catch(() => {});
    }
  });
}