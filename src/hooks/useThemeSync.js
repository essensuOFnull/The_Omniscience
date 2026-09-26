import { useEffect, useRef } from 'react';
import { settingsStore } from '../settings/store';

export default function useThemeSync() {
  const prevRef = useRef(null);

  useEffect(() => {
    const api = window.electron_desktop_API;
    if (!api) return;

    const initial = settingsStore.getState();
    prevRef.current = {
      themeEnabled: initial.themeEnabled,
      themeColors: initial.themeColors,
    };

    // На случай, если тема уже была выключена до того, как shell поднялся —
    // сообщаем main'у актуальное состояние, чтобы preload'ы выбрались правильно.
    api.send('theme:enabled-changed', !!initial.themeEnabled);
    api.invoke('theme:broadcast', {
      enabled: !!initial.themeEnabled,
      colors: initial.themeColors,
    });

    const unsubscribe = settingsStore.subscribe(() => {
      const next = settingsStore.getState();
      const prev = prevRef.current || {};

      if (next.themeEnabled !== prev.themeEnabled) {
        api.send('theme:enabled-changed', !!next.themeEnabled);
      }

      if (next.themeColors !== prev.themeColors) {
        api.invoke('theme:broadcast', {
          enabled: !!next.themeEnabled,
          colors: next.themeColors,
        });
      }

      prevRef.current = {
        themeEnabled: next.themeEnabled,
        themeColors: next.themeColors,
      };
    });

    return unsubscribe;
  }, []);
}