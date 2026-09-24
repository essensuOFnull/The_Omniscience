// main/arkh_protocol.js
//
// Протокол arkh:// — способ отдавать файлы из корня игры
// в рендерер. Внешне неотличим от http: fetch работает,
// динамический import() работает, CORS разрешён.
//
//   arkh://voices/ru_RU-ruslan-medium.onnx
//     → {ROOT}/voices/ru_RU-ruslan-medium.onnx
//   arkh://wasm/ort-wasm-simd-threaded.wasm
//     → {ROOT}/voices/wasm/ort-wasm-simd-threaded.wasm
//
// Регистрация схемы — синхронно, статическим импортом в main.js.
// Обработчик — внутри whenReady, через global.$.arkh_protocol.
//
// — Архивариус

import electronPkg from 'electron';
const { protocol, net } = electronPkg;
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

// ESM: __dirname нет. Собираем руками.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ROOT — корень игры. main/ лежит в нём, значит на уровень выше.
const ROOT = path.resolve(__dirname, '..');
const VOICES_DIR = path.join(ROOT, 'voices');

// Куда какой hostname мапится.
const HOST_MAP = {
  voices: VOICES_DIR,
  wasm: path.join(VOICES_DIR, 'wasm'),
};

// ── Регистрация. Синхронно, из main.js. ──
export function registerArkhScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'arkh',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
  console.log('[arkh] схема зарегистрирована. ROOT =', ROOT);
}

// ── Обработчик. Внутри whenReady. ──
export function setupArkhProtocol() {
  console.log('[arkh] ROOT =', ROOT);
  console.log('[arkh] VOICES_DIR =', VOICES_DIR);
  console.log('[arkh] voices exists =', fs.existsSync(VOICES_DIR));
  console.log('[arkh] wasm exists =', fs.existsSync(path.join(VOICES_DIR, 'wasm')));

  protocol.handle('arkh', async (req) => {
    const url = new URL(req.url);
    const host = url.hostname;
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');

    const baseDir = HOST_MAP[host];
    if (!baseDir) {
      console.warn('[arkh] неизвестный host:', host);
      return new Response('unknown host', { status: 404 });
    }

    const filePath = path.resolve(baseDir, rel);

    // Защита от выхода за пределы базовой папки.
    if (!filePath.startsWith(baseDir + path.sep)) {
      console.warn('[arkh] запрещённый путь:', filePath);
      return new Response('forbidden', { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      console.warn('[arkh] не найдено:', filePath);
      return new Response('not found', { status: 404 });
    }

    console.log('[arkh]', req.url, '→', filePath);
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

// Дефолтный экспорт — чтобы autoimport положил в global.$.arkh_protocol
// сразу оба метода, а не разворачивал namespace.
export default {
  registerArkhScheme,
  setupArkhProtocol,
};