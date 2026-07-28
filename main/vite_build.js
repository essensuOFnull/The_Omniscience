import { build } from 'vite';
import path from 'path';
import fs from 'fs';

export default async function () {
  const rootDir = global.paths.projectRoot;
  const srcDir = global.paths.srcDir;
  const publicDir = global.paths.publicDir;
  const distDir = global.paths.distDir;
  const componentappsDir = global.paths.componentappsDir;
  const rendererIndexHtml = path.join(rootDir, 'src', 'index.html');

  const input = {
    main: rendererIndexHtml,
  };

  if (fs.existsSync(componentappsDir)) {
    const entries = fs.readdirSync(componentappsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const appDir = path.join(componentappsDir, entry.name);
      const componentFile = path.join(appDir, 'Index.jsx');
      if (!fs.existsSync(componentFile)) continue;

      const htmlPath = path.join(appDir, 'index.html');
      if (!fs.existsSync(htmlPath)) {
        const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>${entry.name}</title>
</head>
<body>
  <div id="root"></div>
  <script>
    window.__APP_WINDOW_ID__ = new URLSearchParams(window.location.search).get('windowId') || '';
  </script>
  <script type="module" src="./Index.jsx"></script>
</body>
</html>`;
        // Исправлено: передаём путь и данные
        fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
      }

      const mainJsxPath = path.join(appDir, 'Index.jsx');
      if (!fs.existsSync(mainJsxPath)) {
        const mainContent = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App windowId={window.__APP_WINDOW_ID__} />
  </React.StrictMode>
);`;
        // Исправлено
        fs.writeFileSync(mainJsxPath, mainContent, 'utf-8');
      }

      input[`componentapps/${entry.name}/index.html`] = htmlPath;
    }
  }

  await build({
    root: rootDir,
    base: './',
    resolve: {
      alias: {
        '@src': srcDir,
        '@public': publicDir,
      },
    },
    build: {
      outDir: distDir,           // в новых версиях Vite – outDir, а не distDir
      emptyOutDir: true,
      rollupOptions: { input },
    },
    publicDir: path.join(rootDir, 'public'),
    plugins: [
      {
        name: 'copy-webapps',
        async writeBundle() {
          const webappsDir = global.paths.webappsDir;
          if (fs.existsSync(webappsDir)) {
            // webapps теперь копируются прямо в dist/webapps
            const dest = path.join(distDir, 'webapps');
            fs.cpSync(webappsDir, dest, { recursive: true });
          }
        },
      },
    ],
  });
}