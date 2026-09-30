import electronPkg from 'electron';
const { ipcMain, webContents } = electronPkg;

// windowId → webContentsId (DevTools view)
const frontendRegistry = new Map();
// windowId → массив сообщений, пришедших от backend ДО регистрации frontend
const pendingBackend = new Map();

function flushPending(windowId, wcId) {
  const wc = webContents.fromId(wcId);
  if (!wc || wc.isDestroyed()) return;
  const queue = pendingBackend.get(windowId);
  if (!queue || queue.length === 0) return;
  pendingBackend.delete(windowId);
  for (const msg of queue) {
    wc.send('rtd:main-to-frontend-' + windowId, msg);
  }
  console.log(`[RTD-bridge] flushed ${queue.length} buffered msgs for ${windowId}`);
}

export default function () {
  // BACKEND → MAIN → FRONTEND
  ipcMain.on('rtd:backend-to-main', (event, msg) => {
    const { windowId, event: evName, payload } = msg || {};
    if (!windowId) return;

    const wcId = frontendRegistry.get(windowId);

    if (wcId == null) {
      // Frontend ещё не зарегистрирован — буферизуем
      if (!pendingBackend.has(windowId)) pendingBackend.set(windowId, []);
      pendingBackend.get(windowId).push({ event: evName, payload });
      return;
    }

    const wc = webContents.fromId(wcId);
    if (!wc || wc.isDestroyed()) {
      frontendRegistry.delete(windowId);
      return;
    }
    wc.send('rtd:main-to-frontend-' + windowId, { event: evName, payload });
  });

  // FRONTEND → MAIN → BACKEND
  ipcMain.on('rtd:frontend-to-main', (event, msg) => {
    const { windowId, event: evName, payload } = msg || {};
    if (!windowId) return;

    const entry = global.views?.[windowId];
    if (!entry) return;
    const wc = entry.view?.webContents;
    if (!wc || wc.isDestroyed()) return;

    wc.send('rtd:main-to-backend-' + windowId, { event: evName, payload });
  });

  // Регистрация frontend
  ipcMain.on('rtd:frontend-register', (event, { windowId }) => {
    if (!windowId) return;
    frontendRegistry.set(windowId, event.sender.id);

    event.sender.once('destroyed', () => {
      if (frontendRegistry.get(windowId) === event.sender.id) {
        frontendRegistry.delete(windowId);
      }
    });

    console.log(`[RTD-bridge] frontend registered: ${windowId} → wcId=${event.sender.id}`);

    // Проливаем то, что накопилось за время до регистрации
    flushPending(windowId, event.sender.id);
  });

  ipcMain.on('rtd:frontend-unregister', (event, { windowId }) => {
    if (frontendRegistry.get(windowId) === event.sender.id) {
      frontendRegistry.delete(windowId);
      console.log(`[RTD-bridge] frontend unregistered: ${windowId}`);
    }
  });

  ipcMain.handle('rtd:list-registry', () => {
    const out = [];
    for (const [windowId, wcId] of frontendRegistry) {
      out.push({ windowId, wcId, pending: pendingBackend.get(windowId)?.length || 0 });
    }
    return out;
  });
}