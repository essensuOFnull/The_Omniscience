import electronPkg from 'electron';
const { app } = electronPkg;

// ── Статический импорт. Синхронный. До любого await.
// Именно поэтому arkh_protocol минует autoimport:
// ready может выстрелить раньше, чем autoimport отработает.
import { registerArkhScheme } from './main/arkh_protocol.js';

import autoimport from './main/autoimport.js';
import paths from './main/paths.js';

// Регистрируем сразу. Тут нет await — управление не уходит,
// ready ещё не испущен.
registerArkhScheme();

(async () => {
  paths();
  await autoimport();

  global.$.log('Запуск приложения');
  global.$.config_load();

  await global.$.vite_build();

  global.$.app_on_close();
  global.$.app_on_beforeQuit();
  global.$.app_on_willQuit();

  await global.$.app_on_ready();
  global.$.log('Приложение полностью запущено');
})();