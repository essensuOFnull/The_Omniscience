import electronPkg from 'electron';
const { ipcMain, app } = electronPkg;
import {
    readdir, stat, rename as fsRename, unlink, readFile, rm,
    mkdir, writeFile, copyFile, access, open, cp,
} from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { watch } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import { clipboard } from 'electron';
import { pathToFileURL, fileURLToPath } from 'url';

const execAsync = promisify(exec);
const yieldToEventLoop = () => new Promise((r) => setImmediate(r));

/* ------------------------------------------------------------------ */
/* file:// URL                                                          */
/* ------------------------------------------------------------------ */

/**
 * Обёртка над pathToFileURL. Корректно кодирует пробелы, юникод,
 * спецсимволы. Возвращает строку вида file:///home/user/фото.jpg.
 */
function toFileUrl(filePath) {
    if (!filePath) return null;
    try {
        return pathToFileURL(filePath).href;
    } catch (_) {
        return null;
    }
}

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
/* Категории медиафайлов                                                */
/* ------------------------------------------------------------------ */

const IMAGE_EXT = new Set([
    'png', 'jpg', 'jpeg', 'jfif', 'gif', 'webp', 'bmp', 'svg',
    'avif', 'ico', 'tiff', 'tif', 'apng', 'pjpeg', 'pjp', 'heic', 'heif',
]);
const VIDEO_EXT = new Set([
    'mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v', 'ogv', 'flv',
    'wmv', 'mpg', 'mpeg', '3gp', '3g2', 'ts', 'm2ts', 'mts',
]);
const AUDIO_EXT = new Set([
    'mp3', 'wav', 'ogg', 'oga', 'flac', 'm4a', 'aac',
    'opus', 'wma', 'aiff', 'alac',
]);

function detectMediaKind(name) {
    const dot = name.lastIndexOf('.');
    if (dot < 0) return null;
    const ext = name.slice(dot + 1).toLowerCase();
    if (IMAGE_EXT.has(ext)) return 'image';
    if (VIDEO_EXT.has(ext)) return 'video';
    if (AUDIO_EXT.has(ext)) return 'audio';
    return null;
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
                    id: fullPath,
                    fileUrl: toFileUrl(fullPath),      // ← готовый file:// URL
                    name: entry.name,
                    isDir: stats.isDirectory(),
                    isSymlink: stats.isSymbolicLink(),
                    size: stats.size,
                    mtime: stats.mtime.toISOString(),
                    mediaKind: detectMediaKind(entry.name),
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
                path: filePath,
                fileUrl: toFileUrl(filePath),
                size: stats.size,
                mtime: stats.mtime.toISOString(),
                birthtime: stats.birthtime.toISOString(),
                isDir: stats.isDirectory(),
                isFile: stats.isFile(),
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
        } catch (_) { }
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

/* ------------------------------------------------------------------ */
/* Буфер обмена: copy / cut / paste                                    */
/* ------------------------------------------------------------------ */

let cutPaths = null;

