import electronPkg from 'electron';
const { ipcMain } = electronPkg;
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
import { getWindowById, getXidForWindow } from './ipc_windowManager.js';

let activeDrag = null;
let pointerDeviceId = null;

/* ──────────────────────────────────────────────── */
/* X11 helpers                                       */
/* ──────────────────────────────────────────────── */

async function getMousePos() {
    try {
        const { stdout } = await execAsync('xdotool getmouselocation --shell');
        const x = parseInt((stdout.match(/X=(-?\d+)/) || [])[1], 10);
        const y = parseInt((stdout.match(/Y=(-?\d+)/) || [])[1], 10);
        if (Number.isNaN(x) || Number.isNaN(y)) return null;
        return { x, y };
    } catch (_) { return null; }
}

async function moveMouseTo(x, y) {
    try { await execAsync(`xdotool mousemove ${Math.round(x)} ${Math.round(y)}`); }
    catch (_) {}
}

async function findPointerDeviceId() {
    if (pointerDeviceId) return pointerDeviceId;
    try {
        const { stdout } = await execAsync('xinput list --short');
        for (const line of stdout.split('\n')) {
            if (line.includes('pointer') && line.includes('slave')) {
                const m = line.match(/id=(\d+)/);
                if (m) { pointerDeviceId = m[1]; return pointerDeviceId; }
            }
        }
        for (const line of stdout.split('\n')) {
            if (line.includes('pointer')) {
                const m = line.match(/id=(\d+)/);
                if (m) { pointerDeviceId = m[1]; return pointerDeviceId; }
            }
        }
    } catch (e) { console.error('[drag] xinput list failed:', e.message); }
    return null;
}

async function isLeftButtonDown() {
    const id = await findPointerDeviceId();
    if (!id) return null;
    try {
        const { stdout } = await execAsync(`xinput --query-state ${id}`);
        return /button\[1\]\s*=\s*down/.test(stdout);
    } catch (_) { return null; }
}

async function getBoundsX11(id) {
    try {
        const { stdout } = await execAsync(`xdotool getwindowgeometry --shell ${id}`);
        const get = (key) => {
            const m = stdout.match(new RegExp(`^${key}=(-?\\d+)`, 'm'));
            return m ? parseInt(m[1], 10) : 0;
        };
        return { x: get('X'), y: get('Y'), width: get('WIDTH'), height: get('HEIGHT') };
    } catch (_) { return null; }
}

async function applyNativeBounds(id, b, mode) {
    try {
        if (mode === 'move') {
            await execAsync(`xdotool windowmove ${id} ${Math.round(b.x)} ${Math.round(b.y)}`);
        } else {
            await execAsync(`xdotool windowsize ${id} ${Math.round(b.width)} ${Math.round(b.height)}`);
            await execAsync(`xdotool windowmove ${id} ${Math.round(b.x)} ${Math.round(b.y)}`);
        }
    } catch (_) {}
}

function applyOurBounds(win, b) {
    try {
        if (win.isDestroyed()) return;
        win.setBounds({
            x: Math.round(b.x), y: Math.round(b.y),
            width: Math.round(b.width), height: Math.round(b.height),
        }, false);
    } catch (_) {}
}

/* ──────────────────────────────────────────────── */
/* Якорь курсора для разных операций                 */
/* ──────────────────────────────────────────────── */

function computeAnchor(bounds, mode, direction) {
    const { x, y, width, height } = bounds;

    if (mode === 'move') {
        // центр окна
        return {
            x: x + Math.floor(width / 2),
            y: y + Math.floor(height / 2),
        };
    }

    // resize — угол/сторона
    const dir = direction || '';
    let ax = x + Math.floor(width / 2);
    let ay = y + Math.floor(height / 2);

    if (dir.includes('w'))      ax = x;
    else if (dir.includes('e')) ax = x + width - 1;

    if (dir.includes('n'))      ay = y;
    else if (dir.includes('s')) ay = y + height - 1;

    return { x: ax, y: ay };
}

/* ──────────────────────────────────────────────── */
/* Фокус                                             */
/* ──────────────────────────────────────────────── */

// Убираем await — focus не должен блокировать старт drag
function focusTarget(id, our) {
    if (our && !our.isDestroyed()) {
        try {
            if (our.isMinimized()) our.restore();
            our.show();
            our.focus();
            our.moveTop();
        } catch (_) {}
        const xid = getXidForWindow(id);
        if (xid) execAsync(`xdotool windowactivate --sync ${xid}`).catch(() => {});
    } else {
        execAsync(`xdotool windowactivate --sync ${id}`).catch(async () => {
            try { await execAsync(`wmctrl -i -a ${id}`); } catch (_) {}
        });
    }
}

