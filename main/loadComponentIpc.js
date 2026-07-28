import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

export default async function() {
  const componentappsDir = global.paths.componentappsDir;
  if (!existsSync(componentappsDir)) return;

  const entries = readdirSync(componentappsDir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const appDir = join(componentappsDir, entry.name);
    const ipcPath = join(appDir, 'ipc.js');
    if (!existsSync(ipcPath)) continue;

    try {
      const fileUrl = pathToFileURL(ipcPath).href;
      const module = await import(fileUrl);
      if (typeof module.default === 'function') {
        // Вызываем функцию, передавая ей при необходимости глобальные объекты
        // Например: module.default({ ipcMain, global, ... });
        module.default();
        console.log(`[ComponentIPC] Загружен обработчик для ${entry.name}`);
        results.push({ app: entry.name, status: 'ok' });
      } else {
        console.warn(`[ComponentIPC] ${entry.name}/ipc.js не экспортирует функцию по умолчанию`);
        results.push({ app: entry.name, status: 'no-default-export' });
      }
    } catch (err) {
      console.error(`[ComponentIPC] Ошибка загрузки ${entry.name}/ipc.js:`, err);
      results.push({ app: entry.name, status: 'error', error: err.message });
    }
  }

  return results;
}