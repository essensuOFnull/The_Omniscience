#!/usr/bin/env node
// session/launch.mjs
//
// Точка входа сессии. Запускается через `npm start` из чистой TTY.
//
// Роль:
//   1. Обернуться в dbus-run-session (изолированный session bus).
//   2. Определить текущий VT.
//   3. Открыть /dev/tty для дублирования логов.
//   4. Поднять Unix-socket для стрима (к нему подключится Electron).
//   5. Xwrapper.config — разрешить Xorg запуск от обычного пользователя.
//   6. xinit → session.mjs на том же VT.
//   7. Tee: stdout/stderr xinit → /dev/tty + socket.

import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import {
    openSync, writeSync, closeSync, chmodSync,
    readFileSync, writeFileSync, unlinkSync, existsSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Проверки окружения ─────────────────────────────────────────────────

if (process.env.DISPLAY) {
    console.error('[launch] DISPLAY уже выставлен. Запустите из чистой TTY (Ctrl+Alt+F2..F6).');
    process.exit(1);
}
if (!process.env.HOME) {
    console.error('[launch] HOME не выставлен.');
    process.exit(1);
}

// ─── SESSION_ROOT (для изоляции конфигов/логов) ────────────────────────

const SESSION_ROOT = process.env.SESSION_ROOT
    ?? path.join(process.env.HOME, '.local', 'share', 'omniscience');
process.env.SESSION_ROOT = SESSION_ROOT;

// ─── D-Bus: изолированный session bus ──────────────────────────────────

if (!process.env.OMNISCIENCE_DBUS) {
    process.stderr.write('[launch] spawning inside dbus-run-session\n');
    const child = spawn('dbus-run-session', [
        '--', process.execPath, __filename, ...process.argv.slice(2),
    ], {
        stdio: 'inherit',
        env: { ...process.env, OMNISCIENCE_DBUS: '1' },
    });
    child.on('error', err => {
        process.stderr.write(`[launch] dbus-run-session spawn error: ${err.message}\n`);
        process.exit(1);
    });
    child.on('exit', code => process.exit(code ?? 0));
    await new Promise(() => {});
}

// ─── Locale ────────────────────────────────────────────────────────────

if (!/utf-?8/i.test(process.env.LANG ?? '')) {
    const r = spawnSync('locale', ['-a'], { encoding: 'utf8' });
    const available = new Set((r.stdout ?? '').split('\n').map(s => s.trim()));
    for (const cand of ['C.UTF-8', 'en_US.UTF-8', 'en_US.utf8', 'ru_RU.UTF-8', 'ru_RU.utf8']) {
        if (available.has(cand)) {
            process.env.LANG = cand;
            process.env.LC_ALL = cand;
            break;
        }
    }
}

// ─── Текущий VT ────────────────────────────────────────────────────────

function currentVT() {
    if (process.env.OMNISCIENCE_VT) {
        const n = parseInt(process.env.OMNISCIENCE_VT, 10);
        if (Number.isFinite(n) && n > 0) return n;
    }
    try {
        const s = readFileSync('/sys/class/tty/tty0/active', 'utf8').trim();
        const n = parseInt(s.replace(/\D/g, ''), 10);
        if (Number.isFinite(n) && n > 0) return n;
    } catch {}
    const r = spawnSync('fgconsole', { encoding: 'utf8' });
    const n = parseInt((r.stdout ?? '').trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
}

const VT_NUM = currentVT();
if (!VT_NUM) {
    console.error('[launch] не удалось определить VT.');
    process.exit(1);
}

// ─── Прямой канал в TTY ────────────────────────────────────────────────

let ttyFd = -1;
try {
    ttyFd = openSync('/dev/tty', 'w');
} catch (err) {
    console.error(`[launch] не удалось открыть /dev/tty: ${err.message}`);
    process.exit(1);
}

function writeToTTY(s) {
    if (ttyFd < 0) return;
    try { writeSync(ttyFd, s); } catch {}
}

// ─── Лог-хаб: буфер + Unix-socket ──────────────────────────────────────

const SOCKET_PATH = process.env.OMNISCIENCE_LOG_SOCKET
    ?? path.join(process.env.XDG_RUNTIME_DIR ?? '/tmp',
                 `omniscience-log-${process.pid}.sock`);
try { unlinkSync(SOCKET_PATH); } catch {}

const buffer = [];
const clients = new Set();
const MAX = 1024 * 1024;
let bufferBytes = 0;

function broadcast(chunk) {
    writeToTTY(chunk);
    buffer.push(chunk);
    bufferBytes += Buffer.byteLength(chunk, 'utf8');
    while (bufferBytes > MAX && buffer.length > 1) {
        bufferBytes -= Buffer.byteLength(buffer.shift(), 'utf8');
    }
    for (const s of clients) {
        if (!s.destroyed) { try { s.write(chunk); } catch {} }
    }
}

const server = createServer(sock => {
    for (const chunk of buffer) { try { sock.write(chunk); } catch {} }
    clients.add(sock);
    sock.on('close', () => clients.delete(sock));
    sock.on('error', () => clients.delete(sock));
});

await new Promise(res => server.listen(SOCKET_PATH, res));
try { chmodSync(SOCKET_PATH, 0o600); } catch {}

process.env.OMNISCIENCE_LOG_SOCKET = SOCKET_PATH;

broadcast(`\n[launch] Omniscience session starting\n`);
broadcast(`[launch] VT=${VT_NUM} TTY=/dev/tty\n`);
broadcast(`[launch] SESSION_ROOT=${SESSION_ROOT}\n`);
broadcast(`[launch] LANG=${process.env.LANG ?? 'unset'}\n`);
broadcast(`[launch] DBUS=${process.env.DBUS_SESSION_BUS_ADDRESS ?? 'unset'}\n\n`);

// ─── Xwrapper.config ───────────────────────────────────────────────────

function ensureXwrapperConfig() {
    const TARGET = '/etc/X11/Xwrapper.config';
    const CONTENT =
        '# Managed by The Omniscience (session/launch.mjs)\n' +
        'allowed_users=anybody\n' +
        'needs_root_rights=yes\n';

    try {
        const current = readFileSync(TARGET, 'utf8');
        if (current.includes('needs_root_rights=yes') &&
            current.includes('allowed_users=anybody')) {
            broadcast('[launch] Xwrapper.config: ok\n');
            return true;
        }
    } catch {}

    broadcast('[launch] Xwrapper.config: needs fixing\n');

    const tmp = path.join(tmpdir(), `Xwrapper.config.${process.pid}`);
    try { writeFileSync(tmp, CONTENT, { mode: 0o644 }); }
    catch (err) {
        broadcast(`[launch] WARN: cannot write ${tmp}: ${err.message}\n`);
        return false;
    }

    broadcast('[launch] asking sudo for Xwrapper.config\n');
    const r = spawnSync('sudo', [
        'install', '-m', '0644', '-o', 'root', '-g', 'root', tmp, TARGET,
    ], { stdio: 'inherit' });
    try { unlinkSync(tmp); } catch {}

    if (r.status !== 0) {
        broadcast('[launch] WARN: Xwrapper install failed\n');
        return false;
    }
    broadcast('[launch] Xwrapper.config: fixed\n');
    return true;
}

ensureXwrapperConfig();

// ─── Свободный display ─────────────────────────────────────────────────

function isProcessAlive(pid) {
    if (!Number.isFinite(pid) || pid <= 0) return false;
    try { process.kill(pid, 0); return true; }
    catch (e) { return e.code === 'EPERM'; }
}

function findFreeDisplay() {
    for (let n = 0; n < 10; n++) {
        const lock = `/tmp/.X${n}-lock`;
        const sock = `/tmp/.X11-unix/X${n}`;
        if (!existsSync(lock) && !existsSync(sock)) return n;
        if (existsSync(lock)) {
            try {
                const pid = parseInt(readFileSync(lock, 'utf8').trim(), 10);
                if (!isProcessAlive(pid)) {
                    try { unlinkSync(lock); } catch {}
                    try { unlinkSync(sock); } catch {}
                    return n;
                }
            } catch {}
        }
    }
    throw new Error('нет свободного display');
}

const DISPLAY_NUM = findFreeDisplay();
const DISPLAY_SPEC = `:${DISPLAY_NUM}`;
broadcast(`[launch] chosen display: ${DISPLAY_SPEC}, staying on vt${VT_NUM}\n`);
broadcast('[launch] spawning xinit → session.mjs\n\n');

// ─── Xorg через xinit ──────────────────────────────────────────────────

const sessionEntry = path.join(__dirname, 'session.mjs');
const xinit = spawn('xinit', [
    process.execPath, sessionEntry,
    '--',
    DISPLAY_SPEC,
    `vt${VT_NUM}`,
    '-keeptty',
], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
});

xinit.stdout.on('data', d => broadcast(d.toString('utf8')));
xinit.stderr.on('data', d => broadcast(d.toString('utf8')));
xinit.on('error', err => broadcast(`\n[launch] xinit spawn error: ${err.message}\n`));

// ─── Завершение ────────────────────────────────────────────────────────

let shuttingDown = false;
function shutdown(reason, code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    broadcast(`\n[launch] shutting down: ${reason}\n`);

    try { server.close(); } catch {}
    try { unlinkSync(SOCKET_PATH); } catch {}
    try { xinit.kill('SIGTERM'); } catch {}
    setTimeout(() => { try { xinit.kill('SIGKILL'); } catch {} }, 1500).unref();
    setTimeout(() => {
        try { if (ttyFd >= 0) closeSync(ttyFd); } catch {}
        process.exit(code);
    }, 200).unref();
}

xinit.on('exit', (code, sig) => shutdown(`xinit exited code=${code} sig=${sig}`, code ?? 0));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP',  () => shutdown('SIGHUP'));