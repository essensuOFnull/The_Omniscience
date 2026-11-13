import { build } from 'vite';
import path from 'path';
import fs from 'fs';

export default async function () {
  const rootDir = global.paths.projectRoot;
  const publicDir = global.paths.publicDir;
  const distDir = global.paths.distDir;
  const componentappsDir = global.paths.componentappsDir;

  if (!fs.existsSync(componentappsDir)) return;

  const input = {};
  const entries = fs.readdirSync(componentappsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const appDir = path.join(componentappsDir, entry.name);
    const componentFile = path.join(appDir, 'Index.jsx');
    if (!fs.existsSync(componentFile)) continue;

    const htmlPath = path.join(appDir, 'index.html');
    if (!fs.existsSync(htmlPath)) {
      fs.writeFileSync(htmlPath, `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><title>${entry.name}</title></head>
<body><div id="root"></div><script>window.__APP_WINDOW_ID__ = new URLSearchParams(location.search).get('windowId') || '';</script><script type="module" src="./Index.jsx"></script></body>
</html>`, 'utf8');
    }
    input[`componentapps/${entry.name}/index`] = htmlPath;
  }
  if (Object.keys(input).length === 0) return;

  await build({
    root: rootDir,
    base: './',
    resolve: {
      alias: {
        '@public': publicDir,
      },
    },
    build: {
      outDir: distDir,
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: { input },
    },
    publicDir,
  });
}
