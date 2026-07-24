import { readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

export default async function () {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const IGNORE = ['autoimport.js', 'config.js', 'paths.js']; // config не функция, загружается отдельно

  global.$ = {};

  const files = readdirSync(__dirname).filter(
    f => f.endsWith('.js') && !IGNORE.includes(f)
  );

  const results = await Promise.allSettled(
    files.map(async file => {
      const filePath = join(__dirname, file);
      const fileUrl = pathToFileURL(filePath).href;
      const module = await import(fileUrl);
      const name = basename(file, '.js');
      global.$[name] = module.default || module; // module может быть { default, ... }
    })
  );

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`[autoimport] Ошибка загрузки "${files[index]}":`, result.reason);
    }
  });
}
