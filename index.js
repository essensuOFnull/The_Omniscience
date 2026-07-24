import autoimport from './main/autoimport.js';

import paths from './main/paths.js'

(async () => {
  paths();

  await autoimport();

  global.$.log('Запуск приложения');

  global.$.config_load();

  // 1. Сборка всех приложений (включая сам Desktop)
  await global.$.vite_build();

  // 2. Обработчики закрытия
  global.$.app_on_close();
  global.$.app_on_beforeQuit();
  global.$.app_on_willQuit();

  // 3. app_on_ready сам дождётся готовности и создаст окно
  await global.$.app_on_ready();

  global.$.log('Приложение полностью запущено');
})();
