import electronPkg from 'electron';
const { app, Menu, clipboard, shell, dialog, BrowserWindow, webContents, screen } = electronPkg;
import path from 'path';
import {
  consumePendingFileContext,
  openPath as fsOpenPath,
  revealPath as fsRevealPath,
  trashPath as fsTrashPath,
  deletePath as fsDeletePath,
  copyFiles as fsCopyFiles,
  cutFiles as fsCutFiles,
  pasteFiles as fsPasteFiles,
  getCutPaths,
  clearCut,
} from './ipc_files.js';

import { createWindowByRequest } from './ipc_windowManager.js';

/* ------------------------------------------------------------------ */
/* Открытие ссылки в новом окне                                        */
/* ------------------------------------------------------------------ */

function findWindowIdFor(wc) {
  for (const [id, entry] of Object.entries(global.views || {})) {
    if (entry.view?.webContents === wc) return id;
  }
  return null;
}

function openInNewWindow(wc, url) {
  if (!global.mainWindow || global.mainWindow.isDestroyed()) return;
  const sourceWindowId = findWindowIdFor(wc);
  global.mainWindow.webContents.send('shell:open-window-request', {
    sourceWindowId,
    url,
    disposition: 'foreground-tab',
  });
}

/* ------------------------------------------------------------------ */
/* Открытие componentapp                                               */
/* ------------------------------------------------------------------ */

