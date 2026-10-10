import electronPkg from 'electron';
const { ipcMain, app, nativeImage } = electronPkg;
import { readdir, stat, rename as fsRename, unlink, readFile, rm, mkdir, writeFile, copyFile, access } from 'fs/promises';
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
        const ext = path.extname(filePath).toLowerCase();
        
        // 1. Если это ярлык .desktop — запускаем его через gio launch
        if (ext === '.desktop') {
            await execAsync(`gio launch "${filePath.replace(/"/g, '\\"')}"`);
            return { success: true };
        }

        // 2. Если это исполняемый файл (скрипт, бинарник) — запускаем его
        try {
            const stats = await stat(filePath);
            const isExecutable = (stats.mode & 0o111) !== 0;
            if (isExecutable && !stats.isDirectory()) {
                await execAsync(`"${filePath.replace(/"/g, '\\"')}"`);
                return { success: true };
            }
        } catch (e) {
            // Игнорируем ошибки доступа, идем дальше
        }

        // 3. Стандартное открытие для всех остальных файлов
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
/* Иконки через Electron + парсинг .desktop                             */
/* ------------------------------------------------------------------ */

/**
 * Ищет все файлы иконки с указанным именем во всех стандартных
 * директориях Linux. Возвращает массив путей, отсортированный
 * по убыванию «качества» (высокое разрешение → низкое).
 */
async function findIconCandidates(iconName) {
    if (!iconName) return [];

    // Абсолютный путь из .desktop — используем напрямую
    if (path.isAbsolute(iconName)) {
        try {
            await access(iconName);
            return [iconName];
        } catch (_) {
            console.warn('[icon] absolute path not found:', iconName);
            return [];
        }
    }

    const home = os.homedir();
    const allDirs = [
        // XDG / стандартные
        path.join(home, '.local/share/icons'),
        path.join(home, '.icons'),
        path.join(home, '.local/share/pixmaps'),
        '/usr/share/icons',
        '/usr/local/share/icons',
        '/usr/share/pixmaps',
        // Flatpak
        path.join(home, '.local/share/flatpak/exports/share/icons'),
        '/var/lib/flatpak/exports/share/icons',
        // Steam (нативный)
        path.join(home, '.steam/steam'),
        path.join(home, '.steam/root'),
        path.join(home, '.local/share/Steam'),
        // Steam (Flatpak)
        path.join(home, '.var/app/com.valvesoftware.Steam/.local/share/icons'),
        path.join(home, '.var/app/com.valvesoftware.Steam/.steam'),
        // Snap
        '/var/lib/snapd/desktop/icons',
    ];

    // 👇 Оставляем только те директории, что реально существуют —
    // иначе find падает с exit code 1, и execAsync бросает исключение
    const existingDirs = [];
    for (const d of allDirs) {
        try {
            await access(d);
            existingDirs.push(d);
        } catch (_) { /* нет такой директории — пропускаем */ }
    }

    if (existingDirs.length === 0) {
        console.warn('[icon] no icon directories exist on this system');
        return [];
    }

    const escaped = iconName.replace(/"/g, '\\"');
    const dirsArg = existingDirs.map((d) => `"${d}"`).join(' ');
    // || true — страховка на случай неожиданного exit code
    const cmd = `find ${dirsArg} -type f \\( -name "${escaped}.png" -o -name "${escaped}.svg" \\) 2>/dev/null || true`;

    let candidates = [];
    try {
        const { stdout } = await execAsync(cmd);
        candidates = stdout.split('\n').map((l) => l.trim()).filter(Boolean);
    } catch (err) {
        // Иногда find успевает что-то напечатать в stdout до падения — заберём это
        const out = err.stdout || '';
        candidates = out.split('\n').map((l) => l.trim()).filter(Boolean);
        if (candidates.length === 0) {
            console.warn('[icon] find failed for', iconName, err.message);
            return [];
        }
    }

    if (candidates.length === 0) {
        console.warn('[icon] not found:', iconName);
        return [];
    }

    // Дедупликация
    candidates = [...new Set(candidates)];

    // Оценка и сортировка по качеству
    const scored = candidates
        .map((p) => ({ path: p, score: scoreIconCandidate(p) }))
        .sort((a, b) => b.score - a.score);

    console.log(`[icon] "${iconName}": ${candidates.length} matches, best =`, scored[0]?.path);
    if (scored.length > 1) {
        console.log('[icon]   backups:', scored.slice(1, 4).map((s) => s.path));
    }

    return scored.map((s) => s.path);
}

/**
 * Оценка иконки: чем больше разрешение — тем выше.
 * SVG (вектор) — считаем эквивалентом ~256px.
 * PNG чуть предпочтительнее SVG (надёжнее декодируется nativeImage).
 */
function scoreIconCandidate(p) {
    const lower = p.toLowerCase();
    let size = 0;

    if (lower.includes('/scalable/') || lower.endsWith('.svg')) {
        // Вектор — эквивалент хорошего растрового размера для нашего UI (48px отображение)
        size = 256;
    } else {
        // Ищем NNNxNNN в пути (папка темы) или в имени файла
        const matches = p.match(/(\d+)x(\d+)/g);
        if (matches) {
            for (const m of matches) {
                const [w, h] = m.split('x').map(Number);
                size = Math.max(size, Math.min(w, h));
            }
        }
    }

    // Если размер не определён (например, /usr/share/pixmaps/foo.png) — считаем средним
    if (size === 0) size = 48;

    // Не даём гигантским иконкам (1024x1024) преимущества — только память жрут
    size = Math.min(size, 512);

    // Множители — чтобы бонус не «перебивал» размер, а лишь уточнял при равенстве
    let multiplier = 1;
    if (lower.endsWith('.png')) multiplier *= 1.05;     // PNG немного надёжнее для nativeImage
    if (lower.includes('/apps/')) multiplier *= 1.05;   // иконки приложений, а не mimetypes/devices

    return size * multiplier;
}

/**
 * Достаёт имя иконки из .desktop-файла.
 */
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
        console.warn('[icon] no Icon= in', desktopPath);
        return null;
    } catch (err) {
        console.warn('[icon] failed to read desktop file:', err.message);
        return null;
    }
}

async function getFileIcon(filePath) {
    try {
        // Особый случай — ярлыки .desktop
        if (filePath.endsWith('.desktop')) {
            const iconName = await readDesktopIconName(filePath);

            if (iconName) {
                const candidates = await findIconCandidates(iconName);

                // Пробуем по порядку: если лучший (например SVG) не декодируется,
                // берём следующий — например, тот же размер в PNG
                for (const iconPath of candidates) {
                    try {
                        const icon = nativeImage.createFromPath(iconPath);
                        if (!icon.isEmpty()) {
                            return { success: true, dataUrl: icon.toDataURL() };
                        }
                        console.warn('[icon] nativeImage empty for', iconPath);
                    } catch (e) {
                        console.warn('[icon] nativeImage threw for', iconPath, e.message);
                    }
                }
            }

            // Fallback — стандартный путь через Electron
            try {
                const icon = await app.getFileIcon(filePath, { size: 'large' });
                if (icon && !icon.isEmpty()) {
                    return { success: true, dataUrl: icon.toDataURL() };
                }
            } catch (_) {}

            return { success: false };
        }

        // Все остальные файлы — стандартный путь
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

async function getTemplates() {
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
    ipcMain.handle('fs:create-from-template', (_e, { dir, templatePath, name }) =>
        createFromTemplate(dir, templatePath, name));
}