// hooks/useTaskbar.js
import { useMemo, useCallback } from 'react';

export default function useTaskbar(state, actions) {
  const windowsArray = useMemo(() => {
    return Object.entries(state.windows || {})
      .filter(([id, win]) => !win.closing)
      .map(([id, win]) => ({ id, ...win }));
  }, [state.windows]);

  const maxZ = useMemo(() => {
    let max = -Infinity;
    for (const w of windowsArray) {
      if (w.z > max) max = w.z;
    }
    return max;
  }, [windowsArray]);

  const handleTaskbarClick = useCallback((win, e) => {
    if (win.minimized) {
      actions.unminimizeWindow(win.id);
    } else {
      actions.focusWindow(win.id);
    }
  }, [actions]);

  return { windowsArray, maxZ, handleTaskbarClick };
}