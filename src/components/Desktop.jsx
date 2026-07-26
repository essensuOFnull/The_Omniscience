import React, { useState, useLayoutEffect, useRef, useCallback, useEffect, useReducer, useMemo } from 'react';
import { Box } from '@mui/material';
import Taskbar from './Taskbar';
import Overview from './Overview';
import Window from './Window';
import { initialState } from '../state/initialState';
import { windowManager, getNewId, getNewZ } from '../state/windowManager';
import windowAnimations from '../themes/window_animations';

const TAB_BAR_HEIGHT = 35;

export default function Desktop() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const viewportRef = useRef(null);

  const reducer = useCallback((state, action) => {
    if (!config) return state;
    const handler = windowManager[action.type];
    if (!handler) return state;
    return handler(state, action.payload, { config, getNewId, getNewZ });
  }, [config]);

  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = useMemo(() => {
    const result = {};
    for (const type of Object.keys(windowManager)) {
      result[type] = (...payload) => dispatch({ type, payload });
    }
    return result;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const cfg = await window.electron_desktop_API?.getConfig?.() ?? { taskbarHeight: 40, overviewColumns: 3, overviewGap: 16 };
        if (!cancelled) {
          setConfig(cfg);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const { windows, isOverviewOpened } = state;
  const [apps, setApps] = useState([]);

  useEffect(() => {
    window.electron_desktop_API?.getAppsList?.().then(setApps).catch(() => {});
  }, []);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el || !actions.setViewport) return;
    const update = () => actions.setViewport(el.getBoundingClientRect());
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [actions]);

  const toggleOverview = useCallback(() => {
    if (isOverviewOpened) actions.closeOverview?.();
    else actions.openOverview?.();
  }, [isOverviewOpened, actions]);

  if (loading) {
    return <div style={{ color: '#ccc', background: '#1a001a', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Загрузка...</div>;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: TAB_BAR_HEIGHT,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'transparent',
        overflow: 'hidden',
      }}
    >
      <Box
        id="viewport"
        ref={viewportRef}
        sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}
        onClick={(e) => { if (e.target === e.currentTarget) actions.focusWindow?.(null); }}
      >
        <Overview state={state} actions={actions} config={config} apps={apps} />
        {Object.entries(windows || {}).map(([id, win]) => {
          const app = apps.find(a => a.id === win.appId) || null;
          return (
            <Window key={id} windowId={id} app={app} state={state} actions={actions} config={config} animations={windowAnimations} />
          );
        })}
      </Box>
      <Taskbar state={state} actions={actions} config={config} menuButtonClick={toggleOverview} apps={apps} />
    </Box>
  );
}