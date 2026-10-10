import electronPkg from 'electron';
const { ipcMain, app, nativeImage } = electronPkg;
import {
    readdir, stat, rename as fsRename, unlink, readFile, rm,
    mkdir, writeFile, copyFile, access, open,
} from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { watch } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

// Отдаём управление event loop — нужно, чтобы параллельные IPC-запросы
// не блокировали друг друга и ответы уходили «порциями», а не залпом.
const yieldToEventLoop = () => new Promise((r) => setImmediate(r));

// dirPath → { watcher, refCount }
const watchers = new Map();

function startWatch(dirPath) {
    const existing = watchers.get(dirPath);
    if (existing) { existing.refCount++; return; }

    let watcher;
    try {
        watcher = watch(dirPath, { persistent: false }, (eventType, filename) => {
            if (!global.mainWindow || global.mainWindow.isDestroyed()) return;
            global.mainWindow.webContents.send('fs:did-change', {
                dir: dirPath, eventType, filename: filename || null,
            });
        });
    } catch (err) {
        console.error('[fs.watch] failed to watch', dirPath, err.message);
        return;
    }
    watcher.on('error', (err) => console.error('[fs.watch] error', dirPath, err.message));
    watchers.set(dirPath, { watcher, refCount: 1 });
}

function stopWatch(dirPath) {
    const entry = watchers.get(dirPath);
    if (!entry) return;
    entry.refCount--;
    if (entry.refCount <= 0) {
        try { entry.watcher.close(); } catch (_) { }
        watchers.delete(dirPath);
    }
}

/* ------------------------------------------------------------------ */
/* Пользовательские директории (~/.config/user-dirs.dirs)              */
/* ------------------------------------------------------------------ */

async function getUserDirs() {
    const home = os.homedir();
    const defaults = {
        desktop: path.join(home, 'Desktop'),
        download: path.join(home, 'Downloads'),
        documents: path.join(home, 'Documents'),
        pictures: path.join(home, 'Pictures'),
        music: path.join(home, 'Music'),
        videos: path.join(home, 'Videos'),
        templates: path.join(home, 'Templates'),
        home,
    };
    try {
        const configPath = path.join(home, '.config', 'user-dirs.dirs');
        const content = await readFile(configPath, 'utf8');
        const dirs = { ...defaults };
        for (const line of content.split('\n')) {
            const match = line.match(/^XDG_(\w+)_DIR="(.+)"\s*$/);
            if (!match) continue;
            const key = match[1].toLowerCase();
            let value = match[2].replace(/^\$HOME/, home);
            value = value.replace(/\$HOME/g, home);
            dirs[key] = value;
        }
        return dirs;
    } catch (_) { return defaults; }
}

/* ------------------------------------------------------------------ */
/* Чтение директории                                                    */
/* ------------------------------------------------------------------ */

async function readDir(dirPath) {
    try {
        const entries = await readdir(dirPath, { withFileTypes: true });
        const files = [];
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            try {
                const stats = await stat(fullPath);
                files.push({
                    id: fullPath, name: entry.name,
                    isDir: stats.isDirectory(), isSymlink: stats.isSymbolicLink(),
                    size: stats.size, mtime: stats.mtime.toISOString(),
                });
            } catch (_) { /* пропускаем */ }
        }
        return { success: true, files };
    } catch (err) {
        const denied = err.code === 'EACCES' || err.code === 'EPERM';
        return {
            success: false,
            error: denied ? 'permission_denied' : (err.code || 'unknown'),
            message: err.message,
        };
    }
}

/* ------------------------------------------------------------------ */
/* Информация о файле                                                   */
/* ------------------------------------------------------------------ */

async function getFileInfo(filePath) {
    try {
        const stats = await stat(filePath);
        return {
            success: true,
            info: {
                path: filePath, size: stats.size,
                mtime: stats.mtime.toISOString(),
                birthtime: stats.birthtime.toISOString(),
                isDir: stats.isDirectory(), isFile: stats.isFile(),
                isSymlink: stats.isSymbolicLink(),
                mode: '0' + (stats.mode & parseInt('777', 8)).toString(8),
                uid: stats.uid, gid: stats.gid,
            },
        };
    } catch (err) { return { success: false, error: err.message }; }
}

/* ------------------------------------------------------------------ */
/* Открытие через систему                                              */
/* ------------------------------------------------------------------ */

