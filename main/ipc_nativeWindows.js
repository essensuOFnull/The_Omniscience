import electronPkg from 'electron';
const { ipcMain } = electronPkg;
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const POLL_INTERVAL_MS = 500;

// Классы, которые не надо показывать в таскбаре
// (это наше собственное окно, не пользовательские приложения)
const IGNORE_CLASS_PARTS = ['the_omniscience', 'electron', 'kwin', 'plasmashell'];

let pollTimer = null;
let lastHash = '';
let isBusy = false;
let userInteracting = false;

async function getNativeWindows() {
    try {
        // -l: список окон
        // -G: geometry (x y w h)
        // -x: WM_CLASS (для фильтрации)
        // -p: PID
        const { stdout } = await execAsync('wmctrl -l -G -x -p');
        const lines = stdout.trim().split('\n').filter(Boolean);

        const result = [];
        for (const line of lines) {
            // Формат:
            // 0x04000007  0  100  200  1280  720  12345  firefox.Firefox  Заголовок
            const parts = line.trim().split(/\s+/);
            if (parts.length < 9) continue;

            const id = parts[0];
            const desk = parseInt(parts[1]);
            const x = parseInt(parts[2]);
            const y = parseInt(parts[3]);
            const width = parseInt(parts[4]);
            const height = parseInt(parts[5]);
            const pid = parseInt(parts[6]);
            const wmClass = (parts[7] || '').toLowerCase();
            const title = parts.slice(8).join(' ');

            // Пропускаем sticky-окна (рабочий стол -1)
            if (desk === -1) continue;

            // Пропускаем наши
            if (IGNORE_CLASS_PARTS.some((c) => wmClass.includes(c))) continue;

            result.push({ id, x, y, width, height, pid, wmClass, title });
        }

        return result;
    } catch (_) {
        return [];
    }
}

function hashWindows(windows) {
    return windows
        .map((w) => `${w.id}|${w.x}|${w.y}|${w.width}|${w.height}|${w.title}`)
        .join(';');
}

async function tick() {
    if (!global.mainWindow || global.mainWindow.isDestroyed()) return;
    if (userInteracting) return;

    const windows = await getNativeWindows();
    const hash = hashWindows(windows);

    if (hash === lastHash) return;
    lastHash = hash;

    global.mainWindow.webContents.send('shell:native-windows-updated', windows);
}

