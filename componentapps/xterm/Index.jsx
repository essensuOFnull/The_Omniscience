import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const TerminalComponent = () => {
  const containerRef = useRef(null);

  useEffect(() => {
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

    const api = window.electron_componentapp_xterm_API;

    if (!api) {
      console.warn('electron_componentapp_xterm_API не найден');
      term.writeln('Добро пожаловать в терминал!');
      term.writeln('(Для полноценной работы настройте preload)');
      return () => term.dispose();
    }

    // Слушаем данные от pty. offData — функция снятия подписки.
    const offData = api.on('terminal-data', (data) => {
      term.write(data);
    });

    // Отправляем ввод в pty.
    const dataDisposable = term.onData((data) => {
      api.send('terminal-input', data);
    });

    // Сообщаем стартовые размеры и запускаем shell.
    api.send('terminal-resize', { cols: term.cols, rows: term.rows });
    api.send('terminal-start');

    // Подгонка размеров при изменении окна.
    const handleResize = () => {
      fitAddon.fit();
      api.send('terminal-resize', { cols: term.cols, rows: term.rows });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);

      // Явно просим main убить pty. Основная уборка — на стороне main
      // через 'destroyed', но этот вызов помогает в 100% случаев.
      try { api.send('terminal-exit'); } catch (_) {}

      // Снимаем слушатель, чтобы не накапливались при ре-монтировании.
      offData?.();

      // Отписываемся от ввода.
      dataDisposable?.dispose();

      term.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        backgroundColor: '#1e1e1e',
      }}
    />
  );
};

import ReactDOM from 'react-dom/client';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<TerminalComponent />);