async function openPath(filePath) {
    try {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.desktop') {
            await execAsync(`gio launch "${filePath.replace(/"/g, '\\"')}"`);
            return { success: true };
        }
        try {
            const stats = await stat(filePath);
            const isExecutable = (stats.mode & 0o111) !== 0;
            if (isExecutable && !stats.isDirectory()) {
                await execAsync(`"${filePath.replace(/"/g, '\\"')}"`);
                return { success: true };
            }
        } catch (_) {}
        await execAsync(`xdg-open "${filePath.replace(/"/g, '\\"')}"`);
        return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
}

async function revealPath(filePath) {
    return openPath(path.dirname(filePath));
}

/* ------------------------------------------------------------------ */
/* Операции с файлами                                                   */
/* ------------------------------------------------------------------ */

async function trashPath(filePath) {
    try {
        await execAsync(`gio trash "${filePath.replace(/"/g, '\\"')}"`);
        return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
}

async function deletePath(filePath) {
    try {
        await rm(filePath, { recursive: true, force: true });
        return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
}

async function renamePath(oldPath, newName) {
    try {
        if (!newName || newName.includes('/')) return { success: false, error: 'invalid_name' };
        const dir = path.dirname(oldPath);
        const newPath = path.join(dir, newName);
        await fsRename(oldPath, newPath);
        return { success: true, newPath };
    } catch (err) { return { success: false, error: err.message }; }
}

/* ================================================================== */
/* ИКОНКИ — freedesktop lookup + максимальный размер + async           */
/* ================================================================== */

// Кэш: имя темы → Promise<{ bases, directories, inherits } | null>
// ВАЖНО: храним именно Promise, чтобы 20 параллельных запросов
// не запускали 20 сборок индекса параллельно.
const themeIndexCache = new Map();
// Кэш: путь к .desktop → dataUrl | null
const iconLookupCache = new Map();
// Кэш: имя иконки → dataUrl | null (разделяется между .desktop-файлами)
const iconByNameCache = new Map();

// Кэш текущей темы. Тоже Promise, а не значение.
let themePromise = null;
let themeTimestamp = 0;
const THEME_CACHE_TTL_MS = 30_000;

function getIconBaseDirs() {
    const home = os.homedir();
    return [
        path.join(home, '.local/share/icons'),
        path.join(home, '.icons'),
        path.join(home, '.local/share/flatpak/exports/share/icons'),
        '/var/lib/flatpak/exports/share/icons',
        '/usr/share/icons',
        '/usr/local/share/icons',
    ];
}

function getSteamIconDirs() {
    const home = os.homedir();
    return [
        path.join(home, '.local/share/Steam/steam/games'),
        path.join(home, '.steam/steam/steam/games'),
        path.join(home, '.steam/root/steam/games'),
        path.join(home, '.var/app/com.valvesoftware.Steam/.local/share/Steam/steam/games'),
    ];
}

const WELL_KNOWN_SUBDIRS = [
    'apps', 'mimetypes', 'places', 'devices', 'categories',
    'actions', 'status', 'emblems', 'emotes', 'panel',
    'notifications', 'stock', 'animations',
];
const WELL_KNOWN_SIZES = [
    '16x16', '22x22', '24x24', '32x32', '48x48', '64x64',
    '96x96', '128x128', '256x256', '512x512', 'scalable',
];

// Приоритет размеров при поиске: сначала самые большие.
const SIZE_PRIORITY = [
    '512x512', '256x256', 'scalable', '128x128', '96x96',
    '64x64', '48x48', '32x32', '24x24', '22x22', '16x16',
];

/**
 * Определяет текущую тему иконок. Возвращает Promise<string>.
 * 20 параллельных вызовов получают ОДИН и тот же Promise,
 * а внутри — максимум один subprocess gsettings.
 */
function getCurrentIconTheme() {
    const now = Date.now();
    if (themePromise && (now - themeTimestamp) < THEME_CACHE_TTL_MS) {
        return themePromise;
    }
    themeTimestamp = now;

    themePromise = (async () => {
        let theme = null;

        try {
            const { stdout } = await execAsync(
                'gsettings get org.gnome.desktop.interface icon-theme'
            );
            theme = stdout.trim().replace(/^'|'$/g, '') || null;
            if (theme) console.log('[icon] theme via gsettings:', theme);
        } catch (_) {}

        if (!theme) {
            try {
                const kdeglobalsPath = path.join(os.homedir(), '.config', 'kdeglobals');
                const content = await readFile(kdeglobalsPath, 'utf8');
                let inIcons = false;
                for (const raw of content.split('\n')) {
                    const line = raw.trim();
                    if (line === '[Icons]') { inIcons = true; continue; }
                    if (line.startsWith('[') && line.endsWith(']')) { inIcons = false; continue; }
                    if (inIcons) {
                        const m = line.match(/^Theme=(.+)$/);
                        if (m) { theme = m[1].trim(); break; }
                    }
                }
                if (theme) console.log('[icon] theme via kdeglobals:', theme);
            } catch (_) {}
        }

        if (!theme) {
            theme = 'hicolor';
            console.log('[icon] theme fallback: hicolor');
        }
        return theme;
    })().catch((err) => {
        themePromise = null;   // сбрасываем, чтобы следующая попытка прошла
        throw err;
    });

    return themePromise;
}

/**
 * Публичная функция: возвращает Promise индекса темы.
 * Promise кэшируется — 20 параллельных запросов разделяют одну работу.
 */
function readThemeIndex(themeName) {
    if (themeIndexCache.has(themeName)) return themeIndexCache.get(themeName);
    const promise = computeThemeIndex(themeName).catch((err) => {
        themeIndexCache.delete(themeName);
        throw err;
    });
    themeIndexCache.set(themeName, promise);
    return promise;
}

/**
 * Собственно сборка индекса темы: обход всех баз, чтение index.theme,
 * параллельная проверка well-known поддиректорий.
 */
async function computeThemeIndex(themeName) {
    const bases = [];
    let directories = [];
    let inherits = '';

    // Проверяем существование баз параллельно
    const baseChecks = await Promise.all(
        getIconBaseDirs().map(async (baseDir) => {
            const base = path.join(baseDir, themeName);
            try {
                const s = await stat(base);
                return s.isDirectory() ? base : null;
            } catch (_) { return null; }
        })
    );
    for (const b of baseChecks) if (b) bases.push(b);

    if (bases.length === 0) {
        console.warn('[icon] no theme directory found for:', themeName);
        return null;
    }

    // Параллельно читаем index.theme во всех базах
    const indexReads = await Promise.all(
        bases.map(async (base) => {
            const indexFile = path.join(base, 'index.theme');
            try {
                const content = await readFile(indexFile, 'utf8');
                const localDirs = [];
                let localInherits = '';
                let inIconTheme = false;
                for (const raw of content.split('\n')) {
                    const line = raw.trim();
                    if (line === '[Icon Theme]') { inIconTheme = true; continue; }
                    if (line.startsWith('[') && line.endsWith(']')) { inIconTheme = false; continue; }
                    if (!inIconTheme) continue;
                    if (line.startsWith('Directories=')) {
                        const ds = line.slice('Directories='.length)
                            .split(',').map((s) => s.trim()).filter(Boolean);
                        for (const d of ds) if (!localDirs.includes(d)) localDirs.push(d);
                    } else if (line.startsWith('Inherits=') && !localInherits) {
                        localInherits = line.slice('Inherits='.length).trim();
                    }
                }
                return { dirs: localDirs, inherits: localInherits };
            } catch (_) {
                console.log('[icon] no index.theme for', base, '— probing well-known dirs');
                return { dirs: [], inherits: '' };
            }
        })
    );
    for (const r of indexReads) {
        for (const d of r.dirs) if (!directories.includes(d)) directories.push(d);
        if (!inherits && r.inherits) inherits = r.inherits;
    }

    // Параллельная проверка well-known поддиректорий
    const probes = [];
    for (const base of bases) {
        for (const size of WELL_KNOWN_SIZES) {
            for (const sub of WELL_KNOWN_SUBDIRS) {
                const rel = `${size}/${sub}`;
                if (directories.includes(rel)) continue;
                probes.push(
                    stat(path.join(base, rel))
                        .then((s) => (s.isDirectory() ? rel : null))
                        .catch(() => null)
                );
            }
        }
    }
    const probed = await Promise.all(probes);
    for (const rel of probed) {
        if (rel && !directories.includes(rel)) directories.push(rel);
    }

    const result = { bases, directories, inherits };
    console.log(
        '[icon] theme index:', themeName,
        '| bases:', bases.length,
        '| dirs:', directories.length,
        '| inherits:', inherits || '(none)'
    );
    return result;
}

/**
 * Достаёт размеры PNG из IHDR-заголовка (первые 24 байта).
 */
async function getPngDimensions(filePath) {
    try {
        const fh = await open(filePath, 'r');
        try {
            const buf = Buffer.alloc(24);
            await fh.read(buf, 0, 24, 0);
            if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4E || buf[3] !== 0x47) return null;
            return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
        } finally { await fh.close(); }
    } catch (_) { return null; }
}

/**
 * Ищет лучшую иконку с именем iconName.
 *
 * Ключевая оптимизация: идём по SIZE_PRIORITY от больших к меньшим
 * и ВОЗВРАЩАЕМСЯ сразу, как только нашли попадание в текущей
 * категории. Не ждём пока проверятся остальные размеры.
 */
async function findBestIconInTheme(iconName, themeName) {
    const visited = new Set();
    const queue = [themeName];
    const themes = [];

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current || visited.has(current)) continue;
        visited.add(current);
        const index = await readThemeIndex(current);
        if (!index) continue;
        themes.push(index);
        if (index.inherits) {
            for (const parent of index.inherits.split(',').map((s) => s.trim())) {
                if (parent && !visited.has(parent)) queue.push(parent);
            }
        }
    }

    const extensions = ['.png', '.svg', '.xpm'];

    for (const size of SIZE_PRIORITY) {
        const checks = [];
        for (const index of themes) {
            for (const base of index.bases) {
                for (const dir of index.directories) {
                    if (!dir.startsWith(size + '/')) continue;
                    for (const ext of extensions) {
                        checks.push(path.join(base, dir, iconName + ext));
                    }
                }
            }
        }
        if (checks.length === 0) continue;

        // Проверяем ТОЛЬКО текущий размер — параллельно
        const results = await Promise.all(
            checks.map(async (c) => {
                try { await access(c); return c; } catch (_) { return null; }
            })
        );
        const hit = results.find(Boolean);
        if (hit) {
            console.log('[icon] resolved', iconName, 'at', size, '→', hit);
            return hit;
        }
    }

    return null;
}

