import React, { useEffect, useState } from 'react';
import { ThemeProvider, CssBaseline, Box, Typography } from '@mui/material';
import theme from './theme';
import Renderer from './components/Renderer';

export default function App() {
  const [frame, setFrame] = useState(null);
  const [status, setStatus] = useState('waiting');
  const windowId = window.gtkBridge?.windowId;

  useEffect(() => {
    if (!window.gtkBridge) {
      setStatus('no-bridge');
      return;
    }
    const off = window.gtkBridge.onFrame((f) => {
      setFrame(f);
      setStatus('live');
    });

    // Escape — закрыть окно
    const onKey = (e) => {
      if (e.key === 'Escape') window.gtkBridge.closeSelf();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      off && off();
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleActivate = (nodeId) => {
    window.gtkBridge?.send({ type: 'widget-activate', windowId, nodeId });
  };
  const handleSetValue = (nodeId, kind, value) => {
    window.gtkBridge?.send({ type: 'widget-set-value', windowId, nodeId, kind, value });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        bgcolor: '#1e1e2e',
        color: 'text.primary',
      }}>
        {frame ? (
          <Renderer
            frame={frame}
            onNodeActivate={handleActivate}
            onNodeSetValue={handleSetValue}
          />
        ) : (
          <Box sx={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Typography sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
              {status === 'no-bridge'
                ? 'No bridge — запусти через Electron, не браузер'
                : 'Waiting for frame…'}
            </Typography>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}