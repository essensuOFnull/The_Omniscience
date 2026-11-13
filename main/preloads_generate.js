import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function writePreload(filePath, contents) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, 'utf8');
  return filePath.replace(/\\/g, '/');
}

export async function resolveAppPreload(appPreloadPath) {
  if (!appPreloadPath) return global.paths.reactPreload;

  const [commonCode, appCode] = await Promise.all([
    readFile(global.paths.reactPreload, 'utf8'),
    readFile(appPreloadPath, 'utf8'),
  ]);
  const digest = createHash('sha256')
    .update(commonCode)
    .update(appPreloadPath)
    .update(appCode)
    .digest('hex');
  const preloadPath = path.join(path.dirname(global.paths.reactPreload), 'apps', `${digest}.cjs`);
  return writePreload(preloadPath, `${commonCode}\n\n${appCode}`);
}

export default async function () {
  const preloadPath = global.paths.reactPreload;
  const preloadCode = [
    global._.imports,
    global._.desktop_ipc,
    global._.mainWindow_ipc,
  ]
    .filter((part) => typeof part === 'string' && part.length > 0)
    .join('\n\n');

  await writePreload(preloadPath, preloadCode);
  global.paths.reactPreload = preloadPath.replace(/\\/g, '/');
}
