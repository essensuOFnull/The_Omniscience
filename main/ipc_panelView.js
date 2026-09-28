import electronPkg from 'electron';
const { WebContentsView, ipcMain } = electronPkg;

function resolvePreload(requested) {
  const themeEnabled = global.themeEnabled !== false;
  const themed = global.paths.reactPreload;
  const clean = global.paths.reactPreloadNoTheme;
  if (!requested) return themeEnabled ? themed : clean;
  if (requested === themed || requested === clean) return themeEnabled ? themed : clean;
  return requested;
}

// windowId -> { view, bounds, windowId }
const panelRegistry = new Map();

function createPanelView(windowId, { url, preload, initialBounds }) {
  if (panelRegistry.has(windowId)) return panelRegistry.get(windowId).view;

  const view = new WebContentsView({
    webPreferences: {
      preload: resolvePreload(preload),
      nodeIntegration: false,
      contextIsolation: true,
      transparent: true,
      backgroundColor: '#00000000',
      sandbox: false,
      webSecurity: true,
      webviewTag: false,
    },
  });
  view.setBackgroundColor('#00000000');
  view.webContents.loadURL(url);

  const bounds = initialBounds || { x: 0, y: 0, width: 180, height: 100 };
  view.setBounds(bounds);

  global.mainWindow.contentView.addChildView(view);

  panelRegistry.set(windowId, { view, bounds, windowId });

  view.webContents.once('destroyed', () => {
    panelRegistry.delete(windowId);
  });

  reorderPanels();
  return view;
}

function updatePanelBounds(windowId, bounds) {
  const entry = panelRegistry.get(windowId);
  if (!entry) return;
  const b = {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
  };
  entry.view.setBounds(b);
  entry.bounds = b;
}

export function destroyPanelView(windowId) {
  const entry = panelRegistry.get(windowId);
  if (!entry) return;
  try { global.mainWindow.contentView.removeChildView(entry.view); } catch (_) {}
  try { entry.view.webContents.destroy(); } catch (_) {}
  panelRegistry.delete(windowId);
}

export function movePanelWithWindow(windowId, dx, dy) {
  const entry = panelRegistry.get(windowId);
  if (!entry) return;
  updatePanelBounds(windowId, {
    x: entry.bounds.x + dx,
    y: entry.bounds.y + dy,
    width: entry.bounds.width,
    height: entry.bounds.height,
  });
}

export function getPanelBounds(windowId) {
  const entry = panelRegistry.get(windowId);
  return entry ? { ...entry.bounds } : null;
}

// Панель всегда сразу после своего окна в z-порядке.
export function reorderPanels() {
  if (!global.mainWindow || global.mainWindow.isDestroyed()) return;

  const entries = Object.entries(global.windowContentViews || {});
  entries.sort((a, b) => (a[1].zIndex || 0) - (b[1].zIndex || 0));

  // Снять все
  for (const [, e] of entries) {
    try { global.mainWindow.contentView.removeChildView(e.view); } catch (_) {}
  }
  for (const [, p] of panelRegistry) {
    try { global.mainWindow.contentView.removeChildView(p.view); } catch (_) {}
  }

  // Добавить в правильном порядке: window, panel, window, panel...
  for (const [wid, e] of entries) {
    global.mainWindow.contentView.addChildView(e.view);
    e.view.setBounds(e.bounds);
    const panel = panelRegistry.get(wid);
    if (panel) {
      global.mainWindow.contentView.addChildView(panel.view);
      panel.view.setBounds(panel.bounds);
    }
  }
}

export default function () {
  ipcMain.on('create-panel-view', (_e, data) => {
    createPanelView(data.windowId, {
      url: data.url,
      preload: data.preload || null,
      initialBounds: data.bounds,
    });
  });

  ipcMain.on('update-panel-bounds', (_e, data) => {
    updatePanelBounds(data.windowId, data.bounds);
  });

  ipcMain.on('destroy-panel-view', (_e, data) => {
    destroyPanelView(data.windowId);
  });

  ipcMain.on('move-panel-by', (_e, data) => {
    movePanelWithWindow(data.windowId, data.dx, data.dy);
  });

  // Panel → Shell (кнопки окна и т.п.)
  ipcMain.on('panel:event', (event, { windowId, type, payload }) => {
    if (!global.mainWindow || global.mainWindow.isDestroyed()) return;
    global.mainWindow.webContents.send('shell:panel-event', {
      fromId: event.sender.id, windowId, type, payload,
    });
  });

  // Shell → Panel (props)
  ipcMain.on('shell:send-to-panel', (_e, { windowId, data }) => {
    const entry = panelRegistry.get(windowId);
    if (!entry) return;
    const wc = entry.view.webContents;
    if (wc && !wc.isDestroyed()) wc.send('panel:props', data);
  });

  // Frame события (drag/resize окна инициированные из панели)
  ipcMain.on('frame:drag-start', (_e, { windowId }) => {
    sendToShell('shell:frame-drag-start', { windowId });
  });
  ipcMain.on('frame:drag-delta', (_e, { windowId, dx, dy }) => {
    sendToShell('shell:frame-drag-delta', { windowId, dx, dy });
  });
  ipcMain.on('frame:drag-end', (_e, { windowId }) => {
    sendToShell('shell:frame-drag-end', { windowId });
  });
  ipcMain.on('frame:resize-start', (_e, { windowId, direction }) => {
    sendToShell('shell:frame-resize-start', { windowId, direction });
  });
  ipcMain.on('frame:resize-delta', (_e, { windowId, direction, dx, dy }) => {
    sendToShell('shell:frame-resize-delta', { windowId, direction, dx, dy });
  });
  ipcMain.on('frame:resize-end', (_e, { windowId }) => {
    sendToShell('shell:frame-resize-end', { windowId });
  });
}

function sendToShell(channel, data) {
  if (!global.mainWindow || global.mainWindow.isDestroyed()) return;
  global.mainWindow.webContents.send(channel, data);
}