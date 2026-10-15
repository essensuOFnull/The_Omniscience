#!/usr/bin/env node
// session/launch.mjs
//
// Фаза A (launcher):
//   1. Определяет VT.
//   2. Создаёт постоянного псевдо-пользователя omni_<user>_tty<N>.
//   3. Прописывает sudoers NOPASSWD для него.
//   4. Монтирует bindfs: /home/<user> → /home/<pseudo> (псевдо видит всё как своё).
//   5. Запускает сессию под псевдо через `sudo setpriv`, давая ему ambient
//      capabilities: полный доступ к файлам, но без CAP_SYS_ADMIN.
//
// Фаза B (session user, с caps):
//   1. dbus-run-session — изолированный bus.
//   2. Unix-сокет для логов.
//   3. xinit → session.mjs.

import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import {
    openSync, writeSync, closeSync, chmodSync,
    readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT_SRC = path.resolve(__dirname, '..');

const LAUNCHER_USER = process.env.SUDO_USER || process.env.USER || process.env.LOGNAME;
const LAUNCHER_HOME = process.env.HOME;
if (!LAUNCHER_USER || !LAUNCHER_HOME) {
    console.error('[launch] HOME или USER не выставились.');
    process.exit(1);
}

// Список capabilities, которые мы хотим выдать сессии.
const CAPABILITY_LIST = [
    'dac_override',       // игнорировать права на чтение/запись/exec
    'dac_read_search',    // игнорировать права на чтение и вход в директории
    'fowner',             // chmod/chown любых файлов, utime, xattr
    'chown',              // chown на любой uid/gid
    'setfcap',            // установка file capabilities
    'setuid',             // смена uid (нужно многим утилитам)
    'setgid',             // смена gid
    'kill',               // убийство любых процессов
    'mknod',              // создание device-node'ов
];

if (process.env.OMNISCIENCE_AS_SESSION_USER === '1') {
    await sessionUserMain();
} else {
    await launcherUserMain();
}

function log(s) { process.stdout.write(`[launch] ${s}\n`); }

// ─── Автодетект формата capabilities для setpriv ────────────────────────
//
// Разные версии util-linux принимают разный синтаксис, а главное — при
// смене uid ядро сбрасывает caps, если не указан --keep-caps. Поэтому
// пробуем варианты с --keep-caps и --securebits=+keep_caps.
//
// Проба проверяет не только код возврата, но и что ambient-capabilities
// реально установлены (читаем /proc/self/status, поле CapAmb).

function detectCapabilityArgs(uid, gid, capList) {
    const capNamesWithPlus = capList.map(n => '+' + n).join(',');
    const capNamesJustList = capList.join(',');

    // Каждый вариант — функция, возвращающая массив args для setpriv
    // (без --reuid/--regid/--init-groups, они добавляются отдельно).
    const variants = [
        // 1: keep-caps + плюс у каждого
        () => [
            '--keep-caps',
            `--inh-caps=${capList.map(n => '+' + n).join(',')}`,
            `--ambient-caps=${capList.map(n => '+' + n).join(',')}`,
        ],
        // 2: keep-caps + один плюс
        () => [
            '--keep-caps',
            `--inh-caps=+${capNamesJustList}`,
            `--ambient-caps=+${capNamesJustList}`,
        ],
        // 3: keep-caps + два аргумента (пробел)
        () => [
            '--keep-caps',
            '--inh-caps', capNamesWithPlus,
            '--ambient-caps', capNamesWithPlus,
        ],
        // 4: securebits + плюс у каждого
        () => [
            '--securebits=+keep_caps',
            `--inh-caps=${capList.map(n => '+' + n).join(',')}`,
            `--ambient-caps=${capList.map(n => '+' + n).join(',')}`,
        ],
        // 5: securebits + один плюс
        () => [
            '--securebits=+keep_caps',
            `--inh-caps=+${capNamesJustList}`,
            `--ambient-caps=+${capNamesJustList}`,
        ],
        // 6: keep-caps + повторяющиеся опции
        () => {
            const out = ['--keep-caps'];
            for (const n of capList) out.push('--inh-caps', '+' + n);
            for (const n of capList) out.push('--ambient-caps', '+' + n);
            return out;
        },
        // 7: fallback — без keep-caps (вдруг на этой сборке работает)
        () => [
            `--inh-caps=${capList.map(n => '+' + n).join(',')}`,
            `--ambient-caps=${capList.map(n => '+' + n).join(',')}`,
        ],
        // 8: uppercase + keep-caps
        () => [
            '--keep-caps',
            `--inh-caps=${capList.map(n => '+' + n.toUpperCase()).join(',')}`,
            `--ambient-caps=${capList.map(n => '+' + n.toUpperCase()).join(',')}`,
        ],
    ];

    // Одна проба на всю каплю быстрее. dac_override точно есть везде.
    const probe = ['dac_override'];

    for (let i = 0; i < variants.length; i++) {
        const probeArgs = variants[i]();
        // Пересобираем probe на одном имени, чтобы не тащить весь список.
        // (варианты параметризованы через capList — сделаем локальную подмену)
        const singleCapArgs = (() => {
            // Хак: подменяем в каждом args строке весь список на probe.
            // Проще: пересобрать ту же структуру с probe.
            // Для этого вызываем ту же функцию, но передаём probe вместо capList.
            return variants[i].toString(); // не используем, см. ниже
        })();

        // Проще: ручная сборка для probe, аналогичная структуре варианта.
        // Соберём через отдельный мини-детектор:
        let singleArgs;
        try {
            singleArgs = buildProbeArgs(i, probe);
        } catch {
            continue;
        }

        const r = spawnSync('sudo', [
            'setpriv',
            `--reuid=${uid}`,
            `--regid=${gid}`,
            '--init-groups',
            ...singleArgs,
            '--',
            'sh', '-c', 'cat /proc/self/status',
        ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

        if (r.status !== 0) continue;

        const m = (r.stdout ?? '').match(/CapAmb:\s*([0-9a-fA-F]+)/);
        const amb = m ? parseInt(m[1], 16) : 0;

        if (amb !== 0) {
            const letter = String.fromCharCode(65 + i);
            log(`capability format: ${letter} (ambient applied, CapAmb=0x${amb.toString(16)})`);
            // Возвращаем тот же вариант, но для полного capList.
            return rebuildFullArgs(i, capList);
        }
    }

    log('WARN: ни один формат capabilities не подошёл');
    log('WARN: сессия запустится без capabilities');
    return [];
}

// Точечные билдеры: одно имя (probe) и полный список (capList).
// Избегаем замыканий — прямо разворачиваем логику.
function buildProbeArgs(index, names) {
    const plus = names.map(n => '+' + n).join(',');
    const just = names.join(',');
    switch (index) {
        case 0: return ['--keep-caps', `--inh-caps=${plus}`, `--ambient-caps=${plus}`];
        case 1: return ['--keep-caps', `--inh-caps=+${just}`, `--ambient-caps=+${just}`];
        case 2: return ['--keep-caps', '--inh-caps', plus, '--ambient-caps', plus];
        case 3: return ['--securebits=+keep_caps', `--inh-caps=${plus}`, `--ambient-caps=${plus}`];
        case 4: return ['--securebits=+keep_caps', `--inh-caps=+${just}`, `--ambient-caps=+${just}`];
        case 5: {
            const out = ['--keep-caps'];
            for (const n of names) out.push('--inh-caps', '+' + n);
            for (const n of names) out.push('--ambient-caps', '+' + n);
            return out;
        }
        case 6: return [`--inh-caps=${plus}`, `--ambient-caps=${plus}`];
        case 7: return ['--keep-caps', `--inh-caps=${names.map(n => '+' + n.toUpperCase()).join(',')}`, `--ambient-caps=${names.map(n => '+' + n.toUpperCase()).join(',')}`];
        default: throw new Error('bad index');
    }
}

function rebuildFullArgs(index, capList) {
    return buildProbeArgs(index, capList);
}

// ═══════════════════════════════════════════════════════════════════════════
// ФАЗА A — launcher
// ═══════════════════════════════════════════════════════════════════════════

async function launcherUserMain() {
    if (process.env.DISPLAY) {
        console.error('[launch] DISPLAY уже выставлен — вы внутри X. Выйдите в чистую TTY.');
        process.exit(1);
    }

    function currentVT() {
        if (process.env.OMNISCIENCE_VT) {
            const n = parseInt(process.env.OMNISCIENCE_VT, 10);
            if (Number.isFinite(n) && n > 0) return n;
        }
        try {
            const s = readFileSync('/sys/class/tty/tty0/active', 'utf8').trim();
            const n = parseInt(s.replace(/\D/g, ''), 10);
            if (Number.isFinite(n) && n > 0) return n;
        } catch { }
        const r = spawnSync('fgconsole', { encoding: 'utf8' });
        const n = parseInt((r.stdout ?? '').trim(), 10);
        return Number.isFinite(n) && n > 0 ? n : null;
    }

    const VT_NUM = currentVT();
    if (!VT_NUM) { console.error('[launch] не удалось определить VT'); process.exit(1); }

    const safeLauncher = LAUNCHER_USER.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20);
    const USER_NAME = `omni_${safeLauncher}_tty${VT_NUM}`;
    const USER_HOME = `/home/${USER_NAME}`;
    // Кандидаты. Каждая система имеет свой набор групп: plugdev есть в Debian,
    // но отсутствует на Arch; power есть не везде; и т.д. useradd -G падает,
    // если хотя бы одной группы нет, поэтому фильтруем по факту.
    const GROUP_CANDIDATES = [
        'video', 'input', 'audio', 'render', 'tty',
        'disk', 'storage', 'power', 'network',
        'lp', 'scanner', 'dialout', 'cdrom', 'floppy',
        'kvm', 'games', 'bluetooth', 'plugdev',
    ];

    function existingGroups() {
        const set = new Set();
        try {
            const txt = readFileSync('/etc/group', 'utf8');
            for (const line of txt.split('\n')) {
                const name = line.split(':', 1)[0];
                if (name) set.add(name);
            }
        } catch { }
        return set;
    }

    const present = existingGroups();
    const EXTRA_GROUPS = GROUP_CANDIDATES.filter(g => present.has(g)).join(',');
    log(`группы для ${USER_NAME}: ${EXTRA_GROUPS || '(нет)'}`);

    log(`VT=${VT_NUM}`);
    log(`user=${USER_NAME}`);
    log(`bindfs ${LAUNCHER_HOME} → ${USER_HOME}`);

    function sudo(args, opts = {}) {
        return spawnSync('sudo', args, { stdio: 'inherit', ...opts });
    }

    // ─── Псевдо-пользователь ───
    const userExists = spawnSync('id', ['-u', USER_NAME], { stdio: 'ignore' }).status === 0;
    if (!userExists) {
        log(`creating user ${USER_NAME}`);
        const useraddArgs = ['useradd', '-m', '-s', '/bin/bash'];
        if (EXTRA_GROUPS) useraddArgs.push('-G', EXTRA_GROUPS);
        useraddArgs.push(USER_NAME);

        const r = sudo(useraddArgs);
        if (r.status !== 0) {
            console.error('[launch] FATAL: useradd failed');
            process.exit(1);
        }
        if (r.status !== 0) {
            console.error('[launch] FATAL: useradd failed');
            process.exit(1);
        }
    }

    const uid = parseInt(spawnSync('id', ['-u', USER_NAME], { encoding: 'utf8' }).stdout.trim(), 10);
    const gid = parseInt(spawnSync('id', ['-g', USER_NAME], { encoding: 'utf8' }).stdout.trim(), 10);
    if (!Number.isFinite(uid) || !Number.isFinite(gid)) {
        console.error('[launch] FATAL: не удалось получить uid/gid пользователя');
        process.exit(1);
    }

    // ─── sudoers NOPASSWD ───
    const sudoersPath = `/etc/sudoers.d/omniscience-${USER_NAME}`;
    if (!existsSync(sudoersPath)) {
        log(`installing sudoers (${sudoersPath})`);
        const content =
            `# Managed by Omniscience\n` +
            `${USER_NAME} ALL=(ALL) NOPASSWD: ALL\n`;
        const tmp = path.join(tmpdir(), `omniscience-sudoers.${process.pid}`);
        writeFileSync(tmp, content, { mode: 0o440 });
        const r = sudo([
            'install', '-m', '0440', '-o', 'root', '-g', 'root',
            tmp, sudoersPath,
        ]);
        try { unlinkSync(tmp); } catch { }
        if (r.status !== 0) {
            log('WARN: sudoers install failed');
        } else {
            const check = spawnSync('sudo', ['visudo', '-cf', sudoersPath], { stdio: 'ignore' });
            if (check.status !== 0) {
                console.error('[launch] sudoers invalid, removing');
                sudo(['rm', '-f', sudoersPath]);
            }
        }
    }

    // ─── XDG_RUNTIME_DIR для псевдо ───
    // Без PAM systemd-logind не создаёт /run/user/<uid>, делаем сами.
    const runtimeDir = `/run/user/${uid}`;
    if (!existsSync(runtimeDir)) {
        sudo(['mkdir', '-p', runtimeDir]);
        sudo(['chown', `${uid}:${gid}`, runtimeDir]);
        sudo(['chmod', '0700', runtimeDir]);
    }

    // ─── bindfs ───
    function isMounted(p) {
        return spawnSync('mountpoint', ['-q', p], { stdio: 'ignore' }).status === 0;
    }

    if (isMounted(USER_HOME)) {
        log(`unmounting stale bindfs at ${USER_HOME}`);
        sudo(['umount', '-l', USER_HOME]);
    }

    mkdirSync(USER_HOME, { recursive: true });
    sudo(['chown', `${uid}:${gid}`, USER_HOME]);

    log(`mounting bindfs`);
    const mountR = sudo([
        'bindfs',
        // Опции со значением — через "=", не через пробел.
        // Иначе bindfs считает значение позиционным аргументом (source).
        `--force-user=${USER_NAME}`,
        `--create-for-user=${LAUNCHER_USER}`,
        `--create-for-group=${LAUNCHER_USER}`,
        '--create-with-perms=u=rwX,g=rX,o=',
        // -o allow_other — отдельно, через привычный FUSE-стиль.
        '-o', 'allow_other',
        // multithreaded — тоже часть -o в новых bindfs.
        '-o', 'multithreaded',
        // Позиционные аргументы — в конце.
        LAUNCHER_HOME,
        USER_HOME,
    ]);
    if (mountR.status !== 0) {
        console.error('[launch] FATAL: bindfs mount failed');
        process.exit(1);
    }

    // ─── Запуск сессии с caps ───
    log(`launching session as ${USER_NAME} with capabilities`);

    // ─── Детект подходящего синтаксиса capabilities ───
    const capArgs = detectCapabilityArgs(uid, gid, CAPABILITY_LIST);
    if (capArgs.length === 0) {
        log('WARN: capabilities отключены, псевдо-пользователь будет без них');
    }

    log(`launching session as ${USER_NAME}`);

    const child = spawn('sudo', [
        'setpriv',
        `--reuid=${uid}`,
        `--regid=${gid}`,
        '--init-groups',
        ...capArgs,
        '--',
        'env',
        'OMNISCIENCE_AS_SESSION_USER=1',
        `OMNISCIENCE_VT=${VT_NUM}`,
        `OMNISCIENCE_USER=${USER_NAME}`,
        `OMNISCIENCE_PROJECT_ROOT=${path.join(USER_HOME, path.basename(PROJECT_ROOT_SRC))}`,
        `OMNISCIENCE_LAUNCHER_HOME=${LAUNCHER_HOME}`,
        `OMNISCIENCE_LAUNCHER_USER=${LAUNCHER_USER}`,
        `HOME=${USER_HOME}`,
        `USER=${USER_NAME}`,
        `LOGNAME=${USER_NAME}`,
        `XDG_RUNTIME_DIR=${runtimeDir}`,
        process.execPath,
        __filename,
    ], {
        stdio: 'inherit',
        env: { ...process.env, XDG_RUNTIME_DIR: runtimeDir },
    });

    child.on('exit', code => {
        if (isMounted(USER_HOME)) {
            log(`unmounting bindfs`);
            const r = sudo(['umount', USER_HOME]);
            if (r.status !== 0) sudo(['umount', '-l', USER_HOME]);
        }
        process.exit(code ?? 0);
    });

    process.on('SIGINT', () => child.kill('SIGINT'));
    process.on('SIGTERM', () => child.kill('SIGTERM'));
    process.on('SIGHUP', () => child.kill('SIGHUP'));
}

// ═══════════════════════════════════════════════════════════════════════════
// ФАЗА B — session user
// ═══════════════════════════════════════════════════════════════════════════

async function sessionUserMain() {
    const PROJECT_ROOT = process.env.OMNISCIENCE_PROJECT_ROOT;

    // ─── Изолированный D-Bus ───
    if (process.env.OMNISCIENCE_DBUS !== '1') {
        const child = spawn(
            'dbus-run-session',
            ['--', process.execPath, __filename, ...process.argv.slice(2)],
            { stdio: 'inherit', env: { ...process.env, OMNISCIENCE_DBUS: '1' } }
        );
        child.on('exit', code => process.exit(code ?? 0));
        return;
    }

    // ─── TTY и сокет ───
    let ttyFd = -1;
    try { ttyFd = openSync('/dev/tty', 'w'); } catch { }

    const RUNTIME = process.env.XDG_RUNTIME_DIR ?? `/run/user/${process.getuid()}`;
    mkdirSync(RUNTIME, { recursive: true });
    const SOCKET_PATH = path.join(RUNTIME, 'omniscience-log.sock');
    try { unlinkSync(SOCKET_PATH); } catch { }

    const buffer = [];
    const clients = new Set();
    const MAX = 1024 * 1024;
    let bufferBytes = 0;

    function broadcast(chunk) {
        if (ttyFd >= 0) { try { writeSync(ttyFd, chunk); } catch { } }
        buffer.push(chunk);
        bufferBytes += Buffer.byteLength(chunk, 'utf8');
        while (bufferBytes > MAX && buffer.length > 1) {
            bufferBytes -= Buffer.byteLength(buffer.shift(), 'utf8');
        }
        for (const s of clients) {
            if (!s.destroyed) { try { s.write(chunk); } catch { } }
        }
    }

    const server = createServer(sock => {
        for (const chunk of buffer) { try { sock.write(chunk); } catch { } }
        clients.add(sock);
        sock.on('close', () => clients.delete(sock));
        sock.on('error', () => clients.delete(sock));
    });

    await new Promise(res => server.listen(SOCKET_PATH, res));
    try { chmodSync(SOCKET_PATH, 0o600); } catch { }

    process.env.OMNISCIENCE_LOG_SOCKET = SOCKET_PATH;

    broadcast(`\n[launch] session user: ${process.env.USER} (uid=${process.getuid()})\n`);
    broadcast(`[launch] HOME=${process.env.HOME}\n`);
    broadcast(`[launch] DBUS=${process.env.DBUS_SESSION_BUS_ADDRESS}\n`);
    broadcast(`[launch] log socket: ${SOCKET_PATH}\n`);
    broadcast(`[launch] project root: ${PROJECT_ROOT}\n\n`);

    // ─── Xwrapper ───
    const XWRAP = '/etc/X11/Xwrapper.config';
    try {
        const cur = readFileSync(XWRAP, 'utf8');
        if (!cur.includes('needs_root_rights=yes')) throw 0;
    } catch {
        const tmp = path.join(tmpdir(), `Xwrapper.${process.pid}`);
        writeFileSync(tmp,
            '# Managed by The Omniscience\nallowed_users=anybody\nneeds_root_rights=yes\n',
            { mode: 0o644 });
        spawnSync('sudo',
            ['install', '-m', '0644', '-o', 'root', '-g', 'root', tmp, XWRAP],
            { stdio: 'inherit' });
        try { unlinkSync(tmp); } catch { }
    }

    // ─── Свободный display ───
    function findFreeDisplay() {
        for (let n = 0; n < 10; n++) {
            const lock = `/tmp/.X${n}-lock`;
            const sock = `/tmp/.X11-unix/X${n}`;
            if (!existsSync(lock) && !existsSync(sock)) return n;
            if (existsSync(lock)) {
                try {
                    const pid = parseInt(readFileSync(lock, 'utf8').trim(), 10);
                    try { process.kill(pid, 0); } catch (e) {
                        if (e.code !== 'EPERM') {
                            try { unlinkSync(lock); } catch { }
                            try { unlinkSync(sock); } catch { }
                            return n;
                        }
                    }
                } catch { }
            }
        }
        throw new Error('нет свободного display');
    }

    const DISPLAY_SPEC = `:${findFreeDisplay()}`;
    broadcast(`[launch] xinit → ${DISPLAY_SPEC} on vt${process.env.OMNISCIENCE_VT}\n\n`);

    // Используем PROJECT_ROOT — путь через bindfs, он доступен псевдо-пользователю
    // даже без capabilities. /home/user/... напрямую — недоступен (0700).
    const SESSION_MJS = path.join(PROJECT_ROOT, 'session', 'session.mjs');

    broadcast(`[launch] project root: ${PROJECT_ROOT}\n`);
    broadcast(`[launch] session.mjs path: ${SESSION_MJS}\n`);
    broadcast(`[launch] session.mjs exists: ${existsSync(SESSION_MJS)}\n`);
    broadcast(`[launch] node path: ${process.execPath}\n`);
    broadcast(`[launch] node exists: ${existsSync(process.execPath)}\n\n`);

    const xinit = spawn('xinit', [
        process.execPath, SESSION_MJS,
        '--',
        DISPLAY_SPEC,
        `vt${process.env.OMNISCIENCE_VT}`,
        '-keeptty',
    ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: PROJECT_ROOT,
        env: process.env,
    });

    xinit.stdout.on('data', d => broadcast(d.toString('utf8')));
    xinit.stderr.on('data', d => broadcast(d.toString('utf8')));
    xinit.on('error', err => broadcast(`\n[launch] xinit error: ${err.message}\n`));

    let shuttingDown = false;
    function shutdown(reason, code = 0) {
        if (shuttingDown) return;
        shuttingDown = true;
        broadcast(`\n[launch] shutting down: ${reason}\n`);
        try { server.close(); } catch { }
        try { unlinkSync(SOCKET_PATH); } catch { }
        try { xinit.kill('SIGTERM'); } catch { }
        setTimeout(() => { try { xinit.kill('SIGKILL'); } catch { } }, 1500).unref();
        setTimeout(() => {
            try { if (ttyFd >= 0) closeSync(ttyFd); } catch { }
            process.exit(code);
        }, 300).unref();
    }

    xinit.on('exit', (code, sig) => shutdown(`xinit exited code=${code} sig=${sig}`, code ?? 0));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));
}