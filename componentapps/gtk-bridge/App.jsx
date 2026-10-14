import React, { useEffect, useState } from 'react';
import { ThemeProvider, CssBaseline, Box, Typography } from '@mui/material';
import Renderer from './Renderer.jsx';

export default function App({ windowId }) {
  const [frame, setFrame] = useState(null);
  const gtkWindowId = new URLSearchParams(window.location.search).get('gtkWindowId');

  useEffect(() => {
    if (!window.gtkBridge) {
      console.warn('[gtk-bridge] window.gtkBridge is not defined');
      return;
    }
    console.log('[gtk-bridge] subscribing, expecting windowId =', gtkWindowId);

    const off = window.gtkBridge.onFrame((f) => {
      console.log('[gtk-bridge] frame received: windowId =', f.windowId,
        'root =', f.root ? 'yes' : 'null');
      if (f.windowId === gtkWindowId) setFrame(f);
    });

    const onKey = (e) => { if (e.key === 'Escape') window.gtkBridge.closeSelf(); };
    window.addEventListener('keydown', onKey);
    return () => { off && off(); window.removeEventListener('keydown', onKey); };
  }, [gtkWindowId]);

  return (
    <Box sx={{ position: 'fixed', inset: 0, overflow: 'hidden', bgcolor: '#1e1e2e' }}>
      {frame ? (
        <Renderer
          frame={frame}
          onNodeActivate={(nodeId) =>
            window.gtkBridge.send({ type: 'widget-activate', windowId: gtkWindowId, nodeId })
          }
          onNodeSetValue={(nodeId, kind, value) =>
            window.gtkBridge.send({ type: 'widget-set-value', windowId: gtkWindowId, nodeId, kind, value })
          }
        />
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Typography sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
            Waiting for GTK frame…
          </Typography>
        </Box>
      )}
    </Box>
  );
}