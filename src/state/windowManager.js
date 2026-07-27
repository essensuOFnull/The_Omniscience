import * as allActions from './windowManager/actions/index';
import * as helpers from './windowManager/helpers';
import { initialState } from './windowManager/initialState';

// Собираем объект windowManager из всех экшенов
const windowManager = {
  ...allActions,
  // также можно добавить вспомогательные функции, если они нужны снаружи
  getNewId: helpers.getNewId,
  getNewZ: helpers.getNewZ,
  resetCounters: helpers.resetCounters,
};

export default windowManager;

// Экспортируем helpers на случай, если понадобятся отдельно
export { initialState,windowManager };