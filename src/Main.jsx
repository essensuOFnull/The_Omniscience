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

// Создаём корни
const rootBackground = createRoot(document.getElementById('background-root'));
const rootTabBar = createRoot(document.getElementById('tabbar-root'));
const rootDesktop = createRoot(document.getElementById('desktop-root'));
const rootFrame = createRoot(document.getElementById('frame-root'));

// Рендерим
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

// Рендерим FrameHandler (не требует темы)
rootFrame.render(
  <React.StrictMode>
    <FrameHandler />
  </React.StrictMode>
);