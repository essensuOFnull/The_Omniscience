import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

async function createPreload(key, content, tmpDir) {
  const fileName = `${key}.cjs`;
  const filePath = path.join(tmpDir, fileName);
  await writeFile(filePath, content, 'utf-8');
  global.paths[key] = filePath.replace(/\\/g, '/');
}

function buildInjectStylesFunction(css) {
  return `
function injectAllStyles() {
  if (!document.head) return false;
  const style = document.createElement('style');
  style.textContent = \`${css.replace(/`/g, '\\`')}\`;
  document.head.appendChild(style);
  return true;
}
if (!injectAllStyles()) {
  const headObserver = new MutationObserver(() => {
    if (injectAllStyles()) headObserver.disconnect();
  });
  headObserver.observe(document.documentElement || document, { childList: true, subtree: true });
}`;
}

const BASE_CSS = `
html::before {
  content: ""!important;
  position: fixed!important; /* Фиксирует рамку относительно экрана */
  top: 0!important;
  left: 0!important;
  right: 0!important;
  bottom: 0!important;
  pointer-events: none!important; /* Чтобы рамка не мешала кликать по элементам под ней */
  z-index: 9999!important; /* Выносит рамку на самый верхний слой */
  border:1px dashed cyan!important;
}`;

export default async function () {
  const tmpDir = path.join(global.paths.projectRoot, '.temp');
  await mkdir(tmpDir, { recursive: true });

  const colorSchemeName = global.config.color_scheme || 'default';
  const schemePath = path.join(global.paths.projectRoot, 'themes', 'color_schemes', `${colorSchemeName}.css`);
  let schemeCSS;
  try {
    schemeCSS = await readFile(schemePath, 'utf-8');
  } catch (err) {
    console.error(`[Preloads] Failed to load color scheme "${colorSchemeName}":`, err.message);
    schemeCSS = `:root { color-scheme: dark; }`;
  }

  const coreTemplate = await readFile(
    path.join(global.paths.projectRoot, 'texts', 'css_filter_core.js'),
    'utf-8'
  );

  const themedInject = buildInjectStylesFunction(schemeCSS + '\n' + BASE_CSS);
  const themedFilter = coreTemplate
    .replace('/* __REGISTER_PROPERTIES__ */', '')
    .replace('/* __INJECT_STYLES__ */', themedInject);

  const themedPreload = [
    global._.imports,
    themedFilter,
    global._.mainWindow_ipc,
    global._.desktop_ipc,
    global._.view_state_ipc,
    global._.panel_ipc,
  ].join('\n\n');

  const cleanInject = buildInjectStylesFunction(BASE_CSS);

  const cleanPreload = [
    global._.imports,
    cleanInject,
    global._.mainWindow_ipc,
    global._.desktop_ipc,
    global._.view_state_ipc,
    global._.panel_ipc,
  ].join('\n\n');

  await Promise.all([
    createPreload('reactPreload', themedPreload, tmpDir),
    createPreload('reactPreloadNoTheme', cleanPreload, tmpDir),
  ]);
}