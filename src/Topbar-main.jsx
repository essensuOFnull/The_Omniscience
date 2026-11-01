import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import TopBarContainer from './components/TopBarContainer';
import ShellErrorBoundary from './components/ShellErrorBoundary';

document.addEventListener('DOMContentLoaded', () => {
  const api = window.electron_topbar_API;
  const reportFailure = (message) => {
    try { api?.send('shell-session:renderer-error', { message }); }
    catch (error) { console.error('[shell-session] failed to report startup error:', error); }
  };
  window.addEventListener('error', (event) => {
    reportFailure(event.error?.stack || event.message || 'TopBar renderer error');
  });
  window.addEventListener('unhandledrejection', (event) => {
    reportFailure(event.reason?.stack || event.reason?.message || String(event.reason));
  });

  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      background: { default: '#1a001a', paper: '#2a002a' },
      primary: { main: '#6f42c1' },
    },
  });

  const rootElement = document.getElementById('TopBar-root');
  if (!rootElement) {
    reportFailure('TopBar root element is missing');
    return;
  }

  createRoot(rootElement).render(
    <React.StrictMode>
      <ShellErrorBoundary>
        <ThemeProvider theme={darkTheme}>
          <CssBaseline />
          <TopBarContainer />
        </ThemeProvider>
      </ShellErrorBoundary>
    </React.StrictMode>
  );
});