/* ──────────────────────────────────────────────── */
/* Цикл                                              */
/* ──────────────────────────────────────────────── */

let tickCount = 0;

async function step() {
    const d = activeDrag;
    if (!d) return;

    tickCount++;
    // Проверка кнопки раз в ~5 тиков (~80ms)
    if (tickCount % 5 === 0) {
        const down = await isLeftButtonDown();
        if (down === false) { stopDrag(); return; }
    }

    const m = await getMousePos();
    if (!m) return;

    const dx = m.x - d.startMouse.x;
    const dy = m.y - d.startMouse.y;

    let nx = d.startBounds.x;
    let ny = d.startBounds.y;
    let nw = d.startBounds.width;
    let nh = d.startBounds.height;

    if (d.mode === 'move') {
        nx = d.startBounds.x + dx;
        ny = d.startBounds.y + dy;
    } else {
        const dir = d.direction || '';
        if (dir.includes('e'))      nw = Math.max(100, d.startBounds.width + dx);
        else if (dir.includes('w')) { nw = Math.max(100, d.startBounds.width - dx); nx = d.startBounds.x + d.startBounds.width - nw; }
        if (dir.includes('s'))      nh = Math.max(100, d.startBounds.height + dy);
        else if (dir.includes('n')) { nh = Math.max(100, d.startBounds.height - dy); ny = d.startBounds.y + d.startBounds.height - nh; }
    }

    const lb = d.lastBounds;
    if (lb.x === nx && lb.y === ny && lb.width === nw && lb.height === nh) return;
    d.lastBounds = { x: nx, y: ny, width: nw, height: nh };

    const b = { x: nx, y: ny, width: nw, height: nh };
    if (d.our && !d.our.isDestroyed()) applyOurBounds(d.our, b);
    else await applyNativeBounds(d.id, b, d.mode);
}

async function startDrag({ id, mode, direction }) {
    stopDrag();

    if (!id || (mode !== 'move' && mode !== 'resize')) {
        return { ok: false, error: 'bad args' };
    }

    // 1. Активируем окно, чтобы фокус был на нём сразу
    const our = getWindowById(id);
    focusTarget(id, our);

    // 2. Получаем стартовые bounds
    let startBounds;
    if (our && !our.isDestroyed()) {
        const b = our.getBounds();
        startBounds = { x: b.x, y: b.y, width: b.width, height: b.height };
    } else {
        startBounds = await getBoundsX11(id);
    }
    if (!startBounds) return { ok: false, error: 'no bounds' };

    // 3. Перемещаем курсор в якорь
    const anchor = computeAnchor(startBounds, mode, direction);
    await moveMouseTo(anchor.x, anchor.y);

    // 4. Небольшая пауза, чтобы WM применил перемещение курсора
    await new Promise((r) => setTimeout(r, 20));

    // 5. Читаем реальное положение курсора
    const mAfter = await getMousePos() || anchor;
    // Если сильно не совпало с якорем — берём реальное, иначе якорь (устойчивее)
    const startMouse =
        Math.abs(mAfter.x - anchor.x) < 8 && Math.abs(mAfter.y - anchor.y) < 8
            ? anchor
            : mAfter;

    activeDrag = {
        id, mode, direction,
        startMouse,
        startBounds,
        lastBounds: { ...startBounds },
        our,
        timer: null,
    };
    tickCount = 0;
    activeDrag.timer = setInterval(step, 16);

    console.log('[drag] start', mode, direction || '', 'id =', id,
                'anchor =', startMouse);
    return { ok: true };
}

function stopDrag() {
    if (!activeDrag) return;
    clearInterval(activeDrag.timer);
    console.log('[drag] stop id =', activeDrag.id);
    activeDrag = null;
    global.topbarBroadcast?.();
}

/* ──────────────────────────────────────────────── */
/* IPC                                                */
/* ──────────────────────────────────────────────── */

export default function () {
    ipcMain.handle('native-window:begin-drag', async (_e, payload) => {
        try { return await startDrag(payload || {}); }
        catch (err) {
            console.error('[drag] begin failed:', err.message);
            return { ok: false, error: err.message };
        }
    });

    ipcMain.on('native-window:end-drag', () => {
        stopDrag();
    });

    ipcMain.on('topbar:close-window', () => {
        stopDrag();
    });
}