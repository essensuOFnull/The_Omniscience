import electronPkg from 'electron';
const { app } = electronPkg;
import { restoreWindowsShellForAutostart } from './ipc_nativeWindows.js';

export default async function () {
  await app.whenReady();
  if (process.platform === 'win32') {
    await restoreWindowsShellForAutostart();
  }

  await global.$.texts_load();
  global.$.arkh_protocol.setupArkhProtocol();

  await global.$.preloads_generate();
  await global.$.extensions_setup();
  await global.$.ipc_setup();
  await global.$.loadComponentIpc();
}