import { ipcMain } from 'electron';
import { spawn } from 'node-pty';

// senderId → ptyProcess. Один pty на каждый view, а не один на приложение.
const ptys = new Map();

function killPty(senderId) {
  const pty = ptys.get(senderId);
  if (!pty) return;
  try { pty.kill(); } catch (_) {}
  ptys.delete(senderId);
}

export default function () {
  ipcMain.on('terminal-start', (event) => {
    const senderId = event.sender.id;

    // Если у этого view уже был pty — убиваем и создаём новый.
    // Это защита от двойного start, если frontend по какой-то причине
    // вызовет его второй раз.
    killPty(senderId);

    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const pty = spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.env.HOME || process.cwd(),
      env: process.env,
    });

    ptys.set(senderId, pty);

    pty.on('data', (data) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('terminal-data', data);
      }
    });

    pty.on('exit', () => {
      // Если pty умер сам (пользователь ввёл exit) — убираем из Map,
      // чтобы можно было запустить новый.
      if (ptys.get(senderId) === pty) {
        ptys.delete(senderId);
      }
    });

    // Самое главное: когда view уничтожается — убиваем pty.
    // Это ловит и закрытие окна, и падение renderer'а, и вообще всё.
    event.sender.once('destroyed', () => {
      killPty(senderId);
    });
  });

  ipcMain.on('terminal-input', (event, data) => {
    const pty = ptys.get(event.sender.id);
    if (pty) pty.write(data);
  });

  ipcMain.on('terminal-resize', (event, { cols, rows }) => {
    const pty = ptys.get(event.sender.id);
    if (pty && cols > 0 && rows > 0) {
      try { pty.resize(cols, rows); } catch (_) {}
    }
  });

  // Явный сигнал от frontend'а на выходе. Дополнительная страховка
  // к 'destroyed' — на случай, если React успел размонтировать
  // компонент, но webContents ещё жив.
  ipcMain.on('terminal-exit', (event) => {
    killPty(event.sender.id);
  });
}