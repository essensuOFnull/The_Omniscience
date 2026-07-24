import electronPkg from 'electron';
const{app}=electronPkg;

export default async function() {
  await app.whenReady();
  global.tabs = [];
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