function openComponentApp(appId, { title, extra, width = 480, height = 240 } = {}) {
  const id = `${appId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  return createWindowByRequest({
    id,
    appId,
    url: `componentapps/${appId}/index.html`,
    title: title || appId,
    icon: null,
    bounds: {
      x: Math.round((workArea.width - width) / 2),
      y: Math.round((workArea.height - height) / 2),
      width,
      height,
    },
    extra,
  });
}

/* ------------------------------------------------------------------ */
/* Блок файлов / рабочего стола                                         */
/* ------------------------------------------------------------------ */

function buildFilesBlock(wc, ctx) {
  const { kind, paths } = ctx || {};
  if (!paths || paths.length === 0) return [];

  const items = [];
  items.push({ type: 'separator' });

  /* ============ ПКМ на пустом месте рабочего стола ============ */
  if (kind === 'background') {
    const dir = paths[0];
    items.push({ label: 'Рабочий стол', enabled: false });

    items.push({
      label: 'Создать папку',
      click: () => {
        openComponentApp('create-item', {
          title: 'Новая папка',
          width: 460, height: 200,
          extra: { dir, kind: 'folder' },
        });
      },
    });
    items.push({
      label: 'Создать файл',
      click: () => {
        openComponentApp('create-item', {
          title: 'Новый файл',
          width: 460, height: 200,
          extra: { dir, kind: 'file' },
        });
      },
    });

    items.push({ type: 'separator' });

    items.push({
      label: 'Вставить',
      click: async () => {
        const res = await fsPasteFiles(dir);
        if (res?.success) wc.send('fs:request-reload', { dir });
      },
    });

    const cut = getCutPaths();
    if (cut.length > 0) {
      items.push({
        label: `Отменить вырезание (${cut.length})`,
        click: () => {
          clearCut();
          wc.send('fs:request-reload', { dir });
        },
      });
    }

    items.push({ type: 'separator' });

    items.push({
      label: 'Обновить',
      click: () => wc.send('fs:request-reload', { dir }),
    });
    items.push({
      label: 'Показать в файловом менеджере',
      click: () => fsRevealPath(dir),
    });
    return items;
  }

  /* ============ ПКМ по файлам ============ */
  const n = paths.length;
  const onlyOne = n === 1;
  const firstDir = path.dirname(paths[0]);

  items.push({
    label: onlyOne ? 'Файл' : `Выделено файлов: ${n}`,
    enabled: false,
  });

  /* --- Открытие --- */
  items.push({
    label: onlyOne ? 'Открыть' : `Открыть все (${n})`,
    click: async () => {
      for (const p of paths) {
        try { await fsOpenPath(p); } catch (_) {}
      }
    },
  });

  items.push({
    label: 'Открыть с помощью…',
    click: () => {
      openComponentApp('open-with', {
        title: 'Открыть с помощью',
        width: 520, height: 460,
        extra: { paths: JSON.stringify(paths) },
      });
    },
  });

  items.push({ type: 'separator' });

  /* --- Работа с именами и путями --- */
  items.push({
    label: 'Переименовать',
    enabled: onlyOne,
    click: onlyOne ? () => {
      openComponentApp('rename', {
        title: 'Переименовать',
        width: 460, height: 200,
        extra: {
          filePath: paths[0],
          currentName: path.basename(paths[0]),
        },
      });
    } : undefined,
  });

  items.push({
    label: onlyOne ? 'Скопировать путь' : `Скопировать ${n} путей`,
    click: () => clipboard.writeText(paths.join('\n')),
  });

  items.push({
    label: 'Показать в файловом менеджере',
    enabled: onlyOne,
    click: onlyOne ? () => fsRevealPath(paths[0]) : undefined,
  });

  items.push({ type: 'separator' });

  /* --- Буфер обмена --- */
  items.push({
    label: 'Копировать',
    click: () => fsCopyFiles(paths),
  });
  items.push({
    label: 'Вырезать',
    click: () => fsCutFiles(paths),
  });
  items.push({
    label: 'Вставить',
    click: async () => {
      const res = await fsPasteFiles(firstDir);
      if (res?.success) wc.send('fs:request-reload', { dir: firstDir });
    },
  });

  const cut = getCutPaths();
  if (cut.length > 0) {
    items.push({
      label: `Отменить вырезание (${cut.length})`,
      click: () => {
        clearCut();
        wc.send('fs:request-reload', { dir: firstDir });
      },
    });
  }

  items.push({ type: 'separator' });

  /* --- Удаление --- */
  items.push({
    label: onlyOne ? 'Удалить в корзину' : `Удалить ${n} в корзину`,
    click: async () => {
      for (const p of paths) {
        try { await fsTrashPath(p); } catch (_) {}
      }
      wc.send('fs:request-reload', { dir: firstDir });
    },
  });

  items.push({
    label: onlyOne ? 'Удалить безвозвратно' : `Удалить безвозвратно (${n})`,
    click: async () => {
      const win = BrowserWindow.fromWebContents(wc) || global.mainWindow;
      const message = onlyOne
        ? `Удалить безвозвратно "${path.basename(paths[0])}"?`
        : `Удалить безвозвратно ${n} файлов? Это действие необратимо.`;
      const { response } = await dialog.showMessageBox(win, {
        type: 'warning',
        buttons: ['Отмена', 'Удалить'],
        defaultId: 0, cancelId: 0,
        message,
      });
      if (response !== 1) return;
      for (const p of paths) {
        try { await fsDeletePath(p); } catch (_) {}
      }
      wc.send('fs:request-reload', { dir: firstDir });
    },
  });

  return items;
}

/* ------------------------------------------------------------------ */
/* Построение меню                                                      */
/* ------------------------------------------------------------------ */

function buildMenu(wc, params, fileCtx) {
  const {
    x, y, linkURL, srcURL, mediaType,
    selectionText, isEditable, editFlags, pageURL, title,
  } = params;

  const items = [];

  items.push({
    label: 'Назад',
    enabled: wc.navigationHistory?.canGoBack?.() || false,
    click: () => wc.navigationHistory.goBack(),
  });
  items.push({
    label: 'Вперёд',
    enabled: wc.navigationHistory?.canGoForward?.() || false,
    click: () => wc.navigationHistory.goForward(),
  });
  items.push({ label: 'Обновить', click: () => wc.reload() });

  if (linkURL) {
    items.push({ type: 'separator' });
    items.push({
      label: 'Открыть ссылку в новом окне',
      click: () => openInNewWindow(wc, linkURL),
    });
    items.push({
      label: 'Открыть ссылку в системном браузере',
      click: () => shell.openExternal(linkURL),
    });
    items.push({
      label: 'Копировать адрес ссылки',
      click: () => clipboard.writeText(linkURL),
    });
  }

  if (mediaType === 'image' && srcURL) {
    items.push({ type: 'separator' });
    items.push({
      label: 'Открыть изображение в новом окне',
      click: () => openInNewWindow(wc, srcURL),
    });
    items.push({
      label: 'Копировать адрес изображения',
      click: () => clipboard.writeText(srcURL),
    });
    items.push({
      label: 'Сохранить изображение как…',
      click: () => wc.downloadURL(srcURL),
    });
  }

  if (mediaType === 'video' || mediaType === 'audio') {
    items.push({ type: 'separator' });
    if (srcURL) {
      items.push({
        label: 'Открыть файл в новом окне',
        click: () => openInNewWindow(wc, srcURL),
      });
      items.push({
        label: 'Копировать адрес',
        click: () => clipboard.writeText(srcURL),
      });
    }
  }

  if (isEditable) {
    items.push({ type: 'separator' });
    items.push({ label: 'Вырезать', enabled: !!editFlags?.canCut, click: () => wc.cut() });
    items.push({ label: 'Копировать', enabled: !!editFlags?.canCopy, click: () => wc.copy() });
    items.push({ label: 'Вставить', enabled: !!editFlags?.canPaste, click: () => wc.paste() });
    items.push({ label: 'Выделить всё', enabled: !!editFlags?.canSelectAll, click: () => wc.selectAll() });
  } else if (selectionText) {
    items.push({ type: 'separator' });
    items.push({
      label: 'Копировать',
      enabled: !!editFlags?.canCopy,
      click: () => wc.copy(),
    });
    items.push({
      label: `Поиск в Google: «${selectionText.slice(0, 40)}${selectionText.length > 40 ? '…' : ''}»`,
      click: () => {
        const q = encodeURIComponent(selectionText);
        openInNewWindow(wc, `https://www.google.com/search?q=${q}`);
      },
    });
    items.push({
      label: 'Перевести в Google Translate',
      click: () => {
        const q = encodeURIComponent(selectionText);
        shell.openExternal(`https://translate.google.com/?sl=auto&tl=ru&text=${q}`);
      },
    });
  }

  items.push({ type: 'separator' });
  items.push({
    label: 'Сохранить страницу как…',
    click: async () => {
      const defaultDir = app.getPath('downloads');
      const safeTitle = (title || 'page').replace(/[\\/:*?"<>|]/g, '_');
      const { canceled, filePath } = await dialog.showSaveDialog(global.mainWindow, {
        defaultPath: path.join(defaultDir, `${safeTitle}.html`),
        filters: [
          { name: 'Web Page, Complete', extensions: ['html'] },
          { name: 'Web Page, HTML Only', extensions: ['html'] },
        ],
      });
      if (canceled || !filePath) return;
      try {
        await wc.savePage(filePath, 'HTMLComplete');
      } catch (err) {
        dialog.showErrorBox('Ошибка', err.message);
      }
    },
  });
  items.push({ label: 'Печать…', click: () => wc.print() });
  items.push({
    label: 'Показать код страницы',
    click: () => openInNewWindow(wc, `view-source:${pageURL}`),
  });

  items.push({ type: 'separator' });
  items.push({ label: 'Увеличить', click: () => wc.setZoomLevel((wc.getZoomLevel() || 0) + 0.5) });
  items.push({ label: 'Уменьшить', click: () => wc.setZoomLevel((wc.getZoomLevel() || 0) - 0.5) });
  items.push({ label: 'Сбросить масштаб', click: () => wc.setZoomLevel(0) });

  items.push({ type: 'separator' });
  items.push({ label: 'Проверить элемент', click: () => wc.inspectElement(x, y) });

  if (fileCtx) {
    for (const it of buildFilesBlock(wc, fileCtx)) items.push(it);
  }

  return items;
}

/* ------------------------------------------------------------------ */
/* Регистрация                                                          */
/* ------------------------------------------------------------------ */

export function attachToWebContents(wc) {
  if (wc.__omniCtxMenuAttached) return;
  wc.__omniCtxMenuAttached = true;

  wc.on('context-menu', (_event, params) => {
    const url = wc.getURL();
    if (url.startsWith('devtools://')) return;
    if (url.startsWith('chrome-extension://')) return;

    let fileCtx = null;
    try {
      fileCtx = consumePendingFileContext(wc.id);
    } catch (err) {
      console.warn('[ctx-menu] consume file context failed:', err.message);
    }

    try {
      const menu = Menu.buildFromTemplate(buildMenu(wc, params, fileCtx));
      const win = BrowserWindow.fromWebContents(wc) || global.mainWindow;
      menu.popup({ window: win });
    } catch (err) {
      console.error('[ctx-menu] failed:', err);
    }
  });
}

export default function () {
  for (const wc of webContents.getAllWebContents()) {
    attachToWebContents(wc);
  }
  app.on('web-contents-created', (_e, wc) => {
    attachToWebContents(wc);
  });
}