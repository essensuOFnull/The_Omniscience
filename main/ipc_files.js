import electronPkg from 'electron';
const { ipcMain, app } = electronPkg;
import { readdir, stat, rename as fsRename, unlink, readFile, rm, mkdir, writeFile, copyFile } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { watch } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

// dirPath → { watcher, refCount }
const watchers = new Map();

function startWatch(dirPath) {
    const existing = watchers.get(dirPath);
    if (existing) {
        existing.refCount++;
        return;
    }

    let watcher;
    try {
        watcher = watch(dirPath, { persistent: false }, (eventType, filename) => {
            if (!global.mainWindow || global.mainWindow.isDestroyed()) return;
            global.mainWindow.webContents.send('fs:did-change', {
                dir: dirPath,
                eventType,
                filename: filename || null,
            });
        });
    } catch (err) {
        console.error('[fs.watch] failed to watch', dirPath, err.message);
        return;
    }

    watcher.on('error', (err) => {
        console.error('[fs.watch] error', dirPath, err.message);
    });

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

const execAsync = promisify(exec);

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
            // Заменяем возможные $HOME в середине пути
            value = value.replace(/\$HOME/g, home);
            dirs[key] = value;
        }
        return dirs;
    } catch (_) {
        return defaults;
    }
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
                    name: entry.name,
                    isDir: stats.isDirectory(),
                    isSymlink: stats.isSymbolicLink(),
                    size: stats.size,
                    mtime: stats.mtime.toISOString(),
                });
            } catch (_) {
                // пропускаем файлы, к которым нет доступа
            }
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
                size: stats.size,
                mtime: stats.mtime.toISOString(),
                birthtime: stats.birthtime.toISOString(),
                isDir: stats.isDirectory(),
                isFile: stats.isFile(),
                isSymlink: stats.isSymbolicLink(),
                mode: '0' + (stats.mode & parseInt('777', 8)).toString(8),
                uid: stats.uid,
                gid: stats.gid,
            },
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/* ------------------------------------------------------------------ */
/* Открытие через систему                                              */
/* ------------------------------------------------------------------ */

async function openPath(filePath) {
    try {
        await execAsync(`xdg-open "${filePath.replace(/"/g, '\\"')}"`);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

async function revealPath(filePath) {
    // xdg-open на родительскую папку — самый надёжный способ.
    // Настоящий "reveal with selection" требует dbus-send, что хрупко.
    const parent = path.dirname(filePath);
    return openPath(parent);
}

/* ------------------------------------------------------------------ */
/* Операции с файлами                                                   */
/* ------------------------------------------------------------------ */

async function trashPath(filePath) {
    try {
        await execAsync(`gio trash "${filePath.replace(/"/g, '\\"')}"`);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

async function deletePath(filePath) {
    try {
        await rm(filePath, { recursive: true, force: true });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

async function renamePath(oldPath, newName) {
    try {
        if (!newName || newName.includes('/')) {
            return { success: false, error: 'invalid_name' };
        }
        const dir = path.dirname(oldPath);
        const newPath = path.join(dir, newName);
        await fsRename(oldPath, newPath);
        return { success: true, newPath };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/* ------------------------------------------------------------------ */
/* Иконки через Electron                                                */
/* ------------------------------------------------------------------ */

async function getFileIcon(filePath) {
    try {
        const icon = await app.getFileIcon(filePath, { size: 'large' });
        if (!icon || icon.isEmpty()) return { success: false };
        return { success: true, dataUrl: icon.toDataURL() };
    } catch (err) {
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
    } catch (_) {
        return null;
    }
}

const DESKTOP_DIRS = [
    '/usr/share/applications',
    '/usr/local/share/applications',
    path.join(os.homedir(), '.local/share/applications'),
];

async function readDesktopEntry(id) {
    // id вида "org.gnome.TextEditor.desktop"
    for (const dir of DESKTOP_DIRS) {
        const fullPath = path.join(dir, id);
        try {
            const content = await readFile(fullPath, 'utf8');
            let name = null;
            let nameRu = null;
            let inDesktopEntry = false;
            for (const line of content.split('\n')) {
                const trimmed = line.trim();
                if (trimmed === '[Desktop Entry]') { inDesktopEntry = true; continue; }
                if (trimmed.startsWith('[') && trimmed.endsWith(']')) { inDesktopEntry = false; continue; }
                if (!inDesktopEntry) continue;
                if (trimmed.startsWith('Name[ru]=')) nameRu = trimmed.slice(8);
                else if (trimmed.startsWith('Name=')) name = trimmed.slice(5);
            }
            return {
                id,
                name: nameRu || name || id,
                fullPath,
            };
        } catch (_) { /* пробуем следующую директорию */ }
    }
    return null;
}

async function getAppsForFile(filePath) {
    try {
        const mime = await getMimeType(filePath);
        if (!mime) return { success: true, apps: [], mime: null };

        const { stdout } = await execAsync(`gio mime ${mime}`);
        // Формат вывода:
        // Default application for "text/plain": X
        // Registered applications:
        //     X
        //     Y
        // Recommended applications:
        //     ...
        const ids = new Set();
        let inSection = false;
        for (const rawLine of stdout.split('\n')) {
            const line = rawLine.trim();
            if (!line) continue;
            if (line.startsWith('Registered applications:') || line.startsWith('Recommended applications:')) {
                inSection = true;
                continue;
            }
            if (line.includes(':') && !line.endsWith('.desktop')) {
                inSection = false;
                continue;
            }
            if (inSection && line.endsWith('.desktop')) {
                ids.add(line);
            }
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
        // desktopId — например, "org.gnome.TextEditor.desktop"
        // Используем gtk-launch — он принимает id без расширения
        const appName = desktopId.replace(/\.desktop$/, '');
        await execAsync(`gtk-launch "${appName}" "${filePath.replace(/"/g, '\\"')}"`);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/* ------------------------------------------------------------------ */
/* Создание файлов и папок                                              */
/* ------------------------------------------------------------------ */

export async function getTemplates() {
    const dirs = await getUserDirs();
    const templatesDir = dirs.templates;
    try {
        const entries = await readdir(templatesDir, { withFileTypes: true });
        const templates = [];
        for (const entry of entries) {
            if (entry.isFile() || entry.isSymbolicLink()) {
                templates.push({
                    id: path.join(templatesDir, entry.name),
                    name: entry.name,
                });
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
    } catch (err) {
        return { success: false, error: err.code || err.message };
    }
}

export async function createFile(dir, name) {
    try {
        const fullPath = path.join(dir, name);
        await writeFile(fullPath, '', { flag: 'wx' }); // wx — падает, если существует
        return { success: true, path: fullPath };
    } catch (err) {
        return { success: false, error: err.code || err.message };
    }
}

export async function createFromTemplate(dir, templatePath, name) {
    try {
        const destPath = path.join(dir, name);
        await copyFile(templatePath, destPath, fsConstants.COPYFILE_EXCL);
        return { success: true, path: destPath };
    } catch (err) {
        return { success: false, error: err.code || err.message };
    }
}

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

    ipcMain.on('fs:watch-start', (_e, { path: p }) => {
        if (p) startWatch(p);
    });

    ipcMain.on('fs:watch-stop', (_e, { path: p }) => {
        if (p) stopWatch(p);
    });

    ipcMain.handle('fs:get-templates', () => getTemplates());
    ipcMain.handle('fs:create-folder', (_e, { dir, name }) => createFolder(dir, name));
    ipcMain.handle('fs:create-file', (_e, { dir, name }) => createFile(dir, name));
}