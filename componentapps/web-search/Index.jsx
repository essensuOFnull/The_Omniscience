import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App
      windowId={window.__APP_WINDOW_ID__}
      desktopId={new URLSearchParams(window.location.search).get('desktopId') || ''}
    />
  </React.StrictMode>
);