/**
 * Ищет иконки Steam-игр в Steam-специфичных директориях.
 */
async function findIconInSteamDirs(iconName) {
    const m = iconName.match(/^steam_icon_(\d+)$/);
    if (!m) return null;
    const appId = m[1];

    const filenames = [`${iconName}.png`, `${appId}.png`, `${iconName}.jpg`, `${appId}.jpg`];
    const checks = [];
    for (const dir of getSteamIconDirs()) {
        for (const name of filenames) checks.push(path.join(dir, name));
    }

    const results = await Promise.all(
        checks.map(async (c) => {
            try { await access(c); return c; } catch (_) { return null; }
        })
    );
    return results.find(Boolean) || null;
}

async function readDesktopIconName(desktopPath) {
    try {
        const content = await readFile(desktopPath, 'utf8');
        let inDesktopEntry = false;
        for (const rawLine of content.split('\n')) {
            const line = rawLine.replace(/\r$/, '').trim();
            if (line === '[Desktop Entry]') { inDesktopEntry = true; continue; }
            if (line.startsWith('[') && line.endsWith(']')) { inDesktopEntry = false; continue; }
            if (!inDesktopEntry) continue;
            const m = line.match(/^Icon=(.+)$/);
            if (m) return m[1].trim();
        }
        return null;
    } catch (err) {
        console.warn('[icon] failed to read desktop file:', err.message);
        return null;
    }
}

