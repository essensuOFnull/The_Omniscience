// apps/shortcuts-daemon/ipc.js
import { app, ipcMain } from 'electron';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { uIOhook, UiohookKey } from 'uiohook-napi';
import x11 from 'x11';

// ─── Конфигурация ──────────────────────────────────────────────────────
const CONFIG_PATH = path.join(app.getPath('userData'), 'shortcuts.json');
let shortcuts = {};             // { "Alt+Shift": "switch-layout", ... }
let layouts   = ['us', 'ru'];

// ─── Отображение keycode → имя (совпадает с тем, что пишет UI) ─────────
const KEYCODE_TO_NAME = {};
for (const [name, code] of Object.entries(UiohookKey)) {
    if (typeof code === 'number' && KEYCODE_TO_NAME[code] === undefined) {
        KEYCODE_TO_NAME[code] = name;
    }
}
// Нормализуем имена под UI-рекордер
const RENAMES = {
    'Escape':     'Esc',
    'ArrowUp':    'Up',
    'ArrowDown':  'Down',
    'ArrowLeft':  'Left',
    'ArrowRight': 'Right',
};
for (const code of Object.keys(KEYCODE_TO_NAME)) {
    const n = KEYCODE_TO_NAME[code];
    if (RENAMES[n]) KEYCODE_TO_NAME[code] = RENAMES[n];
}

// Коды модификаторов — их мы не добавляем как «основную клавишу»
const MODIFIER_CODES = new Set([
    UiohookKey.Alt, UiohookKey.AltRight,
    UiohookKey.Ctrl, UiohookKey.CtrlRight,
    UiohookKey.Shift, UiohookKey.ShiftRight,
    UiohookKey.Meta, UiohookKey.MetaRight,
].filter(v => typeof v === 'number'));

// ─── Построение аккорда из события uIOhook ─────────────────────────────
function buildAccelFromEvent(e) {
    const selfIsMod = MODIFIER_CODES.has(e.keycode);
    const parts = [];
    // Порядок строго как в UI: Control, Alt, Shift, Super
    if (e.ctrlKey)  parts.push('Control');
    if (e.altKey)   parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey)  parts.push('Super');
    // Основную клавишу добавляем только для НЕ-модификаторов
    if (!selfIsMod) {
        const main = KEYCODE_TO_NAME[e.keycode];
        if (main) parts.push(main);
    }
    return parts.join('+');
}

// ─── Конфиг ────────────────────────────────────────────────────────────
function loadConfig() {
    try {
        if (existsSync(CONFIG_PATH)) {
            const data = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
            shortcuts = data.shortcuts ?? {};
            layouts   = data.layouts   ?? ['us', 'ru'];
        }
    } catch { /* ignore */ }

    // Дефолт: если switch-layout нигде не назначен и Alt+Shift свободен — ставим.
    if (!Object.values(shortcuts).includes('switch-layout') && !shortcuts['Alt+Shift']) {
        shortcuts['Alt+Shift'] = 'switch-layout';
        saveConfig();
        console.log('[shortcuts] default binding added: Alt+Shift → switch-layout');
    }
}
function saveConfig() {
    try {
        writeFileSync(CONFIG_PATH, JSON.stringify({ shortcuts, layouts }, null, 2));
    } catch { /* ignore */ }
}

// ─── Раскладки ─────────────────────────────────────────────────────────
function applyLayouts() {
    if (!layouts.length) return;
    const r = spawnSync('setxkbmap', ['-layout', layouts.join(',')], { encoding: 'utf8' });
    if (r.status !== 0) console.warn('[shortcuts] setxkbmap error:', r.stderr);
    else console.log('[shortcuts] layouts applied:', layouts.join(','));
}

let X = null;
let Xkb = null;

function initX11(cb) {
    x11.createClient((err, display) => {
        if (err) return cb(err);
        X = display.client;
        X.require('xkb', (err, xkb) => {
            if (err || !xkb.supported) return cb(err || new Error('XKB unsupported'));
            Xkb = xkb;
            cb(null);
        });
    });
}

function switchNextLayout() {
    if (!Xkb) return;
    Xkb.GetState(Xkb.UseCoreKbd, (err, state) => {
        if (err) return;
        const next = (state.group + 1) % 4;
        Xkb.LatchLockState(Xkb.UseCoreKbd, 0, 0, true, next, 0, 0, false, 0);
    });
}
function getCurrentLayout() {
    return new Promise((resolve) => {
        if (!Xkb) return resolve(null);
        Xkb.GetState(Xkb.UseCoreKbd, (err, state) => resolve(err ? null : state.group));
    });
}

// ─── Выполнение ────────────────────────────────────────────────────────
function executeCommand(command) {
    if (command === 'switch-layout') {
        switchNextLayout();
        return;
    }
    spawn('sh', ['-c', command], { detached: true, stdio: 'ignore' }).unref();
}

// ─── Хук ───────────────────────────────────────────────────────────────
function startGlobalHook() {
    uIOhook.on('keydown', (e) => {
        const accel = buildAccelFromEvent(e);
        if (!accel) return;
        const cmd = shortcuts[accel];
        if (cmd) {
            console.log('[shortcuts] trigger:', accel, '→', cmd);
            executeCommand(cmd);
        }
    });
    uIOhook.start();
}

// ─── IPC ───────────────────────────────────────────────────────────────
ipcMain.handle('shortcuts:list', () =>
    Object.entries(shortcuts).map(([accelerator, command]) => ({ accelerator, command }))
);
ipcMain.handle('shortcuts:set', (_e, { accelerator, command }) => {
    if (!accelerator || !command) return { ok: false, error: 'нужны оба поля' };
    shortcuts[accelerator] = command;
    saveConfig();
    return { ok: true };
});
ipcMain.handle('shortcuts:remove', (_e, accelerator) => {
    if (shortcuts[accelerator]) {
        delete shortcuts[accelerator];
        saveConfig();
        return { ok: true };
    }
    return { ok: false, error: 'не найдено' };
});
ipcMain.handle('shortcuts:execute', (_e, command) => {
    executeCommand(command);
    return { ok: true };
});

ipcMain.handle('layouts:get', async () => ({ layouts, current: await getCurrentLayout() }));
ipcMain.handle('layouts:set', (_e, newLayouts) => {
    if (!Array.isArray(newLayouts) || !newLayouts.length) {
        return { ok: false, error: 'нужен непустой массив' };
    }
    layouts = newLayouts;
    saveConfig();
    applyLayouts();
    return { ok: true };
});
ipcMain.handle('layouts:switch-next', () => { switchNextLayout(); return { ok: true }; });

// ─── Старт ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
    loadConfig();
    applyLayouts();
    initX11((err) => {
        if (err) console.error('[shortcuts] no XKB:', err.message);
        startGlobalHook();
    });
});
app.on('will-quit', () => {
    uIOhook.stop();
    if (X) try { X.terminate(); } catch {}
});