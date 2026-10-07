import React, { useEffect, useState, useCallback } from 'react';
import { Box } from '@mui/material';
import TopBar from './TopBar';
import Overview from './Overview';

export default function TopBarContainer() {
  const [state, setState] = useState({
    windows: [],
    apps: [],
    overviewTabs: [],
    showWindowList: true,
    showClock: true,
    showClockMs: false,
    mode: 'normal',
  });
  const [overviewTab, setOverviewTab] = useState(null);

  useEffect(() => {
    const api = window.electron_topbar_API;
    if (!api) return;

    api.invoke('topbar:get-state')
      .then((s) => {
        if (!s) return;
        setState((p) => ({ ...p, ...s }));
        if (!overviewTab && s.overviewTabs?.length) {
          setOverviewTab(s.overviewTabs[0].id);
        }
      })
      .catch(() => {});

    const off = api.on('topbar:state-update', (patch) => {
      if (patch) setState((p) => ({ ...p, ...patch }));
    });
    return off;
  }, []);

  const send = useCallback((ch, data) => window.electron_topbar_API?.send(ch, data), []);

  const setMode = useCallback((mode) => {
    send('topbar:set-mode', { mode });
    setState((p) => ({ ...p, mode }));
  }, [send]);

  const isOverview = state.mode === 'overview';
  const toggleOverview = () => setMode(isOverview ? 'normal' : 'overview');

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden',bgcolor: 'rgba(0,0,0,0.6)' }}>
      {/* TopBar фиксированной высоты */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 72, zIndex: 2 }}>
        <TopBar
          {...state}
          onToggleOverview={toggleOverview}
          onOpenDevTools={(id) => send('topbar:open-devtools', { id })}
          onLaunch={(app) => send('topbar:launch-app', { app })}
          onAddQuickLaunch={() => send('topbar:open-launcher')}
          onFocusWindow={(w) => send('topbar:focus-window', { id: w.id })}
          onCloseWindow={(w) => send('topbar:close-window', { id: w.id })}
          onRequestSearch={() => send('topbar:open-search')}
          onRequestSettings={() => send('topbar:open-settings')}
        />
      </Box>

      {/* Overview поверх всего, ниже TopBar'а */}
      <Overview
        isOpen={isOverview}
        activeTabId={overviewTab}
        onTabChange={setOverviewTab}
        onClose={() => setMode('normal')}
        apps={state.apps || []}
        tabsConfig={state.overviewTabs || []}
        parentWindowId="topbar"
      />
    </Box>
  );
}