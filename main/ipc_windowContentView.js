import electronPkg from 'electron';
const { WebContentsView, ipcMain } = electronPkg;
import { movePanelWithWindow, destroyPanelView, reorderPanels, getPanelBounds } from './ipc_panelView.js';

function resolvePreload(requested) {
  const themeEnabled = global.themeEnabled !== false;
  const themedPath = global.paths.reactPreload;
  const cleanPath = global.paths.reactPreloadNoTheme;
  if (!requested) return themeEnabled ? themedPath : cleanPath;
  if (requested === themedPath || requested === cleanPath) {
    return themeEnabled ? themedPath : cleanPath;
  }
  return requested;
}

function createWindowContentView(windowId, { url, preload, initialBounds }) {
  if (global.windowContentViews[windowId]) {
    const entry = global.windowContentViews[windowId];
    if (url && entry.url !== url) {
      entry.view.webContents.loadURL(url);
      entry.url = url;
    }
    return entry.view;
  }

  const requestedPreload = preload;
  const actualPreload = resolvePreload(preload);

  const view = new WebContentsView({
    webPreferences: {
      preload: actualPreload,
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
  view.webContents.loadURL(url || 'about:blank');

  const webContents = view.webContents;

  const sendNavigationUpdate = (errorInfo) => {
    const canGoBack = webContents.navigationHistory.canGoBack?.() || false;
    const canGoForward = webContents.navigationHistory.canGoForward?.() || false;
    const isLoading = webContents.isLoading?.() || false;
    const currentUrl = webContents.getURL?.() || '';
    const title = webContents.getTitle?.() || '';

    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      global.mainWindow.webContents.send('window-navigation-update', {
        windowId, url: currentUrl, title, canGoBack, canGoForward, loading: isLoading,
        error: errorInfo || null,
      });
    }
  };

  webContents.on('did-navigate', () => sendNavigationUpdate());
  webContents.on('did-navigate-in-page', () => sendNavigationUpdate());
  webContents.on('did-start-loading', () => sendNavigationUpdate());
  webContents.on('did-stop-loading', () => sendNavigationUpdate());
  webContents.on('page-title-updated', () => sendNavigationUpdate());
  webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    sendNavigationUpdate({ errorCode, errorDescription, validatedURL, isMainFrame });
  });

  global.mainWindow.contentView.addChildView(view);

  const bounds = initialBounds || { x: 0, y: 0, width: 0, height: 0 };
  view.setBounds(bounds);

  global.windowContentViews[windowId] = {
    view,
    bounds,
    scale: 1,
    zIndex: 0,
    url: url || 'about:blank',
    requestedPreload,
  };

  reorderPanels();
  return view;
}

function updateWindowContentView(windowId, { x, y, width, height, scale }) {
  const entry = global.windowContentViews[windowId];
  if (!entry) return;

  const prev = entry.bounds;
  const next = {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
  entry.view.setBounds(next);
  entry.bounds = next;

  // Синхронизировать панель с окном
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  if (dx !== 0 || dy !== 0) {
    movePanelWithWindow(windowId, dx, dy);
  }

  if (scale !== undefined && scale !== entry.scale) {
    entry.view.webContents.setZoomFactor(scale);
    entry.scale = scale;
  }
}

function destroyWindowContentView(windowId) {
  const entry = global.windowContentViews[windowId];
  if (!entry) return;

  // Удалить панель этого окна
  destroyPanelView(windowId);

  try { global.mainWindow.contentView.removeChildView(entry.view); } catch (_) {}
  try { entry.view.webContents.destroy(); } catch (_) {}
  delete global.windowContentViews[windowId];
}

function setWindowContentZIndex(windowId, zIndex) {
  const entry = global.windowContentViews[windowId];
  if (!entry) return;
  entry.zIndex = zIndex;
  reorderPanels();
}

function getWindowView(windowId) {
  return global.windowContentViews?.[windowId]?.view;
}

function recreateAllViews() {
  const snapshots = Object.entries(global.windowContentViews || {}).map(([id, e]) => ({
    id,
    url: e.url,
    bounds: e.bounds,
    scale: e.scale || 1,
    zIndex: e.zIndex || 0,
    requestedPreload: e.requestedPreload,
  }));

  if (snapshots.length === 0) return;

  for (const snap of snapshots) destroyWindowContentView(snap.id);

  for (const snap of snapshots) {
    createWindowContentView(snap.id, {
      url: snap.url,
      preload: snap.requestedPreload,
      initialBounds: snap.bounds,
    });
    const entry = global.windowContentViews[snap.id];
    if (!entry) continue;
    entry.zIndex = snap.zIndex;
    if (snap.scale !== 1) {
      entry.view.webContents.setZoomFactor(snap.scale);
      entry.scale = snap.scale;
    }
  }

  reorderPanels();
}

export { createWindowContentView, updateWindowContentView, destroyWindowContentView, setWindowContentZIndex };

export default function () {
  global.windowContentViews = {};
  if (global.themeEnabled === undefined) global.themeEnabled = true;

  ipcMain.on('create-window-content-view', (_e, data) => {
    createWindowContentView(data.windowId, {
      url: data.url, preload: data.preload, initialBounds: data.bounds,
    });
  });

  ipcMain.on('update-window-content-view', (_e, data) => {
    updateWindowContentView(data.windowId, {
      x: data.x, y: data.y, width: data.width, height: data.height, scale: data.scale,
    });
  });

  ipcMain.on('destroy-window-content-view', (_e, data) => {
    destroyWindowContentView(data.windowId);
  });

  ipcMain.on('set-window-content-zindex', (_e, data) => {
    setWindowContentZIndex(data.windowId, data.zIndex);
  });

  ipcMain.handle('get-desktop-view-bounds', () => ({ x: 0, y: 0, width: 0, height: 0 }));
  ipcMain.handle('get-panel-bounds', (_e, data) => getPanelBounds(data?.windowId));

  ipcMain.on('window-go-back', (_e, windowId) => {
    const view = getWindowView(windowId);
    if (view?.webContents?.canGoBack?.()) view.webContents.goBack();
  });
  ipcMain.on('window-go-forward', (_e, windowId) => {
    const view = getWindowView(windowId);
    if (view?.webContents?.canGoForward?.()) view.webContents.goForward();
  });
  ipcMain.on('window-reload', (_e, windowId) => {
    const view = getWindowView(windowId);
    if (view?.webContents) view.webContents.reload();
  });
  ipcMain.on('window-load-url', (_e, windowId, url) => {
    const view = getWindowView(windowId);
    if (view?.webContents) view.webContents.loadURL(url);
  });
  ipcMain.on('window-stop-load', (_e, windowId) => {
    const view = getWindowView(windowId);
    if (view?.webContents?.isLoading?.()) view.webContents.stop();
  });

  ipcMain.handle('get-window-nav-state', (_e, windowId) => {
    const view = getWindowView(windowId);
    if (!view) return null;
    const wc = view.webContents;
    return {
      url: wc.getURL?.() || '',
      title: wc.getTitle?.() || '',
      canGoBack: wc.navigationHistory.canGoBack?.() || false,
      canGoForward: wc.navigationHistory.canGoForward?.() || false,
      loading: wc.isLoading?.() || false,
    };
  });

  ipcMain.on('theme:enabled-changed', (_e, enabled) => {
    global.themeEnabled = !!enabled;
    recreateAllViews();
  });
}