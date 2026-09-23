import { useSyncExternalStore } from 'react';
import { settingsStore } from './store';

export function useSettings() {
  return useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getState,
    settingsStore.getState,
  );
}

export function useSetting(path) {
  const settings = useSettings();
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), settings);
}