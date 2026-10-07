import electronPkg from 'electron';
const{ipcMain}=electronPkg;
import { readdir, readFile, access } from 'fs/promises';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

/* ------------------------------------------------------------------ */
/* Где искать .desktop файлы                                           */
/* ------------------------------------------------------------------ */

const DESKTOP_DIRS = [
  '/usr/share/applications',
  '/usr/local/share/applications',
  path.join(os.homedir(), '.local/share/applications'),
  '/var/lib/flatpak/exports/share/applications',
  path.join(os.homedir(), '.local/share/flatpak/exports/share/applications'),
  '/var/lib/snapd/desktop/applications',
];

/* ------------------------------------------------------------------ */
/* Иконки                                                              */
/* ------------------------------------------------------------------ */

const ICON_DIRS = [
  '/usr/share/icons/hicolor',
  '/usr/share/icons/Adwaita',
  '/usr/share/icons/gnome',
  '/usr/share/icons/Papirus',
  '/usr/share/icons/Papirus-Dark',
  '/usr/share/icons/breeze',
  '/usr/share/icons/breeze-dark',
  path.join(os.homedir(), '.local/share/icons/hicolor'),
  '/var/lib/flatpak/exports/share/icons',
];

const ICON_SIZES = ['48x48', '64x64', '128x128', 'scalable', '32x32', '256x256', '512x512'];
const ICON_EXTS = ['png', 'svg', 'xpm'];

const ICON_CACHE = new Map();

async function fileToDataUri(filePath, ext) {
  try {
    const buf = await readFile(filePath);
    const mime = ext === 'svg' ? 'image/svg+xml'
      : ext === 'png' ? 'image/png'
      : 'image/x-xpixmap';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (_) {
    return null;
  }
}

async function findIconPath(iconName) {
  if (!iconName) return null;
  if (ICON_CACHE.has(iconName)) return ICON_CACHE.get(iconName);

  // 1. Абсолютный путь или file:// URI
  if (iconName.startsWith('/') || iconName.startsWith('file://')) {
    const p = iconName.replace(/^file:\/\//, '');
    const ext = path.extname(p).slice(1).toLowerCase();
    try {
      await access(p);
      const dataUri = await fileToDataUri(p, ext);
      ICON_CACHE.set(iconName, dataUri);
      return dataUri;
    } catch (_) {}
  }

  // 2. Поиск по имени в системных темах
  for (const baseDir of ICON_DIRS) {
    for (const size of ICON_SIZES) {
      for (const ext of ICON_EXTS) {
        const p = path.join(baseDir, size, 'apps', `${iconName}.${ext}`);
        try {
          await access(p);
          const dataUri = await fileToDataUri(p, ext);
          ICON_CACHE.set(iconName, dataUri);
          return dataUri;
        } catch (_) {}
      }
    }
  }

  ICON_CACHE.set(iconName, null);
  return null;
}

/* ------------------------------------------------------------------ */
/* Парсинг .desktop                                                    */
/* ------------------------------------------------------------------ */

function parseDesktopFile(content) {
  const lines = content.split('\n');
  let inEntry = false;
  const entry = {};
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('[')) {
      inEntry = line === '[Desktop Entry]';
      continue;
    }
    if (!inEntry) continue;
    if (line.startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    entry[key] = value;
  }
  return entry;
}

function getLocalizedName(entry) {
  const lang = (process.env.LC_MESSAGES || process.env.LANG || 'en').split('.')[0].split('_')[0];
  const candidates = [
    lang ? `Name[${lang}]` : null,
    'Name[ru]',
    'Name',
  ].filter(Boolean);

  for (const key of candidates) {
    if (entry[key]) return entry[key];
  }
  return entry.Name || '';
}

function cleanExec(exec) {
  // убираем параметры типа %U %F %u %f %i %c %k %d
  return exec
    .replace(/%[uUfFdDnNickvm]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ------------------------------------------------------------------ */
/* Скан всех .desktop                                                  */
/* ------------------------------------------------------------------ */

let cachedNativeApps = null;

async function scanDesktopFiles() {
  const seen = new Set();
  const result = [];

  for (const dir of DESKTOP_DIRS) {
    let entries;
    try {
      entries = await readdir(dir);
    } catch (_) {
      continue;
    }

    for (const fileName of entries) {
      if (!fileName.endsWith('.desktop')) continue;
      if (seen.has(fileName)) continue;
      seen.add(fileName);

      const fullPath = path.join(dir, fileName);
      let content;
      try {
        content = await readFile(fullPath, 'utf-8');
      } catch (_) {
        continue;
      }

      const entry = parseDesktopFile(content);
      if (!entry.Name || !entry.Exec) continue;
      if (entry.NoDisplay === 'true') continue;
      if (entry.Hidden === 'true') continue;
      if (entry.Type && entry.Type !== 'Application') continue;
      if (entry.OnlyShowIn && !entry.OnlyShowIn.includes('KDE')) continue;
      if (entry.NotShowIn && entry.NotShowIn.includes('KDE')) continue;

      const title = getLocalizedName(entry);
      const iconName = entry.Icon || null;
      const icon = iconName ? await findIconPath(iconName) : null;

      result.push({
        id: `native:${fileName}`,
        nativeId: fileName,
        title,
        icon,
        kind: 'native',
        exec: cleanExec(entry.Exec),
        terminal: entry.Terminal === 'true',
        comment: entry.Comment || '',
        categories: entry.Categories || '',
      });
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/* IPC                                                                 */
/* ------------------------------------------------------------------ */

export default function () {
  ipcMain.handle('get-native-apps', async (_e, { force } = {}) => {
    if (cachedNativeApps && !force) return cachedNativeApps;
    cachedNativeApps = await scanDesktopFiles();
    return cachedNativeApps;
  });

  ipcMain.on('launch-native-app', (_e, { exec, terminal }) => {
    try {
      let cmd = exec;

      // Если приложение требует терминал — оборачиваем в xterm
      if (terminal) {
        cmd = `xterm -e ${exec}`;
      }

      const child = spawn('sh', ['-c', cmd], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    } catch (err) {
      console.error('[launch-native-app]', err.message);
    }
  });
}