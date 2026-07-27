import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Background from './components/Background';
import TabBar from './components/TabBar';
import Desktop from './components/Desktop';
import FrameHandler from './components/FrameHandler';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#1a001a', paper: '#2a002a' },
    primary: { main: '#6f42c1' },
  },
});

// Ждём полной загрузки DOM, прежде чем создавать корни и рендерить
document.addEventListener('DOMContentLoaded', () => {
  // Проверяем наличие контейнеров (опционально)
  const bgEl = document.getElementById('background-root');
  const tabEl = document.getElementById('tabbar-root');
  const desktopEl = document.getElementById('desktop-root');
  const frameEl = document.getElementById('frame-root');

  if (!bgEl || !tabEl || !desktopEl || !frameEl) {
    console.error('Не найдены все необходимые контейнеры в DOM');
    return;
  }

  const rootBackground = createRoot(bgEl);
  const rootTabBar = createRoot(tabEl);
  const rootDesktop = createRoot(desktopEl);
  const rootFrame = createRoot(frameEl);

  rootBackground.render(<Background />);

  rootTabBar.render(
    <React.StrictMode>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <TabBar />
      </ThemeProvider>
    </React.StrictMode>
  );

  rootDesktop.render(
    <React.StrictMode>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Desktop />
      </ThemeProvider>
    </React.StrictMode>
  );

  rootFrame.render(
    <React.StrictMode>
      <FrameHandler />
    </React.StrictMode>
  );
});