async function tryElectronIcon(filePath) {
    try {
        const icon = await app.getFileIcon(filePath, { size: 'large' });
        if (icon && !icon.isEmpty()) return icon.toDataURL();
    } catch (_) {}
    return null;
}

/**
 * Превращает путь к иконке в dataUrl, с обрезкой размера до 128×128.
 * Обрезка критична для производительности: decode/encode 512×512
 * в 4–16 раз дороже, чем 128×128, а на 48px отображении разницы нет.
 */
function iconPathToDataUrl(iconPath) {
    const icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) return null;
    const size = icon.getSize();
    let finalIcon = icon;
    if (size.width > 128 || size.height > 128) {
        finalIcon = icon.resize({ width: 128, quality: 'good' });
    }
    return finalIcon.toDataURL();
}

async function getFileIcon(filePath) {
    try {
        if (filePath.endsWith('.desktop')) {
            // 1. Кэш по конкретному пути
            if (iconLookupCache.has(filePath)) {
                const cached = iconLookupCache.get(filePath);
                return cached ? { success: true, dataUrl: cached } : { success: false };
            }

            // 2. Читаем имя иконки
            const iconName = await readDesktopIconName(filePath);

            if (iconName) {
                // 3. Кэш по имени иконки — общий для всех .desktop,
                //    ссылающихся на одну иконку
                if (iconByNameCache.has(iconName)) {
                    const cached = iconByNameCache.get(iconName);
                    if (cached) {
                        iconLookupCache.set(filePath, cached);
                        return { success: true, dataUrl: cached };
                    }
                } else {
                    // Уступаем event loop — это позволит другим
                    // параллельным запросам продвинуться
                    await yieldToEventLoop();

                    const themeName = await getCurrentIconTheme();
                    let iconPath = await findBestIconInTheme(iconName, themeName);

                    if (!iconPath) {
                        iconPath = await findIconInSteamDirs(iconName);
                        if (iconPath) console.log('[icon] found in Steam dir:', iconPath);
                    }

                    if (iconPath) {
                        // Ещё раз уступаем event loop перед sync-операцией
                        await yieldToEventLoop();
                        try {
                            const dataUrl = iconPathToDataUrl(iconPath);
                            if (dataUrl) {
                                iconByNameCache.set(iconName, dataUrl);
                                iconLookupCache.set(filePath, dataUrl);
                                return { success: true, dataUrl };
                            }
                            console.warn('[icon] nativeImage empty for', iconPath);
                        } catch (e) {
                            console.warn('[icon] nativeImage threw for', iconPath, e.message);
                        }
                    } else {
                        console.warn('[icon] not found in theme:', iconName);
                    }

                    iconByNameCache.set(iconName, null);
                }
            }

            // Fallback — стандартный Electron-метод
            await yieldToEventLoop();
            const fallback = await tryElectronIcon(filePath);
            if (fallback) {
                iconLookupCache.set(filePath, fallback);
                return { success: true, dataUrl: fallback };
            }
            iconLookupCache.set(filePath, null);
            return { success: false };
        }

        // Обычные файлы
        const dataUrl = await tryElectronIcon(filePath);
        return dataUrl ? { success: true, dataUrl } : { success: false };
    } catch (err) {
        console.error('[icon] getFileIcon error:', err);
        return { success: false, error: err.message };
    }
}

