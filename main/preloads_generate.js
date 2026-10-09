import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

if (!global.paths) global.paths = {};

async function createPreload(key, content, tmpDir) {
  const fileName = `${key}.cjs`;
  const filePath = path.join(tmpDir, fileName);
  await writeFile(filePath, content, 'utf-8');
  global.paths[key] = filePath.replace(/\\/g, '/');
}

function buildInjectStylesFunction(css) {
  // Кодируем CSS в Base64, чтобы избежать проблем с кавычками
  const base64Css = Buffer.from(css).toString('base64');

  return [
    '(function () {',
    '  function injectAllStyles() {',
    '    if (!document.head) return false;',
    '    const style = document.createElement(\'style\');',
    '    style.textContent = atob(\'' + base64Css + '\');',
    '    document.head.appendChild(style);',
    '    return true;',
    '  }',
    '  // Пытаемся вставить сразу — иначе MutationObserver может никогда не сработать,',
    '  // если <head> уже существует на момент исполнения.',
    '  if (injectAllStyles()) return;',
    '  const headObserver = new MutationObserver(() => {',
    '    if (injectAllStyles()) headObserver.disconnect();',
    '  });',
    '  headObserver.observe(document.documentElement || document, { childList: true, subtree: true });',
    '})();'
  ].join('\n');
}

// === Безопасная генерация Stealth-кода: перехватываем evaluateOnNewDocument ===
async function buildStealthEvasionsBlock() {
  try {
    const evasionModules = [
      'chrome.app',
      'chrome.runtime',
      'chrome.csi',
      'chrome.loadTimes',
      'iframe.contentWindow',
      'navigator.webdriver'
    ];

    const collected = []; // сюда собираем все инжектируемые сниппеты

    const fakePage = {
      evaluateOnNewDocument(fnOrString, ...args) {
        if (typeof fnOrString === 'string') {
          collected.push(fnOrString);
        } else if (typeof fnOrString === 'function') {
          // Превращаем функцию в IIFE-строку; доп. args прокидываем как JSON
          const argList = args.map(a => JSON.stringify(a)).join(', ');
          collected.push(`(${fnOrString.toString()})(${argList});`);
        }
        return Promise.resolve();
      },
      // некоторые evasions могут дергать эти методы — заглушки
      evaluate: async () => undefined,
      evaluateHandle: async () => undefined,
      addScriptTag: async () => undefined,
      setBypassCSP: async () => undefined,
      setUserAgent: async () => undefined,
      browser: () => ({ userAgent: () => Promise.resolve('') }),
      _client: () => Promise.resolve({ send: async () => undefined })
    };

    for (const mod of evasionModules) {
    try {
      const plugin = require(`puppeteer-extra-plugin-stealth/evasions/${mod}`)();
      if (typeof plugin.onPageCreated !== 'function') continue;
      await plugin.onPageCreated(fakePage);   // ← вот эта строчка
    } catch (e) {
      console.warn(`[stealth] "${mod}" load failed:`, e.message);
    }
  }

    // onPageCreated у evasions обычно синхронный до первого await,
    // но на всякий случай дадим microtask-очереди прокрутиться нельзя —
    // сборка функции sync, поэтому просто проверим, что что-то собрали.
    const fullStealthCode = collected.join('\n;\n');

    if (!fullStealthCode) {
      console.warn('[stealth] Ни одной evasion собрать не удалось');
      return '/* Stealth: no evasions */';
    }

    console.log(`[stealth] Собрано ${collected.length} evasion-скриптов, ${fullStealthCode.length} байт`);

    const base64StealthCode = Buffer.from(fullStealthCode).toString('base64');

    return [
      '(() => {',
      '  try {',
      '    const { webFrame } = require(\'electron\');',
      '    const stealthCode = atob(\'' + base64StealthCode + '\');',
      '    webFrame.executeJavaScript(stealthCode);',
      '    console.log(\'[stealth] Evasions injected successfully via webFrame\');',
      '  } catch (err) {',
      '    console.error(\'[stealth] Failed to inject evasions in preload:\', err);',
      '  }',
      '})();'
    ].join('\n');
  } catch (err) {
    console.error('[stealth] Failed to build stealth scripts:', err.message);
    return '/* Stealth build failed */';
  }
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
    // Оборачиваем в IIFE, чтобы не падать, если chrome.* уже определён
    extPreloadCode = `(() => { if (typeof chrome === 'undefined') {\n${extPreloadCode}\n} })();`;
    console.log('[preloads] chrome-extensions preload loaded, size:', extPreloadCode.length);
  } catch (err) {
    console.error('[preloads] chrome-extensions preload not found:', err.message);
  }

  // Генерируем блок маскировки
  const stealthEvasionsCode = await buildStealthEvasionsBlock();

  const commonPreload = [
    global._.imports,
    extPreloadCode,                            // ← chrome.* API, первым
    stealthEvasionsCode,                       // ← Stealth-маскировка, применяется сразу на старте
    global._.csp_coconut,
    buildInjectStylesFunction(BASE_CSS),
    global._.mainWindow_ipc,
    global._.desktop_ipc,
    global._.view_state_ipc,
    global._.react_devtools_backend,
    global._.devtools_ipc,
    global._.topbar_ipc,
    global._.overview_ipc
  ]
    .filter(part => typeof part === 'string' && part.length > 0)
    .join('\n\n');

  const extensionsPreload = [
    global._.imports,
    extPreloadCode,
  ]
    .filter(part => typeof part === 'string' && part.length > 0)
    .join('\n\n');

  await createPreload('reactPreload', commonPreload, tmpDir);
  await createPreload('extensionsPreload', extensionsPreload, tmpDir);
}