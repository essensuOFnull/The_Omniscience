import electronPkg from 'electron';
const { app, session } = electronPkg;

export default async function () {
  await app.whenReady();

  // Включаем Cross-Origin Isolation для всей сессии
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy': ['same-origin'],
        'Cross-Origin-Embedder-Policy': ['require-corp'],
      },
    });
  });
  
  // arkh_protocol уже в global.$ — autoimport его подобрал.
  global.$.arkh_protocol.setupArkhProtocol();

  global.desktopCounter = 0;
  global.$.theme_app_setFromConfig();
  global.$.userAgent_change();

  await global.$.texts_load();
  await global.$.preloads_generate();
  await global.$.extensions_setup();
  await global.$.adblock_init();
  await global.$.mainWindow_create();

  global.$.webContents_on_created();
}