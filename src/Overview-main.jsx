import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import OverviewContainer from './components/OverviewContainer';

document.addEventListener('DOMContentLoaded', () => {
  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      background: { default: '#1a001a', paper: '#2a002a' },
      primary: { main: '#6f42c1' },
    },
  });

  createRoot(document.getElementById('Overview-root')).render(
    <React.StrictMode>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <OverviewContainer />
      </ThemeProvider>
    </React.StrictMode>
  );
});