/* ------------------------------------------------------------------ */
/* MIME-тип и приложения для файла                                     */
/* ------------------------------------------------------------------ */

async function getMimeType(filePath) {
    try {
        const { stdout } = await execAsync(`xdg-mime query filetype "${filePath.replace(/"/g, '\\"')}"`);
        return stdout.trim();
    } catch (_) { return null; }
}

const DESKTOP_DIRS = [
    '/usr/share/applications',
    '/usr/local/share/applications',
    path.join(os.homedir(), '.local/share/applications'),
];

async function readDesktopEntry(id) {
    for (const dir of DESKTOP_DIRS) {
        const fullPath = path.join(dir, id);
        try {
            const content = await readFile(fullPath, 'utf8');
            let name = null, nameRu = null, inDesktopEntry = false;
            for (const line of content.split('\n')) {
                const trimmed = line.trim();
                if (trimmed === '[Desktop Entry]') { inDesktopEntry = true; continue; }
                if (trimmed.startsWith('[') && trimmed.endsWith(']')) { inDesktopEntry = false; continue; }
                if (!inDesktopEntry) continue;
                if (trimmed.startsWith('Name[ru]=')) nameRu = trimmed.slice(8);
                else if (trimmed.startsWith('Name=')) name = trimmed.slice(5);
            }
            return { id, name: nameRu || name || id, fullPath };
        } catch (_) {}
    }
    return null;
}

