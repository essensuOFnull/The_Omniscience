// Main.jsx
import React, { useState, useEffect, useReducer, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Desktop from './components/Desktop';
import { initialState } from './state/initialState';
import { windowManager, getNewId, getNewZ } from './state/windowManager';
import windowAnimations from './themes/window_animations'; // <-- импорт анимаций

const darkTheme = createTheme({
  mode: 'dark',
  background: { default: '#1a001a', paper: '#2a002a' },
  primary: { main: '#6f42c1' },
});

function Main() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const reducer = useCallback((state, action) => {
    if (!config) return state;
    const handler = windowManager[action.type];
    if (!handler) return state;
    // Передаём в хелперы также getNewId и getNewZ, но они уже импортированы
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
        const cfg = await window.electronAPI?.getConfig?.() ?? { taskbarHeight: 40, overviewColumns: 3, overviewGap: 16 };
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

  if (loading) {
    return <div style={{ color: '#ccc', background: '#1a001a', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Загрузка...</div>;
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Desktop state={state} actions={actions} config={config} animations={windowAnimations} />
    </ThemeProvider>
  );
}

const root = createRoot(document.querySelector('main'));
root.render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
);