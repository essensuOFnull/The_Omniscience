// session/log-client.mjs
//
// Клиент лог-хаба из launch.mjs. Используется в Electron main.
// Подключается к Unix-socket'у, читает накопленный буфер + живой поток,
// и отдаёт через callback.

import { connect } from 'node:net';

export function connectLogSocket(onData, opts = {}) {
    const {
        socketPath = process.env.OMNISCIENCE_LOG_SOCKET,
        retries = 20,
        retryDelayMs = 100,
    } = opts;

    if (!socketPath) {
        console.warn('[log-client] OMNISCIENCE_LOG_SOCKET не задан');
        return () => {};
    }

    let socket = null;
    let attempts = 0;
    let closed = false;

    function tryConnect() {
        if (closed) return;
        attempts++;
        socket = connect(socketPath);

        socket.on('data', chunk => {
            try { onData(chunk.toString('utf8')); }
            catch (err) { console.error('[log-client] onData error:', err); }
        });

        socket.on('error', err => {
            if (closed) return;
            if (attempts < retries) {
                setTimeout(tryConnect, retryDelayMs);
            } else {
                console.error(`[log-client] не удалось подключиться к ${socketPath}: ${err.message}`);
            }
        });

        socket.on('close', () => { closed = true; });
    }

    tryConnect();

    return function disconnect() {
        closed = true;
        try { socket?.destroy(); } catch {}
    };
}