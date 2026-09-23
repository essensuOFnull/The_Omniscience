import { ipcMain, webContents } from 'electron';

let currentTheme = {
  enabled: true,
  colors: {
    maxR: 128, maxG: 0, maxB: 128,
    targetAlpha: 0.25, textBrightness: 255,
  },
};

export default function () {
  // Отдать текущее состояние тому, кто только что загрузился
  ipcMain.handle('theme:get', () => currentTheme);

  // Принять новое состояние от главного окна и разослать ВСЕМ
  ipcMain.handle('theme:broadcast', (_e, payload) => {
    currentTheme = payload;
    for (const wc of webContents.getAllWebContents()) {
      if (!wc.isDestroyed()) {
        wc.send('theme:update', payload);
      }
    }
    return true;
  });
}