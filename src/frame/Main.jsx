import React from 'react';
import ReactDOM from 'react-dom/client';
import PanelContainer from './PanelContainer.jsx';

const params = new URLSearchParams(window.location.search);
const windowId = params.get('windowId') || '';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PanelContainer windowId={windowId} />
  </React.StrictMode>
);