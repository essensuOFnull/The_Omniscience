import React, { useEffect, useState, useCallback } from 'react';
import { Box } from '@mui/material';
import TopBar from './TopBar';

export default function TopBarContainer() {
  const [state, setState] = useState({
    windows: [],
    apps: [],
    overviewTabs: [],
    showWindowList: true,
    showClock: true,
    showClockMs: false,
    overviewOpen: false,
    windowsShellMode: false,
    shellSwitchAvailable: false,
  });

  useEffect(() => {
    const api = window.electron_topbar_API;
    if (!api) return;

    api.invoke('topbar:get-state')
      .then((s) => {
        if (s) setState((p) => ({ ...p, ...s }));
      })
      .catch(() => {});

    const off = api.on('topbar:state-update', (patch) => {
      if (patch) setState((p) => ({ ...p, ...patch }));
    });
    return off;
  }, []);

  const send = useCallback(
    (ch, data) => window.electron_topbar_API?.send(ch, data),
    [],
  );

  const toggleWindowsShell = useCallback(async () => {
    const api = window.electron_topbar_API;
    try {
      const result = await api?.invoke('topbar:toggle-user-shell');
      if (typeof result?.shellMode === 'boolean') {
        setState((previous) => ({ ...previous, windowsShellMode: result.shellMode }));
      }
    } catch (error) {
      api?.send('shell-session:renderer-error', {
        message: `Shell toggle failed: ${error?.stack || error?.message || error}`,
      });
    }
  }, []);

  return (
    <Box sx={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <TopBar
        {...state}
        onToggleOverview={() => send('topbar:toggle-overview')}
        onOpenWindowSettings={(id) => send('topbar:open-window-settings', { id })}
        onLaunch={(app) => send('topbar:launch-app', { app })}
        onAddQuickLaunch={() => send('topbar:open-launcher')}
        onFocusWindow={(w) => send('topbar:focus-window', { id: w.id })}
        onCloseWindow={(w) => send('topbar:close-window', { id: w.id })}
        onRequestSearch={() => send('topbar:open-search')}
        onRequestSettings={() => send('topbar:open-settings')}
        onRequestLogout={() => send('topbar:logout')}
        onToggleWindowsShell={toggleWindowsShell}
      />
    </Box>
  );
}