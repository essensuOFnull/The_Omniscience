import { useSyncExternalStore } from 'react';
import { settingsStore } from './store';

export function useSettings() {
  return useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getState,
    settingsStore.getState,
  );
}

export function useSetting(path, fallback) {
  const settings = useSettings();
  const value = path.split('.').reduce((obj, k) => obj?.[k], settings);
  return value === undefined ? fallback : value;
}