#!/usr/bin/env node
// session/session.mjs
//
// Запускается xinit'ом ВНУТРИ X, от имени omni_<user>_tty<N>.
// Роль:
//   1. KWin первым — ждём WM.
//   2. Раскладка через setxkbmap (замена модуля keyboard из kded6).
//   3. Сервисы KDE — все, с перебором имён.
//   4. Electron.
//
// ВАЖНО: KDE_FULL_SESSION=false. Это говорит KDE-компонентам, что
// «полной сессии нет», и они перестают настойчиво искать kded/ksmserver/
// plasma через systemd --user (которого у нашего псевдо-пользователя
// и нет). Отдельные сервисы всё равно запускаются — но без каскада
// D-Bus-активаций и ошибок systemd.

import { spawn, spawnSync } from 'node:child_process';
import { connect } from 'node:net';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── KDE_FULL_SESSION=false ДО всего остального ─────────────────────────

process.env.KDE_FULL_SESSION = 'false';
delete process.env.KDE_SESSION_VERSION;
delete process.env.KDE_SESSION_UID;

// ─── Логирование ────────────────────────────────────────────────────────

let logSocket = null;
if (process.env.OMNISCIENCE_LOG_SOCKET) {
    try {
        logSocket = connect(process.env.OMNISCIENCE_LOG_SOCKET);
        logSocket.on('error', () => { logSocket = null; });
        logSocket.on('close', () => { logSocket = null; });
    } catch {
        logSocket = null;
    }
}

function log(line) {
    const s = `[session] ${line}\n`;
    try { process.stdout.write(s); } catch {}
    if (logSocket && !logSocket.destroyed) {
        try { logSocket.write(s); } catch {}
    }
}

process.on('uncaughtException', err => {
    log(`UNCAUGHT: ${err?.stack ?? err?.message ?? String(err)}`);
    process.exit(1);
});

process.on('unhandledRejection', err => {
    log(`UNHANDLED REJECTION: ${err?.stack ?? err?.message ?? String(err)}`);
    process.exit(1);
});

log('session.mjs loaded');

// ─── Импорт electron ────────────────────────────────────────────────────

let electronPath;
try {
    const mod = await import('electron');
    electronPath = mod.default;
    log(`electron resolved: ${electronPath}`);
} catch (err) {
    log(`FATAL: cannot import electron: ${err.message}`);
    process.exit(1);
}

// ─── Пути и окружение ───────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = process.env.OMNISCIENCE_PROJECT_ROOT
    ?? path.resolve(__dirname, '..');

log(`PROJECT_ROOT=${PROJECT_ROOT}`);
log(`USER=${process.env.USER}`);
log(`HOME=${process.env.HOME}`);
log(`DISPLAY=${process.env.DISPLAY ?? 'unset'}`);
log(`DBUS=${process.env.DBUS_SESSION_BUS_ADDRESS ?? 'unset'}`);
log(`KDE_FULL_SESSION=${process.env.KDE_FULL_SESSION}`);

if (!process.env.DISPLAY) {
    log('FATAL: DISPLAY не задан.');
    process.exit(1);
}

// ─── Изолированный XDG_CONFIG_HOME ──────────────────────────────────────

const RUNTIME = process.env.XDG_RUNTIME_DIR ?? `/run/user/${process.getuid()}`;
const SESSION_CONFIG = path.join(RUNTIME, 'omniscience-config');
try { mkdirSync(SESSION_CONFIG, { recursive: true }); } catch {}
try { mkdirSync(path.join(SESSION_CONFIG, 'kde'), { recursive: true }); } catch {}

process.env.XDG_CONFIG_HOME = SESSION_CONFIG;
process.env.KDEHOME = path.join(SESSION_CONFIG, 'kde');
process.env.QT_QPA_PLATFORM = 'xcb';

log(`XDG_CONFIG_HOME=${SESSION_CONFIG}`);

// ─── Резолвер бинарников ────────────────────────────────────────────────

