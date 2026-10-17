#!/usr/bin/env node
// session/session.mjs
//
// Запускается xinit'ом ВНУТРИ X, от имени текущего пользователя.
//
// Архитектура:
//   kwin_x11 + PipeWire + независимые сервисы + Electron.
//
// Не запускаем: plasmashell, klipper, powerdevil, baloo, screen locker,
// notification daemon, system tray, trash, kactivitymanagerd, порталы.

import { spawn, spawnSync } from 'node:child_process';
import { connect } from 'node:net';
import {
    existsSync, mkdirSync, copyFileSync, readFileSync,
    writeFileSync, chmodSync,
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Окружение сессии ──────────────────────────────────────────────────

process.env.KDE_FULL_SESSION    = 'true';
process.env.KDE_SESSION_VERSION = '6';
process.env.XDG_CURRENT_DESKTOP = 'Omniscience';
process.env.DESKTOP_SESSION     = 'omniscience';
process.env.XDG_SESSION_TYPE    = 'x11';
process.env.QT_QPA_PLATFORM     = 'xcb';

process.env.GTK_IM_MODULE  = 'fcitx';
process.env.QT_IM_MODULE   = 'fcitx';
process.env.XMODIFIERS     = '@im=fcitx';
process.env.SDL_IM_MODULE  = 'fcitx';
process.env.GLFW_IM_MODULE = 'ibus';

// ─── Логирование ───────────────────────────────────────────────────────

let logSocket = null;
if (process.env.OMNISCIENCE_LOG_SOCKET) {
    try {
        logSocket = connect(process.env.OMNISCIENCE_LOG_SOCKET);
        logSocket.on('error', () => { logSocket = null; });
        logSocket.on('close', () => { logSocket = null; });
    } catch { logSocket = null; }
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

// ─── Импорт electron ───────────────────────────────────────────────────

let electronPath;
try {
    const mod = await import('electron');
    electronPath = mod.default;
    log(`electron resolved: ${electronPath}`);
} catch (err) {
    log(`FATAL: cannot import electron: ${err.message}`);
    process.exit(1);
}

// ─── Пути ──────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = process.env.OMNISCIENCE_PROJECT_ROOT
    ?? path.resolve(__dirname, '..');

log(`PROJECT_ROOT=${PROJECT_ROOT}`);
log(`USER=${process.env.USER}`);
log(`HOME=${process.env.HOME}`);
log(`DISPLAY=${process.env.DISPLAY ?? 'unset'}`);
log(`DBUS=${process.env.DBUS_SESSION_BUS_ADDRESS ?? 'unset'}`);

if (!process.env.DISPLAY) {
    log('FATAL: DISPLAY не задан.');
    process.exit(1);
}

// ─── Изолированный XDG_CONFIG_HOME ─────────────────────────────────────
//
// Чтобы конфиги KDE-сессии не смешивались с обычной KDE-сессией,
// держим свой каталог. Он пересоздаётся при каждом запуске,
// конфиги копируются из PROJECT_ROOT/configs/.

const RUNTIME = process.env.XDG_RUNTIME_DIR ?? `/run/user/${process.getuid()}`;
const SESSION_CONFIG = path.join(RUNTIME, 'omniscience-config');
try { mkdirSync(SESSION_CONFIG, { recursive: true }); } catch {}
try { mkdirSync(path.join(SESSION_CONFIG, 'kde'), { recursive: true }); } catch {}

process.env.XDG_CONFIG_HOME = SESSION_CONFIG;
process.env.KDEHOME = path.join(SESSION_CONFIG, 'kde');

log(`XDG_CONFIG_HOME=${SESSION_CONFIG}`);

// ─── Копирование конфигов ──────────────────────────────────────────────

const PROJECT_CONFIGS = path.join(PROJECT_ROOT, 'configs');
log(`project configs: ${PROJECT_CONFIGS}`);

const KDE_CONFIGS = [
    { src: 'kwinrc.ini',             dst: 'kwinrc'             },
    { src: 'kwinrulesrc.ini',        dst: 'kwinrulesrc'        },
    { src: 'kxkbrc.ini',             dst: 'kxkbrc'             },
    { src: 'kglobalshortcutsrc.ini', dst: 'kglobalshortcutsrc' },
];

for (const { src, dst } of KDE_CONFIGS) {
    const srcPath = path.join(PROJECT_CONFIGS, src);
    const dstPath = path.join(SESSION_CONFIG, dst);
    if (existsSync(srcPath)) {
        try {
            copyFileSync(srcPath, dstPath);
            log(`  copied ${src} → ${dst}`);
        } catch (err) {
            log(`  WARN: copy ${src} failed: ${err.message}`);
        }
    }
}

// PipeWire
{
    const src = path.join(PROJECT_CONFIGS, 'pipewire', '10-sample-rate.conf');
    const dstDir = path.join(SESSION_CONFIG, 'pipewire', 'pipewire.conf.d');
    if (existsSync(src)) {
        try {
            mkdirSync(dstDir, { recursive: true });
            copyFileSync(src, path.join(dstDir, '10-sample-rate.conf'));
            log('  copied pipewire/10-sample-rate.conf');
        } catch (err) {
            log(`  WARN: pipewire conf: ${err.message}`);
        }
    }
}

// kded6rc — отключаем проблемные модули
{
    const rcPath = path.join(SESSION_CONFIG, 'kded6rc');
    writeFileSync(rcPath, [
        '[General]',
        'CheckInitModules=false',
        '',
        '[Module-kscreen]',
        'autoload=false',
        '',
        '[Module-kded_touchpad]',
        'autoload=false',
        '',
        '[Module-kded_baloo]',
        'autoload=false',
        '',
        '[Module-kded_favicons]',
        'autoload=false',
        '',
        '[Module-kded_proxyscout]',
        'autoload=false',
        '',
    ].join('\n'));
    log('  wrote kded6rc');
}

// ─── Keyring password ──────────────────────────────────────────────────

function ensureKeyringPassword() {
    const dir = path.join(process.env.HOME, '.local', 'share', 'omniscience');
    try { mkdirSync(dir, { recursive: true }); } catch {}
    const secretFile = path.join(dir, '.keyring-secret');

    if (existsSync(secretFile)) {
        try {
            const pw = readFileSync(secretFile, 'utf8').trim();
            if (pw.length > 0) {
                log(`  keyring password: loaded (${pw.length} chars)`);
                return pw;
            }
        } catch {}
    }

    const pw = randomBytes(32).toString('hex');
    try {
        writeFileSync(secretFile, pw, { mode: 0o600 });
        chmodSync(secretFile, 0o600);
        log(`  keyring password: generated (${pw.length} chars, mode 0600)`);
    } catch (err) {
        log(`  WARN: cannot write ${secretFile}: ${err.message}`);
    }
    return pw;
}

const KEYRING_PASSWORD = ensureKeyringPassword();

// ─── resolveBinary ─────────────────────────────────────────────────────

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

// ─── Убийство stale-процессов от предыдущей сессии ─────────────────────
//
// На случай если предыдущая сессия не смогла корректно всё завершить.

async function killStale(name) {
    const r = spawnSync('pgrep', ['-u', process.env.USER ?? '', '-x', name], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
    });
    const pids = (r.stdout ?? '').trim().split('\n').filter(Boolean)
        .map(s => parseInt(s, 10)).filter(Number.isFinite);
    let killed = 0;
    for (const pid of pids) {
        try {
            const env = readFileSync(`/proc/${pid}/environ`, 'utf8');
            const m = env.match(/\0DISPLAY=([^\0]+)/);
            if (m && m[1] === process.env.DISPLAY) {
                process.kill(pid, 'SIGTERM');
                killed++;
            }
        } catch {}
    }
    if (killed > 0) {
        log(`  killed ${killed} stale ${name}`);
        await new Promise(r => setTimeout(r, 300));
    }
}

// ─── Всё запущенное — в одном месте ────────────────────────────────────

const children = [];

function startService(label, candidates, args = []) {
    const bin = resolveBinary(candidates);
    if (!bin) {
        log(`  WARN: ${label} не найден (искали: ${candidates.join(', ')})`);
        return null;
    }
    try {
        const child = spawn(bin, args, { stdio: 'inherit', env: process.env });
        child.on('error', err => log(`  ${label} spawn error: ${err.message}`));
        child.on('exit', (code, sig) => log(`  ${label} exited code=${code} sig=${sig}`));
        children.push(child);
        log(`  started ${label} → ${bin} (pid=${child.pid})`);
        return child;
    } catch (err) {
        log(`  ${label} spawn error: ${err.message}`);
        return null;
    }
}

// ─── 1. Keyring ────────────────────────────────────────────────────────

log('starting gnome-keyring');
{
    const bin = resolveBinary(['gnome-keyring-daemon']);
    if (bin) {
        // Указываем демону keyring на сокет D-Bus внутри XDG_RUNTIME_DIR
        const dbusAddress = `unix:path=${process.env.XDG_RUNTIME_DIR}/bus`;
        const child = spawn(bin, ['--unlock', '--replace', '--components=secrets'], {
            stdio: ['pipe', 'pipe', 'inherit'],
            env: { ...process.env, DBUS_SESSION_BUS_ADDRESS: dbusAddress },
        });
        try {
            child.stdin.write(KEYRING_PASSWORD + '\n');
            child.stdin.end();
        } catch {}
        child.on('error', err => log(`  keyring spawn error: ${err.message}`));
        child.on('exit', (code, sig) => log(`  gnome-keyring exited code=${code} sig=${sig}`));
        children.push(child);
        log(`  started gnome-keyring-daemon (pid=${child.pid})`);
    } else {
        log('  WARN: gnome-keyring-daemon не найден');
    }
}

// ─── 2. PipeWire ───────────────────────────────────────────────────────

log('starting PipeWire stack');
await killStale('pipewire');
await killStale('wireplumber');
await killStale('pipewire-pulse');

if (startService('pipewire', ['pipewire'])) await new Promise(r => setTimeout(r, 500));
if (startService('wireplumber', ['wireplumber'])) await new Promise(r => setTimeout(r, 300));
if (startService('pipewire-pulse', ['pipewire-pulse'])) await new Promise(r => setTimeout(r, 200));

// ─── 3. KWin ───────────────────────────────────────────────────────────

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

log('launching kwin_x11 --replace');
await killStale('kwin_x11');

const kwin = spawn('kwin_x11', ['--replace'], { stdio: 'inherit' });
kwin.on('error', err => log(`kwin spawn error: ${err.message}`));
kwin.on('exit', (code, sig) => log(`kwin exited code=${code} sig=${sig}`));
children.push(kwin);

if (!await waitForWM()) {
    log('FATAL: KWin did not register as WM within 15s');
    try { kwin.kill('SIGTERM'); } catch {}
    process.exit(1);
}
log('KWin registered as WM');

// ─── 4. Раскладка ──────────────────────────────────────────────────────

{
    const rcPath = path.join(SESSION_CONFIG, 'kxkbrc');
    let layout = 'us', model = 'pc105', options = '', variant = '';
    if (existsSync(rcPath)) {
        try {
            const txt = readFileSync(rcPath, 'utf8');
            const get = (k) => {
                const m = txt.match(new RegExp(`^${k}\\s*=\\s*(.*)$`, 'm'));
                return m ? m[1].trim() : '';
            };
            layout  = get('LayoutList') || layout;
            model   = get('Model') || model;
            options = get('Options') || '';
            variant = get('VariantList') || '';
        } catch {}
    }
    const args = ['-layout', layout, '-model', model];
    if (variant) args.push('-variant', variant);
    if (options) args.push('-option', options);
    log(`applying keyboard: setxkbmap ${args.join(' ')}`);
    spawnSync('setxkbmap', args, { stdio: 'inherit' });
}

// ─── 5. KDE-сервисы ────────────────────────────────────────────────────

log('starting KDE services');
await killStale('kded6');
await killStale('krunner');
await killStale('kaccess');

startService('kded6', ['kded6', 'kded5', 'kded']);
startService('krunner', ['krunner', 'krunner6']);
startService('kaccess', ['kaccess']);

// ─── 6. Polkit agent ───────────────────────────────────────────────────

log('starting polkit agent');
startService('polkit agent', [
    'lxpolkit', 'lxqt-policykit', 'mini-polkit',
    'polkit-gnome-authentication-agent-1', 'mate-polkit',
]);

// ─── 7. IME ────────────────────────────────────────────────────────────

log('starting fcitx5');
await killStale('fcitx5');
startService('fcitx5', ['fcitx5'], ['-d']);

// ─── 8. Display-сервисы ────────────────────────────────────────────────

log('starting display services');
startService('xiccd', ['xiccd']);
startService('iio-sensor-proxy', ['iio-sensor-proxy']);
// gammastep: раскомментируй если хочешь ночной режим
// startService('gammastep', ['gammastep'], ['-m', 'randr', '-O', '6500']);

// ─── 9. XDG autostart ──────────────────────────────────────────────────

log('running XDG autostart via dex');
{
    const bin = resolveBinary(['dex']);
    if (bin) {
        const child = spawn(bin, ['--autostart'], { stdio: 'inherit', env: process.env });
        child.on('error', err => log(`  dex spawn error: ${err.message}`));
        child.on('exit', code => log(`  dex exited code=${code}`));
        log(`  dex запущен (pid=${child.pid})`);
    } else {
        log('  WARN: dex не найден');
    }
}

// ─── 10. EasyEffects ───────────────────────────────────────────────────

log('starting easyeffects --service-mode');
startService('easyeffects', ['easyeffects'], ['--service-mode']);

// ─── 11. Electron ──────────────────────────────────────────────────────

log('launching electron');

const electronDataDir = path.join(RUNTIME, 'omniscience-electron');
try { mkdirSync(electronDataDir, { recursive: true }); } catch {}

const electronArgs = [
    '.',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu-sandbox',
    `--user-data-dir=${electronDataDir}`,
    '--disable-dev-shm-usage',
    '--enable-logging=stderr',
    '--v=0',
];

const electron = spawn(electronPath, electronArgs, {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
    env: process.env,
});
electron.on('error', err => log(`electron spawn error: ${err.message}`));
electron.on('exit', (code, sig) => log(`electron exited code=${code} sig=${sig}`));
children.push(electron);

// ─── Завершение ────────────────────────────────────────────────────────

let shuttingDown = false;
function shutdown(reason, code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`shutting down: ${reason}`);

    for (const c of children) { try { c.kill('SIGTERM'); } catch {} }

    setTimeout(() => {
        for (const c of children) { try { c.kill('SIGKILL'); } catch {} }
        try { if (logSocket && !logSocket.destroyed) logSocket.end(); } catch {}
        process.exit(code);
    }, 1500).unref();
}

electron.on('exit', (code, sig) => shutdown(`electron exited code=${code} sig=${sig}`, code ?? 0));
kwin.on('exit',     (code, sig) => shutdown(`kwin exited code=${code} sig=${sig}`, code ?? 0));

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP',  () => shutdown('SIGHUP'));