import electronPkg from 'electron';
const { app, Menu, clipboard, shell, dialog, BrowserWindow,webContents } = electronPkg;
import path from 'path';

/* ------------------------------------------------------------------ */
/* Открытие ссылки в новом окне Omniscience                            */
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
/* Построение меню                                                      */
/* ------------------------------------------------------------------ */

function buildMenu(wc, params) {
  const {
    x, y,
    linkURL,
    srcURL,
    mediaType,
    selectionText,
    isEditable,
    editFlags,
    pageURL,
    title,
  } = params;

  const items = [];

  /* ---- Навигация ---- */
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
  items.push({
    label: 'Обновить',
    click: () => wc.reload(),
  });

  /* ---- Ссылка ---- */
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

  /* ---- Изображение / медиа ---- */
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

  /* ---- Текст в поле ввода ---- */
  if (isEditable) {
    items.push({ type: 'separator' });
    items.push({
      label: 'Вырезать',
      enabled: !!editFlags?.canCut,
      click: () => wc.cut(),
    });
    items.push({
      label: 'Копировать',
      enabled: !!editFlags?.canCopy,
      click: () => wc.copy(),
    });
    items.push({
      label: 'Вставить',
      enabled: !!editFlags?.canPaste,
      click: () => wc.paste(),
    });
    items.push({
      label: 'Выделить всё',
      enabled: !!editFlags?.canSelectAll,
      click: () => wc.selectAll(),
    });
  } else if (selectionText) {
    /* ---- Выделенный текст ---- */
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

  /* ---- Страница ---- */
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
  items.push({
    label: 'Печать…',
    click: () => wc.print(),
  });
  items.push({
    label: 'Показать код страницы',
    click: () => openInNewWindow(wc, `view-source:${pageURL}`),
  });

  /* ---- Зум ---- */
  items.push({ type: 'separator' });
  items.push({
    label: 'Увеличить',
    click: () => wc.setZoomLevel((wc.getZoomLevel() || 0) + 0.5),
  });
  items.push({
    label: 'Уменьшить',
    click: () => wc.setZoomLevel((wc.getZoomLevel() || 0) - 0.5),
  });
  items.push({
    label: 'Сбросить масштаб',
    click: () => wc.setZoomLevel(0),
  });

  /* ---- DevTools ---- */
  items.push({ type: 'separator' });
  items.push({
    label: 'Проверить элемент',
    click: () => wc.inspectElement(x, y),
  });

  return items;
}

/* ------------------------------------------------------------------ */
/* Регистрация                                                          */
/* ------------------------------------------------------------------ */

export function attachToWebContents(wc) {
  // Защита от двойной привязки
  if (wc.__omniCtxMenuAttached) return;
  wc.__omniCtxMenuAttached = true;

  wc.on('context-menu', (_event, params) => {
    const url = wc.getURL();
    if (url.startsWith('devtools://')) return;
    if (url.startsWith('chrome-extension://')) return;

    console.log('[ctx-menu] fire for', url.slice(0, 60), 'at', params.x, params.y);

    try {
      const menu = Menu.buildFromTemplate(buildMenu(wc, params));
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