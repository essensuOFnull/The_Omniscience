import electronPkg from 'electron';
const { app, session } = electronPkg;

export default async function () {
  await app.whenReady();

  app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

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
  await global.$.extensions_setup();
  await global.$.preloads_generate();
  //await global.$.adblock_init();
  await global.$.TopBar_create();
  await global.$.mainWindow_create();
  await global.$.ipc_setup();
}