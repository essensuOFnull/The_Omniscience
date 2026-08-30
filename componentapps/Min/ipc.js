import { ipcMain, Notification } from 'electron';
import { WebSocketServer } from "ws";

let wss = null;

function showNotification(title, body) {
  if (Notification.isSupported()) {
    const notif = new Notification({ title, body });
    notif.show();
  }
}

ipcMain.on('show-notification', (event, { title, body }) => {
  showNotification(title, body);
});

// ipc.js
ipcMain.on('start-server', (event, port) => {
  if (wss) {
    wss.close();
    wss = null;
  }
  try {
    wss = new WebSocketServer({ port: Number(port) });
    const clients = new Set();

    wss.on('connection', (ws) => {
      clients.add(ws);
      ws.on('message', (data) => {
        clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data);
          }
        });
      });
      ws.on('close', () => {
        clients.delete(ws);
      });
    });

    wss.on('error', (err) => {
      console.error('Server error:', err);
      event.sender.send('server-error', err.message);
    });

    wss.on('listening', () => {
      console.log(`Server started on port ${port}`);
      event.sender.send('server-started', port);
    });
  } catch (err) {
    console.error('Failed to create server:', err);
    event.sender.send('server-error', err.message);
  }
});

ipcMain.on('stop-server', () => {
  if (wss) {
    wss.close();
    wss = null;
    console.log('Server stopped');
  }
});

export { showNotification };