export default function () {
    // Обработчики для управления будут добавлены следующим шагом.
    // Пока — только чтение.

    // Первый запуск — сразу после старта
    setTimeout(tick, 800);

    // Дальше — периодически
    pollTimer = setInterval(tick, POLL_INTERVAL_MS);

    /* -------- Управление нативными окнами -------- */

    ipcMain.on('native-window:focus', async (_e, { id }) => {
        try { await execAsync(`wmctrl -i -a ${id}`); tick(); } catch (_) { }
    });

    ipcMain.on('native-window:close', async (_e, { id }) => {
        try { await execAsync(`wmctrl -i -c ${id}`); tick(); } catch (_) { }
    });

    ipcMain.on('native-window:minimize', async (_e, { id }) => {
        try { await execAsync(`xdotool windowminimize ${id}`); tick(); } catch (_) { }
    });

    const TOPBAR_H = 72;

    ipcMain.on('native-window:maximize', async (_e, { id, maximized }) => {
        try {
            const mainSize = global.mainWindow.contentView.getBounds();
            const W = mainSize.width;
            const H = mainSize.height - TOPBAR_H;

            // Сначала снимаем все EWMH-флаги максимизации — чтобы не конфликтовало
            await execAsync(`wmctrl -i -r ${id} -b remove,maximized_vert,maximized_horz`).catch(() => { });

            if (maximized) {
                // Восстановление: возвращаем окно в размер, который был ДО максимизации.
                // Если у нас нет его сохранённого — просто уменьшаем до разумного.
                // (В идеале надо хранить native_unmaximize_bounds, но пока — просто.)
                const dflt = { w: Math.round(W * 0.7), h: Math.round(H * 0.7) };
                const x = Math.round((W - dflt.w) / 2);
                const y = TOPBAR_H + Math.round((H - dflt.h) / 2);
                await execAsync(`xdotool windowsize ${id} ${dflt.w} ${dflt.h}`);
                await execAsync(`xdotool windowmove ${id} ${x} ${y}`);
            } else {
                // Псевдо-максимизация: размер под TopBar
                await execAsync(`xdotool windowsize ${id} ${W} ${H}`);
                await execAsync(`xdotool windowmove ${id} 0 ${TOPBAR_H}`);
            }
            tick();
        } catch (err) {
            console.error('[native-window:maximize]', err.message);
        }
    });

    ipcMain.on('native-window:move', async (_e, { id, x, y }) => {
        userInteracting = true;
        try {
            const bounds = global.mainWindow.contentView.getBounds();
            const TOPBAR_H = 72;
            // Не даём уйти за границы экрана
            const cx = Math.max(0, Math.min(bounds.width - 100, Math.round(x)));
            const cy = Math.max(TOPBAR_H, Math.min(bounds.height - 50, Math.round(y)));
            await execAsync(`xdotool windowmove ${id} ${cx} ${cy}`);
        } catch (_) { }
    });

    ipcMain.on('native-window:resize', async (_e, { id, x, y, width, height }) => {
        userInteracting = true;
        try {
            // Одна команда вместо двух — меньше задержки
            await execAsync(`xdotool windowsize ${id} ${Math.round(width)} ${Math.round(height)} windowmove ${id} ${Math.round(x)} ${Math.round(y)}`);
        } catch (_) { }
    });

    // Новый канал: сообщить, что пользователь отпустил мышь
    ipcMain.on('native-window:release', () => {
        userInteracting = false;
    });

    ipcMain.handle('native-window:get-bounds', async (_e, { id }) => {
        try {
            const { stdout } = await execAsync(`xdotool getwindowgeometry --shell ${id}`);
            const lines = stdout.trim().split('\n');
            const get = (key) => {
                const l = lines.find((s) => s.startsWith(key + '='));
                return l ? parseInt(l.split('=')[1], 10) : 0;
            };
            return {
                x: get('X'),
                y: get('Y'),
                width: get('WIDTH'),
                height: get('HEIGHT'),
            };
        } catch (err) {
            return null;
        }
    });

    /* -------- Запуск KRunner -------- */
    let krunnerBusy = false;

    ipcMain.handle('shell:run-krunner', async () => {
        if (krunnerBusy) return { ok: true }; // защита от двойного клика
        krunnerBusy = true;
        try {
            // 1) Если krunner уже запущен — просто просим показать окно через DBus.
            //    Это самый надёжный способ, без спавна второго процесса.
            try {
                await execAsync('qdbus org.kde.krunner /App display');
                return { ok: true, via: 'dbus' };
            } catch (_) {
                // qdbus может не быть (или krunner не запущен) — падаем на spawn
            }

            // 2) Иначе — стартуем krunner как detached-процесс.
            const child = spawn('krunner', [], {
                detached: true,
                stdio: 'ignore',
            });
            child.unref();
            return { ok: true, via: 'spawn' };
        } catch (err) {
            console.error('[shell:run-krunner]', err.message);
            return { ok: false, error: err.message };
        } finally {
            // отпускаем через небольшую задержку, чтобы двойной клик не создал второй процесс
            setTimeout(() => { krunnerBusy = false; }, 300);
        }
    });
    ipcMain.handle('shell:systemsettings', async () => {
        try {
            const child = spawn('systemsettings', [], {
                detached: true,
                stdio: 'ignore',
            });
            child.unref();
            return { ok: true, via: 'spawn' };
        } catch (err) {
            console.error('[shell:systemsettings]', err.message);
            return { ok: false, error: err.message };
        }
    });
}