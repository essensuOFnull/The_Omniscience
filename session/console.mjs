#!/usr/bin/env node
// Крутится ВНУТРИ pty. Запускает KDE-сервисы и живёт, пока жив pty.
//
// Здесь нет ни одной строки логики парсинга или условий: только список
// команд, которые нужно выполнить, и вечное ожидание. Сигналы от pty
// (SIGHUP при закрытии окна) корректно завершают всех детей.

import { spawn } from 'node:child_process';

// ─── Список сервисов ────────────────────────────────────────────────────────
// Каждая запись — «одна команда с уже посчитанными аргументами».
// stdio: 'inherit' означает: stdout/stderr сервиса идут в pty → в xterm.js.
const SERVICES = [
    { cmd: 'kded6',              args: [] },
    { cmd: 'kglobalacceld',      args: [] },
    { cmd: 'ksmserver',          args: ['--no-lockscreen'] },
    { cmd: 'polkit-kde-agent-1', args: [] },
    { cmd: 'easyeffects',        args: ['--service-mode'] },
];

const children = [];

function log(line) {
    // \r\n чтобы xterm.js корректно перевёл строку.
    process.stdout.write(`[console] ${line}\r\n`);
}

for (const { cmd, args } of SERVICES) {
    try {
        const child = spawn(cmd, args, { stdio: 'inherit' });
        child.on('error', err => log(`failed to spawn ${cmd}: ${err.message}`));
        child.on('exit', (code, signal) => log(`${cmd} exited: code=${code} signal=${signal}`));
        children.push(child);
        log(`started ${cmd}`);
    } catch (err) {
        log(`spawn error for ${cmd}: ${err.message}`);
    }
}

// ─── Cleanup при получении сигнала ──────────────────────────────────────────
// Когда Electron закрывает окно, он убивает pty. Child (этот процесс)
// получает SIGHUP. Мы аккуратно гасим сервисы и выходим.
let cleaning = false;
function cleanup(sig) {
    if (cleaning) return;
    cleaning = true;
    log(`received ${sig}, shutting down services`);
    for (const child of children) {
        if (!child.killed) {
            try { child.kill('SIGTERM'); } catch {}
        }
    }
    // Дать детям 800 мс на корректный выход, потом — SIGKILL.
    setTimeout(() => {
        for (const child of children) {
            try { child.kill('SIGKILL'); } catch {}
        }
        process.exit(0);
    }, 800);
}

process.on('SIGTERM', () => cleanup('SIGTERM'));
process.on('SIGHUP',  () => cleanup('SIGHUP'));
process.on('SIGINT',  () => cleanup('SIGINT'));

// ─── Вечное ожидание ────────────────────────────────────────────────────────
// Ничего не делаем, просто держим pty открытым. Всё, что должно произойти,
// произойдёт по сигналам или само по себе.
await new Promise(() => {});