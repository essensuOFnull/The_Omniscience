import * as allActions from './actions/index';
import * as helpers from './helpers';
import { initialState } from './initialState';

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