async function getAppsForFile(filePath) {
    try {
        const mime = await getMimeType(filePath);
        if (!mime) return { success: true, apps: [], mime: null };

        const { stdout } = await execAsync(`gio mime ${mime}`);
        const ids = new Set();
        let inSection = false;
        for (const rawLine of stdout.split('\n')) {
            const line = rawLine.trim();
            if (!line) continue;
            if (line.startsWith('Registered applications:') || line.startsWith('Recommended applications:')) {
                inSection = true; continue;
            }
            if (line.includes(':') && !line.endsWith('.desktop')) { inSection = false; continue; }
            if (inSection && line.endsWith('.desktop')) ids.add(line);
        }

        const apps = [];
        for (const id of ids) {
            const entry = await readDesktopEntry(id);
            if (entry) apps.push({ id: entry.id, name: entry.name });
        }
        return { success: true, apps, mime };
    } catch (err) {
        return { success: false, error: err.message, apps: [] };
    }
}

async function openWith(filePath, desktopId) {
    try {
        const appName = desktopId.replace(/\.desktop$/, '');
        await execAsync(`gtk-launch "${appName}" "${filePath.replace(/"/g, '\\"')}"`);
        return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
}

/* ------------------------------------------------------------------ */
/* Создание файлов и папок                                              */
/* ------------------------------------------------------------------ */

async function getTemplates() {
    const dirs = await getUserDirs();
    const templatesDir = dirs.templates;
    try {
        const entries = await readdir(templatesDir, { withFileTypes: true });
        const templates = [];
        for (const entry of entries) {
            if (entry.isFile() || entry.isSymbolicLink()) {
                templates.push({ id: path.join(templatesDir, entry.name), name: entry.name });
            }
        }
        return { success: true, templates, dir: templatesDir };
    } catch (err) {
        return { success: false, error: err.message, templates: [], dir: templatesDir };
    }
}

export async function createFolder(dir, name) {
    try {
        const fullPath = path.join(dir, name);
        await mkdir(fullPath, { recursive: false });
        return { success: true, path: fullPath };
    } catch (err) { return { success: false, error: err.code || err.message }; }
}

export async function createFile(dir, name) {
    try {
        const fullPath = path.join(dir, name);
        await writeFile(fullPath, '', { flag: 'wx' });
        return { success: true, path: fullPath };
    } catch (err) { return { success: false, error: err.code || err.message }; }
}

export async function createFromTemplate(dir, templatePath, name) {
    try {
        const destPath = path.join(dir, name);
        await copyFile(templatePath, destPath, fsConstants.COPYFILE_EXCL);
        return { success: true, path: destPath };
    } catch (err) { return { success: false, error: err.code || err.message }; }
}

/* ------------------------------------------------------------------ */
/* Регистрация IPC                                                      */
/* ------------------------------------------------------------------ */

export default function () {
    ipcMain.handle('fs:get-user-dirs', () => getUserDirs());
    ipcMain.handle('fs:read-dir', (_e, { path: p }) => readDir(p));
    ipcMain.handle('fs:get-info', (_e, { path: p }) => getFileInfo(p));
    ipcMain.handle('fs:get-icon', (_e, { path: p }) => getFileIcon(p));

    ipcMain.handle('fs:open', (_e, { path: p }) => openPath(p));
    ipcMain.handle('fs:reveal', (_e, { path: p }) => revealPath(p));
    ipcMain.handle('fs:trash', (_e, { path: p }) => trashPath(p));
    ipcMain.handle('fs:delete', (_e, { path: p }) => deletePath(p));
    ipcMain.handle('fs:rename', (_e, { path: p, newName }) => renamePath(p, newName));

    ipcMain.handle('fs:get-apps-for-file', (_e, { path: p }) => getAppsForFile(p));
    ipcMain.handle('fs:open-with', (_e, { path: p, desktopId }) => openWith(p, desktopId));

    ipcMain.on('fs:watch-start', (_e, { path: p }) => { if (p) startWatch(p); });
    ipcMain.on('fs:watch-stop', (_e, { path: p }) => { if (p) stopWatch(p); });

    ipcMain.handle('fs:get-templates', () => getTemplates());
    ipcMain.handle('fs:create-folder', (_e, { dir, name }) => createFolder(dir, name));
    ipcMain.handle('fs:create-file', (_e, { dir, name }) => createFile(dir, name));
    ipcMain.handle('fs:create-from-template', (_e, { dir, templatePath, name }) =>
        createFromTemplate(dir, templatePath, name));
}