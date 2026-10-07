import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

async function createPreload(key, content, tmpDir) {
  const fileName = `${key}.cjs`;
  const filePath = path.join(tmpDir, fileName);
  await writeFile(filePath, content, 'utf-8');
  global.paths[key] = filePath.replace(/\\/g, '/');
}

function buildInjectStylesFunction(css) {
  return `
(function () {
  function injectAllStyles() {
    if (!document.head) return false;
    const style = document.createElement('style');
    style.textContent = \`${css.replace(/`/g, '\\`')}\`;
    document.head.appendChild(style);
    return true;
  }
  const headObserver = new MutationObserver(() => {
    if (injectAllStyles()) headObserver.disconnect();
  });
  headObserver.observe(document.documentElement || document, { childList: true, subtree: true });
})();`;
}

const BASE_CSS = `
html::before {
  content: ""!important;
  position: fixed!important;
  top: 0!important;
  left: 0!important;
  right: 0!important;
  bottom: 0!important;
  pointer-events: none!important;
  z-index: 9999!important;
  border:1px dashed cyan!important;
}`;

export default async function () {
  const tmpDir = path.join(global.paths.projectRoot, '.temp');
  await mkdir(tmpDir, { recursive: true });

  // === Chrome-extensions preload — читаем и вклеиваем ===
  let extPreloadCode = '';
  try {
    const extPreloadPath = require.resolve('electron-chrome-extensions/preload');
    extPreloadCode = await readFile(extPreloadPath, 'utf-8');
    extPreloadCode = `(() => { if (typeof chrome === 'undefined') { ${extPreloadCode} } })();`;
    console.log('[preloads] chrome-extensions preload loaded, size:', extPreloadCode.length);
  } catch (err) {
    console.error('[preloads] chrome-extensions preload not found:', err.message);
  }

  const commonPreload = [
    global._.imports,
    extPreloadCode,                            // ← chrome.* API, первым
    global._.csp_coconut,
    buildInjectStylesFunction(BASE_CSS),
    global._.mainWindow_ipc,
    global._.desktop_ipc,
    global._.view_state_ipc,
    global._.react_devtools_backend,
    global._.devtools_ipc,
    global._.topbar_ipc,
  ].join('\n\n');

  const extensionsPreload = [
    global._.imports,
    extPreloadCode,
  ].join('\n\n');

  await createPreload('reactPreload', commonPreload, tmpDir);
  await createPreload('extensionsPreload', extensionsPreload, tmpDir);
}