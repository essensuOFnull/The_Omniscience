import React, { useLayoutEffect, useRef, useCallback } from 'react';
import { Box } from '@mui/material';
import Taskbar from './Taskbar';
import Overview from './Overview';
import Window from './Window';
import windowAnimations from '../themes/window_animations';

export default function DesktopWorkspace({ desktopId, state, actions, config, apps, active }) {
  const viewportRef = useRef(null);
  const desktopState = state.desktops[desktopId];
  const { windows, isOverviewOpened } = desktopState || { windows: {}, isOverviewOpened: false };

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el || !actions.setViewport) return;
    const update = () => actions.setViewport(desktopId, el.getBoundingClientRect());
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [desktopId, actions]);

  const toggleOverview = useCallback(() => {
    if (isOverviewOpened) actions.closeOverview(desktopId);
    else actions.openOverview(desktopId);
  }, [desktopId, isOverviewOpened, actions]);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: active ? 'flex' : 'none',
        flexDirection: 'column',
        bgcolor: 'transparent',
        overflow: 'hidden',
        zIndex: active ? 1 : 0,
      }}
    >
      <Box
        ref={viewportRef}
        sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}
        onClick={(e) => { if (e.target === e.currentTarget) actions.focusWindow(desktopId, null); }}
      >
        <Overview state={{ ...desktopState, windows }} actions={actions} config={config} apps={apps} desktopId={desktopId} />
        {Object.entries(windows || {}).map(([id, win]) => {
          const app = apps.find(a => a.id === win.appId) || null;
          return (
            <Window
              key={id}
              windowId={id}
              app={app}
              state={{ ...desktopState, windows }}
              actions={actions}
              config={config}
              animations={windowAnimations}
              desktopId={desktopId}
            />
          );
        })}
      </Box>
      <Taskbar
        state={{ ...desktopState, windows }}
        actions={actions}
        config={config}
        menuButtonClick={toggleOverview}
        apps={apps}
        desktopId={desktopId}
      />
    </Box>
  );
}