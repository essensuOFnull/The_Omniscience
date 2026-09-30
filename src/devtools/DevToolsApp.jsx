import React, { useEffect, useRef, useState } from 'react';

import DevToolsPanel from './DevToolsPanel.jsx';

let frontendModule = null;
try {
  frontendModule = require('react-devtools-inline/frontend');
} catch (e) {
  console.error('[RTD-frontend] failed to require frontend:', e);
}

export default function DevToolsApp({ windowId }) {
  const [DevTools, setDevTools] = useState(null);
  const [initError, setInitError] = useState(null);
  const bridgeRef = useRef(null);

  const params = new URLSearchParams(window.location.search);
  const viewId = params.get('viewId') || '';

  useEffect(() => {
    if (!windowId) return;
    const api = window.electron_devtools_API;
    if (!api) return;
    api.send('rtd:frontend-register', { windowId });
    return () => api.send('rtd:frontend-unregister', { windowId });
  }, [windowId]);

  useEffect(() => {
    if (!frontendModule) { setInitError('frontend module not loaded'); return; }
    const api = window.electron_devtools_API;
    if (!api || !windowId) return;

    try {
      const wall = {
        listen(fn) {
          const ch = 'rtd:main-to-frontend-' + windowId;
          const h = (m) => fn(m);
          api.on(ch, h);
          return () => api.removeListener(ch, h);
        },
        send(event, payload) {
          api.send('rtd:frontend-to-main', { windowId, event, payload });
        },
      };
      const bridge = frontendModule.createBridge(window, wall);
      bridgeRef.current = bridge;

      const Component = frontendModule.initialize(window, { bridge });
      setDevTools(() => Component);
    } catch (e) {
      console.error('[RTD-frontend] init failed:', e);
      setInitError(String(e?.message || e));
    }
  }, [windowId]);

  if (initError) return <div style={{ padding: 24, color: '#ff8888' }}>{initError}</div>;
  if (!DevTools) return <div style={{ width: '100%', height: '100%' }} />;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#232323' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
        <div>
          {viewId && <DevToolsPanel viewId={viewId} />}
        </div>
        <div style={{height:'100%'}}>
          <DevTools
            bridge={bridgeRef.current}
            showTabBar={true}
            defaultTab="components"
          />
        </div>
      </div>
    </div>
  );
}