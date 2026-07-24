import fs from 'fs';
import electronPkg from 'electron';
const{ipcMain}=electronPkg;

export default function () {
  ipcMain.handle('read-image-base64', async (event, filePath) => {
    try {
      const ext = filePath.split('.').pop().toLowerCase();
      const buffer = fs.readFileSync(filePath);
      const base64 = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${buffer.toString('base64')}`;
      return { success: true, base64 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('save-image-base64', async (event, { filePath, base64Data }) => {
    try {
      // Отрезаем техническую часть base64 заголовка (data:image/png;base64,)
      const dataWithoutHeader = base64Data.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(dataWithoutHeader, 'base64');
      fs.writeFileSync(filePath, buffer);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.on('chonky:save-path', (event, data) => {
    // Отправляем всем окнам, кроме отправителя (Chonky)
    global.state.windows.forEach(win => {
      if (win.webContents.id !== event.sender.id) {
        win.webContents.send('chonky:save-path', data);
      }
    });
  });
}