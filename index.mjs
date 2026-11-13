import electronPkg from 'electron';
const { app, dialog, ipcMain } = electronPkg;

import { registerArkhScheme } from './main/arkh_protocol.js';
import autoimport from './main/autoimport.js';
import paths from './main/paths.js';
import { parseLauncherCommand } from './main/launcherCommands.js';
import { buildAppsList } from './main/ipc_getAppsList.js';
import { createWindowByRequest } from './main/ipc_windowManager.js';
import { resolveAppPreload } from './main/preloads_generate.js';
import { syncLauncherShortcuts } from './main/launcherShortcuts.js';

registerArkhScheme();

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  let dispatchCommand = null;
  const pendingCommands = [];

  app.on('second-instance', (_event, argv) => {
    if (dispatchCommand) dispatchCommand(argv);
    else pendingCommands.push(argv);
  });

  async function launchApp(appType, appId) {
    if (appType === 'componentapp') await global.$.vite_build();

    const apps = await buildAppsList();
    const target = apps.find((item) => item.type === appType && item.id === appId);
    if (!target) throw new Error(`Omniscience app not found: ${appType}/${appId}`);
    const preload = appType === 'componentapp'
      ? await resolveAppPreload(target.preloadPath)
      : undefined;

    createWindowByRequest({
      id: `launcher:${appType}:${appId}`,
      appId,
      url: target.url,
      preload,
      title: target.title,
      icon: target.icon,
    });
  }

  async function handleCommand(args) {
    const command = parseLauncherCommand(args);
    if (command.type === 'quit') {
      app.quit();
      return;
    }
    if (command.type === 'invalid') {
      throw new Error(command.reason);
    }
    if (command.type === 'launch-app') {
      await launchApp(command.appType, command.appId);
    }
  }

  (async () => {
    const initialCommand = parseLauncherCommand(process.argv);
    if (initialCommand.type === 'quit') {
      app.quit();
      return;
    }

    paths();
    await autoimport();
    global.$.log('Запуск Omniscience Launcher');
    global.$.config_load();

    await global.$.app_on_ready();
    await syncLauncherShortcuts(await buildAppsList(), global.paths.distributionRoot);

    dispatchCommand = (args) => {
      handleCommand(args).catch((error) => {
        console.error('[launcher] command failed:', error);
        dialog.showErrorBox('Omniscience Launcher', error.message);
      });
    };

    if (initialCommand.type !== 'background') {
      await handleCommand(process.argv);
    }
    for (const args of pendingCommands.splice(0)) dispatchCommand(args);
  })().catch((error) => {
    console.error('[launcher] startup failed:', error);
    if (app.isReady()) dialog.showErrorBox('Omniscience Launcher', error.message);
    app.quit();
  });
}

ipcMain.on('get-project-root', (event) => {
  event.returnValue = app.getAppPath();
});