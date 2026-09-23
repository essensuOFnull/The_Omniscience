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

// Базовая укладка — нужна всегда, независимо от темы
const BASE_CSS = `html, body { margin: 0; padding: 0; overflow: hidden; }`;

export default async function () {
  const tmpDir = path.join(global.paths.projectRoot, '.temp');
  await mkdir(tmpDir, { recursive: true });

  // Читаем цветовую схему (тема)
  const colorSchemeName = global.config.color_scheme || 'default';
  const schemePath = path.join(global.paths.projectRoot, 'themes', 'color_schemes', `${colorSchemeName}.css`);
  let schemeCSS;
  try {
    schemeCSS = await readFile(schemePath, 'utf-8');
    console.log(`[Preloads] Color scheme "${colorSchemeName}" loaded.`);
  } catch (err) {
    console.error(`[Preloads] Failed to load color scheme "${colorSchemeName}":`, err.message);
    schemeCSS = `/* fallback */ :root { color-scheme: dark; }`;
  }

  // Читаем ядро фильтра
  const coreTemplate = await readFile(
    path.join(global.paths.projectRoot, 'texts', 'css_filter_core.js'),
    'utf-8'
  );

  // ==== Тематизированный preload ====
  const themedInject = buildInjectStylesFunction(schemeCSS + '\n' + BASE_CSS);
  const themedFilter = coreTemplate
    .replace('/* __REGISTER_PROPERTIES__ */', '')
    .replace('/* __INJECT_STYLES__ */', themedInject);

  const themedPreload = [
    global._.imports,
    themedFilter,
    global._.mainWindow_ipc,
    global._.desktop_ipc,
  ].join('\n\n');

  // ==== Чистый preload (без темы) ====
  // Никакого css_filter_core — только базовая укладка, чтобы не было margin/scrollbar
  const cleanInject = buildInjectStylesFunction(BASE_CSS);

  const cleanPreload = [
    global._.imports,
    cleanInject,
    global._.mainWindow_ipc,
    global._.desktop_ipc,
  ].join('\n\n');

  await Promise.all([
    createPreload('reactPreload', themedPreload, tmpDir),
    createPreload('reactPreloadNoTheme', cleanPreload, tmpDir),
  ]);
}