import electronPkg from 'electron';
const{ipcMain}=electronPkg;
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export default function () {
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
        } catch {}
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