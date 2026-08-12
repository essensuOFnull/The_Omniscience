const { ipcMain, Notification } = require('electron');
const WebSocket = require('ws');

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

ipcMain.on('start-server', (event, port) => {
  if (wss) {
    wss.close();
  }
  try {
    wss = new WebSocket.Server({ port: Number(port) });
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
      console.log(`Test server started on port ${port}`);
      event.sender.send('server-started', port);
    });
  } catch (err) {
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

module.exports = { showNotification };