import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Background from './components/Background';
import DesktopBar from './components/DesktopBar';
import Desktop from './components/Desktop';
import FrameHandler from './components/FrameHandler';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#1a001a', paper: '#2a002a' },
    primary: { main: '#6f42c1' },
  },
});

// Компонент-обёртка для управления Bar и Desktop
function DesktopManager({ rootBar }) {
  return (
    <Desktop rootBar={rootBar} />
  );
}

// Ждём полной загрузки DOM, прежде чем создавать корни и рендерить
document.addEventListener('DOMContentLoaded', () => {
  // Проверяем наличие контейнеров (опционально)
  const bgEl = document.getElementById('background-root');
  const barEl = document.getElementById('desktopbar-root');
  const desktopEl = document.getElementById('desktop-root');
  const frameEl = document.getElementById('frame-root');

  if (!bgEl || !barEl || !desktopEl || !frameEl) {
    console.error('Не найдены все необходимые контейнеры в DOM');
    return;
  }

  const rootBackground = createRoot(bgEl);
  const rootBar = createRoot(barEl);
  const rootDesktop = createRoot(desktopEl);
  const rootFrame = createRoot(frameEl);

  rootBackground.render(<Background />);

  rootDesktop.render(
    <React.StrictMode>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <DesktopManager rootBar={rootBar} />
      </ThemeProvider>
    </React.StrictMode>
  );

  rootFrame.render(
    <React.StrictMode>
      <FrameHandler />
    </React.StrictMode>
  );
});