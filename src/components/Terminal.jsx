import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css'; // Импорт стилей

const TerminalComponent = () => {
  const containerRef = useRef(null);
  const terminalRef = useRef(null);
  const fitAddonRef = useRef(null);

  useEffect(() => {
    // Инициализация терминала
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Открываем терминал в контейнере
    term.open(containerRef.current);
    fitAddon.fit();

    // Сохраняем ссылки для очистки
    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // --- Настройка связи с бэкендом через preload ---
    // Пример: если в preload проброшен window.electron_terminal_API
    if (window.electron_terminal_API) {
      // Получаем данные от основного процесса (например, вывод команды)
      window.electron_terminal_API.on('terminal-data', (data) => {
        term.write(data);
      });

      // Отправляем ввод пользователя в основной процесс
      term.onData((data) => {
        window.electron_terminal_API.send('terminal-input', data);
      });

      // Запрос на запуск оболочки (bash/cmd) после инициализации
      window.electron_terminal_API.send('terminal-start');
    } else {
      console.warn('electron_terminal_API не найден — возможно, preload не настроен');
      // Для локального теста можно вывести приветствие
      term.writeln('Добро пожаловать в терминал!');
      term.writeln('(Для полноценной работы настройте preload)');
    }

    // --- Обработка изменения размера окна ---
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };
    window.addEventListener('resize', handleResize);

    // Очистка при размонтировании
    return () => {
      window.removeEventListener('resize', handleResize);
      if (terminalRef.current) {
        terminalRef.current.dispose();
      }
    };
  }, []); // Пустой массив зависимостей — запускаем один раз

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#1e1e1e',
      }}
    />
  );
};

export default TerminalComponent;