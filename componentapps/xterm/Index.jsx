import React from 'react';
import ReactDOM from 'react-dom/client';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const TerminalComponent = () => {
  const containerRef = React.useRef(null);
  const terminalRef = React.useRef(null);
  const fitAddonRef = React.useRef(null);

  React.useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#000000',
        foreground: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    if (window.electron_componentapp_xterm_API) {
      window.electron_componentapp_xterm_API.on('terminal-data', (data) => {
        term.write(data);
      });

      term.onData((data) => {
        window.electron_componentapp_xterm_API.send('terminal-input', data);
      });

      window.electron_componentapp_xterm_API.send('terminal-start');
    } else {
      console.warn('electron_componentapp_xterm_API не найден');
      term.writeln('Добро пожаловать в терминал!');
      term.writeln('(Для полноценной работы настройте preload)');
    }

    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (terminalRef.current) {
        terminalRef.current.dispose();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#000000',
      }}
    />
  );
};

// ✅ Монтируем компонент в #root
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<TerminalComponent />);