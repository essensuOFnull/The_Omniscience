import React from 'react';
import { createRoot } from 'react-dom/client';
import DevToolsApp from './DevToolsApp.jsx';

const params = new URLSearchParams(window.location.search);
const windowId = params.get('windowId') || '';

createRoot(document.getElementById('root')).render(
  <DevToolsApp windowId={windowId} />
);