export async function copyFiles(paths) {
    if (!Array.isArray(paths) || paths.length === 0) {
        return { success: false, error: 'no_paths' };
    }
    try {
        clipboard.writeText(paths.map((p) => pathToFileURL(p).href).join('\n'));
        cutPaths = null;
        return { success: true, count: paths.length };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function cutFiles(paths) {
    if (!Array.isArray(paths) || paths.length === 0) {
        return { success: false, error: 'no_paths' };
    }
    try {
        clipboard.writeText(paths.map((p) => pathToFileURL(p).href).join('\n'));
        cutPaths = [...paths];
        return { success: true, count: paths.length };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function pasteFiles(destDir) {
    if (!destDir) return { success: false, error: 'no_dest' };

    let text;
    try { text = clipboard.readText(); } catch (_) { return { success: false, error: 'clipboard' }; }
    if (!text) return { success: false, error: 'empty' };

    const urls = text.split('\n').map((s) => s.trim()).filter(Boolean);
    const srcPaths = urls
        .filter((u) => u.startsWith('file://'))
        .map((u) => { try { return fileURLToPath(u); } catch { return null; } })
        .filter(Boolean);

    if (srcPaths.length === 0) return { success: false, error: 'no_files' };

    const isCut = cutPaths
        && cutPaths.length === srcPaths.length
        && cutPaths.every((p) => srcPaths.includes(p));
    cutPaths = null;

    const results = [];
    for (const src of srcPaths) {
        const dest = path.join(destDir, path.basename(src));
        try {
            if (isCut) {
                await fsRename(src, dest);
            } else {
                // Пытаемся как файл; если это папка — cp с recursive.
                try {
                    await copyFile(src, dest);
                } catch (err) {
                    if (err.code === 'EISDIR' || err.code === 'EPERM') {
                        await cp(src, dest, { recursive: true });
                    } else {
                        throw err;
                    }
                }
            }
            results.push({ src, dest, ok: true });
        } catch (err) {
            results.push({ src, dest, ok: false, error: err.message });
        }
    }
    return { success: true, results };
}
/* ================================================================== */
/* ИКОНКИ — freedesktop lookup, возвращаем file:// URL                 */
/* ================================================================== */

const themeIndexCache = new Map();       // theme → Promise<{bases,dirs,inherits}|null>
const iconLookupCache = new Map();       // desktopPath → fileUrl | null
const iconByNameCache = new Map();       // iconName    → fileUrl | null

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
const SIZE_PRIORITY = [
    '512x512', '256x256', 'scalable', '128x128', '96x96',
    '64x64', '48x48', '32x32', '24x24', '22x22', '16x16',
];

function getCurrentIconTheme() {
    const now = Date.now();
    if (themePromise && (now - themeTimestamp) < THEME_CACHE_TTL_MS) return themePromise;
    themeTimestamp = now;

    themePromise = (async () => {
        let theme = null;
        try {
            const { stdout } = await execAsync('gsettings get org.gnome.desktop.interface icon-theme');
            theme = stdout.trim().replace(/^'|'$/g, '') || null;
            if (theme) console.log('[icon] theme via gsettings:', theme);
        } catch (_) { }
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
            } catch (_) { }
        }
        if (!theme) { theme = 'hicolor'; console.log('[icon] theme fallback: hicolor'); }
        return theme;
    })().catch((err) => { themePromise = null; throw err; });

    return themePromise;
}

function readThemeIndex(themeName) {
    if (themeIndexCache.has(themeName)) return themeIndexCache.get(themeName);
    const promise = computeThemeIndex(themeName).catch((err) => {
        themeIndexCache.delete(themeName); throw err;
    });
    themeIndexCache.set(themeName, promise);
    return promise;
}

async function computeThemeIndex(themeName) {
    const bases = [];
    let directories = [];
    let inherits = '';

    const baseChecks = await Promise.all(
        getIconBaseDirs().map(async (baseDir) => {
            const base = path.join(baseDir, themeName);
            try { const s = await stat(base); return s.isDirectory() ? base : null; }
            catch (_) { return null; }
        })
    );
    for (const b of baseChecks) if (b) bases.push(b);
    if (bases.length === 0) {
        console.warn('[icon] no theme directory found for:', themeName);
        return null;
    }

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
                        const ds = line.slice('Directories='.length).split(',').map((s) => s.trim()).filter(Boolean);
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
    console.log('[icon] theme index:', themeName, '| bases:', bases.length, '| dirs:', directories.length, '| inherits:', inherits || '(none)');
    return result;
}

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

/**
 * Получает иконку файла. Возвращает { success, fileUrl }.
 * fileUrl — либо file:// URL иконки из темы, либо data URL из Electron-fallback.
 */
async function getFileIcon(filePath) {
    try {
        if (filePath.endsWith('.desktop')) {
            if (iconLookupCache.has(filePath)) {
                const cached = iconLookupCache.get(filePath);
                return cached ? { success: true, fileUrl: cached } : { success: false };
            }

            const iconName = await readDesktopIconName(filePath);

            if (iconName) {
                if (iconByNameCache.has(iconName)) {
                    const cached = iconByNameCache.get(iconName);
                    if (cached) {
                        iconLookupCache.set(filePath, cached);
                        return { success: true, fileUrl: cached };
                    }
                } else {
                    await yieldToEventLoop();

                    const themeName = await getCurrentIconTheme();
                    let iconPath = await findBestIconInTheme(iconName, themeName);

                    if (!iconPath) {
                        iconPath = await findIconInSteamDirs(iconName);
                        if (iconPath) console.log('[icon] found in Steam dir:', iconPath);
                    }

                    if (iconPath) {
                        const fileUrl = toFileUrl(iconPath);
                        if (fileUrl) {
                            iconByNameCache.set(iconName, fileUrl);
                            iconLookupCache.set(filePath, fileUrl);
                            return { success: true, fileUrl };
                        }
                    }
                    console.warn('[icon] not found in theme:', iconName);
                    iconByNameCache.set(iconName, null);
                }
            }

            // Fallback — Electron. Возвращаем dataUrl (единственный вариант
            // из NativeImage, но это редкий путь).
            await yieldToEventLoop();
            try {
                const icon = await app.getFileIcon(filePath, { size: 'large' });
                if (icon && !icon.isEmpty()) {
                    const dataUrl = icon.toDataURL();
                    iconLookupCache.set(filePath, dataUrl);
                    return { success: true, fileUrl: dataUrl };
                }
            } catch (_) { }
            iconLookupCache.set(filePath, null);
            return { success: false };
        }

        // Обычные файлы — Electron вернёт NativeImage, отдаём как dataUrl
        try {
            const icon = await app.getFileIcon(filePath, { size: 'large' });
            if (icon && !icon.isEmpty()) {
                return { success: true, fileUrl: icon.toDataURL() };
            }
        } catch (_) { }
        return { success: false };
    } catch (err) {
        console.error('[icon] getFileIcon error:', err);
        return { success: false, error: err.message };
    }
}

/* ------------------------------------------------------------------ */
/* MIME-тип и приложения                                                */
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
        } catch (_) { }
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
/* Контекст для нативного меню: рендер сообщает нам, куда кликнули     */
/* ------------------------------------------------------------------ */

const pendingFileContexts = new Map();  // wcId → { kind, paths, timestamp }
const CONTEXT_TTL_MS = 800;

ipcMain.on('fs:context-paths', (event, payload) => {
    if (!payload) return;
    pendingFileContexts.set(event.sender.id, {
        kind: payload.kind || 'files',
        paths: Array.isArray(payload.paths) ? payload.paths : [],
        timestamp: Date.now(),
    });
});

/**
 * Забирает (и удаляет) pending-контекст для указанного webContents.
 * Если прошло больше 800 мс — считаем устаревшим.
 */
export function consumePendingFileContext(wcId) {
    const entry = pendingFileContexts.get(wcId);
    if (!entry) return null;
    pendingFileContexts.delete(wcId);
    if (Date.now() - entry.timestamp > CONTEXT_TTL_MS) return null;
    return entry;
}

export { openPath, revealPath, trashPath, deletePath, renamePath, getAppsForFile };

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
    ipcMain.handle('fs:copy', (_e, { paths }) => copyFiles(paths));
    ipcMain.handle('fs:cut', (_e, { paths }) => cutFiles(paths));
    ipcMain.handle('fs:paste', (_e, { dir }) => pasteFiles(dir));
}