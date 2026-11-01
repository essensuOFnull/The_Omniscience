import electronPkg from 'electron';
const { ipcMain, webContents, app } = electronPkg;

const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREY = '\x1b[90m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const RESET = '\x1b[0m';

function findViewName(wcId) {
    if (global.views) {
        for (const [id, v] of Object.entries(global.views)) {
            if (v.view?.webContents?.id === wcId) return id;
        }
    }
    if (global.panelRegistry) {
        for (const [id, p] of global.panelRegistry) {
            if (p.view?.webContents?.id === wcId) return `panel:${id}`;
        }
    }
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
        if (global.mainWindow.webContents.id === wcId) return 'shell';
    }
    if (global.topbarWindow && !global.topbarWindow.isDestroyed()) {
        if (global.topbarWindow.webContents.id === wcId) return 'topbar';
    }
    // Check by URL if we can't find by registry
    for (const wc of webContents.getAllWebContents()) {
        if (wc.id === wcId) {
            const url = wc.getURL();
            if (url.startsWith('devtools://')) return 'chromium-devtools';
            break;
        }
    }
}

function shortUrl(url) {
    if (!url) return '';
    try {
        const u = new URL(url);
        if (u.protocol === 'file:') {
            const parts = u.pathname.split('/');
            return parts.slice(-2).join('/') + u.search.slice(0, 40);
        }
        return u.hostname + u.pathname.slice(0, 40);
    } catch (_) { return url.slice(0, 60); }
}

const LEVEL_COLOR = { debug: GREY, info: GREY, warning: YELLOW, error: RED };

const attached = new WeakSet();

function attachWebContents(wc) {
    if (!wc || wc.isDestroyed?.()) return;
    if (attached.has(wc)) return;
    attached.add(wc);

    // 1. Основное: все сообщения консоли из этого webContents
    wc.on('console-message', (details) => {
        const { level, message, sourceId, lineNumber } = details;

        const name = findViewName(wc.id);
        const color = LEVEL_COLOR[level] ?? GREY;
        const file = shortUrl(sourceId);
        const loc = lineNumber ? `:${lineNumber}` : '';

        console.log(`${color}[${name}]${RESET} ${level} ${message} ${GREY}(${file}${loc})${RESET}`);
    });

    // 2. Ошибки в preload — то, что видно только здесь
    wc.on('preload-error', (event, preloadPath, error) => {
        const name = findViewName(wc.id);
        console.log(`${RED}[${name}]${RESET} ${MAGENTA}preload-error${RESET} ${preloadPath}`);
        console.log(`${GREY}${error?.stack || error}${RESET}`);
    });

    // 3. Крах рендер-процесса
    wc.on('render-process-gone', (event, details) => {
        const name = findViewName(wc.id);
        console.log(`${RED}[${name}]${RESET} ${MAGENTA}render-process-gone${RESET} reason=${details.reason} exitCode=${details.exitCode}`);
    });

    // 4. Зависание
    wc.on('unresponsive', () => {
        const name = findViewName(wc.id);
        console.log(`${YELLOW}[${name}]${RESET} unresponsive`);
    });
}

export default function () {
    // Цепляемся ко всем уже существующим
    webContents.getAllWebContents().forEach(attachWebContents);

    // И ко всем новым
    app.on('web-contents-created', (_e, wc) => attachWebContents(wc));

    // Main process errors
    process.on('uncaughtException', (err) => {
        console.error(`${RED}[MAIN UNCAUGHT]${RESET}`, err?.stack || err);
    });
    process.on('unhandledRejection', (reason) => {
        console.error(`${RED}[MAIN REJECTION]${RESET}`, reason);
    });
}