import { readdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import electronPkg from 'electron';
const{ipcMain}=electronPkg;

const FAVICON_EXTS = ['.png', '.jpg', '.jpeg', '.svg', '.ico'];
const MIME_MAP = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

export default function () {
  ipcMain.handle('get-apps-list', async () => {
    const { componentappsDir, webappsDir, distDir } = global.paths;
    const apps = [];

    apps.push({
      id: 'new-browser-window',
      type: 'browser',
      title: 'Браузер',
      url: null,                     // не используется
      icon: global.paths.icon,
      initialUrl: global.config.homepageUrl,
      useShell: false,               // не важно, т.к. Window сам обрабатывает
    });

    apps.push({
      id: 'xterm-window',
      type: 'xterm',
      title: 'Xterm',
      url: global.paths.xtermIndex,
      icon: global.paths.icon,
      useShell: false,               // не важно, т.к. Window сам обрабатывает
    });

    // 1. Компонентные приложения (React)
    if (existsSync(componentappsDir)) {
      const entries = readdirSync(componentappsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const appDir = join(componentappsDir, entry.name);
        const componentPath = join(appDir, 'App.jsx');
        if (!existsSync(componentPath)) continue;

        let iconDataUrl = null;
        for (const ext of FAVICON_EXTS) {
          const iconPath = join(appDir, `favicon${ext}`);
          if (existsSync(iconPath)) {
            try {
              const buffer = readFileSync(iconPath);
              const mime = MIME_MAP[ext] || 'application/octet-stream';
              iconDataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
            } catch (e) {
              console.warn(`Failed to read icon for ${entry.name}:`, e.message);
            }
            break;
          }
        }

        apps.push({
          id: entry.name,
          type: 'componentapp',
          title: entry.name,
          // Путь к собранному HTML этого приложения
          url: pathToFileURL(join(distDir, 'componentapps', entry.name, 'index.html')).href,
          icon: iconDataUrl,
        });
      }
    }

    // 2. Веб-приложения (статические)
    if (existsSync(webappsDir)) {
      const entries = readdirSync(webappsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const appDir = join(webappsDir, entry.name);
        const indexPath = join(appDir, 'index.html');
        if (!existsSync(indexPath)) continue;

        let iconDataUrl = null;
        for (const ext of FAVICON_EXTS) {
          const iconPath = join(appDir, `favicon${ext}`);
          if (existsSync(iconPath)) {
            try {
              const buffer = readFileSync(iconPath);
              const mime = MIME_MAP[ext] || 'application/octet-stream';
              iconDataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
            } catch (e) {
              console.warn(`Failed to read icon for ${entry.name}:`, e.message);
            }
            break;
          }
        }

        apps.push({
          id: entry.name,
          type: 'webapp',
          title: entry.name,
          url: pathToFileURL(join(distDir, 'webapps', entry.name, 'index.html')).href,
          icon: iconDataUrl,
        });
      }
    }

    return apps;
  });
}
