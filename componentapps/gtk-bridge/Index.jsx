import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

const params = new URLSearchParams(window.location.search);
const windowId = params.get('windowId') || '';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App windowId={windowId} />
  </React.StrictMode>
);