function resolveBinary(candidates) {
    for (const c of candidates) {
        if (c.startsWith('/')) {
            if (existsSync(c)) return c;
            continue;
        }
        const r = spawnSync('which', [c], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        if (r.status === 0) {
            const p = (r.stdout ?? '').trim();
            if (p) return p;
        }
    }
    return null;
}

// ─── Раскладка клавиатуры ───────────────────────────────────────────────

function applyKeyboardLayout() {
    const rcPath = path.join(SESSION_CONFIG, 'kxkbrc');
    let layout = 'us', model = 'pc105', options = '', variant = '';

    if (existsSync(rcPath)) {
        try {
            const txt = readFileSync(rcPath, 'utf8');
            const get = (key) => {
                const m = txt.match(new RegExp(`^${key}\\s*=\\s*(.*)$`, 'm'));
                return m ? m[1].trim() : '';
            };
            layout = get('LayoutList') || layout;
            model = get('Model') || model;
            options = get('Options') || '';
            variant = get('VariantList') || '';
        } catch (err) {
            log(`WARN: read kxkbrc failed: ${err.message}`);
        }
    }

    const args = ['-layout', layout, '-model', model];
    if (variant) args.push('-variant', variant);
    if (options) args.push('-option', options);

    log(`applying keyboard: setxkbmap ${args.join(' ')}`);
    const r = spawnSync('setxkbmap', args, { stdio: 'inherit' });
    if (r.status !== 0) {
        log(`WARN: setxkbmap exited with status ${r.status}`);
    }
}

// ─── Список сервисов ────────────────────────────────────────────────────
//
// Все на месте. Если что-то упадёт — увидим в логе, сессия продолжится.
// Зависимость сессии только от kwin_x11 (якорь) и electron.

const SERVICE_SPECS = [
    {
        label: 'kded6',
        candidates: ['kded6', 'kded5', 'kded'],
        args: [],
    },
    {
        label: 'kglobalacceld',
        candidates: ['kglobalacceld', 'kglobalaccel6', 'kglobalaccel5', 'kglobalaccel'],
        args: [],
    },
    {
        label: 'ksmserver',
        candidates: ['ksmserver6', 'ksmserver', 'ksmserver5'],
        args: ['--no-lockscreen'],
    },
    {
        label: 'polkit-kde-agent',
        candidates: [
            'polkit-kde-agent-1',
            'polkit-kde-authentication-agent-1',
            '/usr/lib/polkit-kde-authentication-agent-1',
            '/usr/libexec/polkit-kde-authentication-agent-1',
            '/usr/lib64/libexec/polkit-kde-authentication-agent-1',
            '/usr/lib/x86_64-linux-gnu/libexec/polkit-kde-authentication-agent-1',
            '/usr/lib/aarch64-linux-gnu/libexec/polkit-kde-authentication-agent-1',
        ],
        args: [],
    },
    {
        label: 'easyeffects',
        candidates: ['easyeffects'],
        args: ['--service-mode'],
    },
];

// ─── Ожидание WM ────────────────────────────────────────────────────────

async function waitForWM(timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const r = spawnSync('xprop', ['-root', '_NET_SUPPORTING_WM_CHECK'], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        if (r.stdout && r.stdout.includes('window id')) return true;
        await new Promise(res => setTimeout(res, 100));
    }
    return false;
}

// ─── KWin первым ────────────────────────────────────────────────────────

log('launching kwin_x11 --replace');
const kwin = spawn('kwin_x11', ['--replace'], { stdio: 'inherit' });
kwin.on('error', err => log(`kwin spawn error: ${err.message}`));
kwin.on('exit', (code, sig) => log(`kwin exited code=${code} sig=${sig}`));

if (!await waitForWM()) {
    log('FATAL: KWin did not register as WM within 15s');
    try { kwin.kill('SIGTERM'); } catch {}
    process.exit(1);
}
log('KWin registered as WM');

// ─── Раскладка ──────────────────────────────────────────────────────────

applyKeyboardLayout();

// ─── Сервисы ────────────────────────────────────────────────────────────

const children = [];

for (const spec of SERVICE_SPECS) {
    const bin = resolveBinary(spec.candidates);
    if (!bin) {
        log(`WARN: ${spec.label} не найден (искали: ${spec.candidates.join(', ')})`);
        continue;
    }

    try {
        const child = spawn(bin, spec.args, { stdio: 'inherit' });
        child.on('error', err => log(`failed to spawn ${spec.label} (${bin}): ${err.message}`));
        child.on('exit', (code, sig) => log(`${spec.label} exited code=${code} sig=${sig}`));
        children.push(child);
        log(`started ${spec.label} → ${bin} (pid=${child.pid})`);
    } catch (err) {
        log(`spawn error for ${spec.label}: ${err.message}`);
    }
}

// ─── Electron ───────────────────────────────────────────────────────────

log('launching electron');

// Electron под нашим псевдо-пользователем запускается с capabilities,
// из-за чего Chromium не может построить sandbox и падает с SIGILL.
// Мы уже дали пользователю «root-like» доступ к файлам, поэтому sandbox
// здесь избыточен.
//
// user-data-dir — отдельный, на tmpfs (вне bindfs): Chromium создаёт
// там flock-локи, а bindfs не умеет пробрасывать fcntl/flock.
const electronDataDir = path.join(RUNTIME, 'omniscience-electron');
try { mkdirSync(electronDataDir, { recursive: true }); } catch {}

const electronArgs = [
    '.',
    '--no-sandbox',                        // ← главное
    '--disable-setuid-sandbox',
    '--disable-gpu-sandbox',
    `--user-data-dir=${electronDataDir}`,
    '--disable-dev-shm-usage',
    '--enable-logging=stderr',
];

const electron = spawn(electronPath, electronArgs, {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
    env: process.env,
});
electron.on('error', err => log(`electron spawn error: ${err.message}`));
electron.on('exit', (code, sig) => log(`electron exited code=${code} sig=${sig}`));

// ─── Завершение ─────────────────────────────────────────────────────────

let shuttingDown = false;
function shutdown(reason, code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`shutting down: ${reason}`);

    try { electron.kill('SIGTERM'); } catch {}
    for (const c of children) { try { c.kill('SIGTERM'); } catch {} }
    try { kwin.kill('SIGTERM'); } catch {}

    setTimeout(() => {
        try { electron.kill('SIGKILL'); } catch {}
        for (const c of children) { try { c.kill('SIGKILL'); } catch {} }
        try { kwin.kill('SIGKILL'); } catch {}
        try { if (logSocket && !logSocket.destroyed) logSocket.end(); } catch {}
        process.exit(code);
    }, 1500).unref();
}

electron.on('exit', (code, sig) => shutdown(`electron exited code=${code} sig=${sig}`, code ?? 0));
kwin.on('exit',     (code, sig) => shutdown(`kwin exited code=${code} sig=${sig}`, code ?? 0));

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP',  () => shutdown('SIGHUP'));