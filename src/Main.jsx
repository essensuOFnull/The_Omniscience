import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Desktop from './components/Desktop';
import FrameHandler from './components/FrameHandler';
import BackgroundRenderer from './components/BackgroundRenderer';
import ThemeApplier from './components/ThemeApplier';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#1a001a', paper: '#2a002a' },
    primary: { main: '#6f42c1' },
  },
});

document.addEventListener('DOMContentLoaded', () => {
  const bgEl      = document.getElementById('background-root');
  const desktopEl = document.getElementById('desktop-root');
  const frameEl   = document.getElementById('frame-root');
  const barEl     = document.getElementById('desktopbar-root');

  if (!bgEl || !desktopEl || !frameEl) {
    console.error('Не найдены контейнеры');
    return;
  }

  // Фон — отдельное дерево, изолировано от темы фильтра
  createRoot(bgEl).render(
    <React.StrictMode>
      <div className="ignore_The_Omniscience_Theme_recursive" style={{display:'contents'}}>
        <ThemeProvider theme={darkTheme}>
          <ThemeApplier />
          <BackgroundRenderer />
        </ThemeProvider>
      </div>
    </React.StrictMode>
  );

  createRoot(desktopEl).render(
    <React.StrictMode>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Desktop rootBar={createRoot(barEl)} />
      </ThemeProvider>
    </React.StrictMode>
  );

  createRoot(frameEl).render(
    <React.StrictMode>
      <ThemeProvider theme={darkTheme}>
        <FrameHandler />
      </ThemeProvider>
    </React.StrictMode>
  );
});