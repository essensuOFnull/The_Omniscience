import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const TerminalComponent = () => {
	const containerRef = useRef(null);
	const terminalRef = useRef(null);
	const fitAddonRef = useRef(null);

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

		terminalRef.current = term;
		fitAddonRef.current = fitAddon;

		const api = window.electron_componentapp_xterm_API;

		if (api) {
			api.on('terminal-data', (data) => {
				term.write(data);
			});

			term.onData((data) => {
				api.send('terminal-input', data);
			});

			// Отправляем начальные размеры
			api.send('terminal-resize', { cols: term.cols, rows: term.rows });

			// Запускаем shell
			api.send('terminal-start');
		} else {
			console.warn('electron_componentapp_xterm_API не найден');
			term.writeln('Добро пожаловать в терминал!');
			term.writeln('(Для полноценной работы настройте preload)');
		}

		const handleResize = () => {
			if (fitAddonRef.current && terminalRef.current) {
				fitAddonRef.current.fit();
				const t = terminalRef.current;
				if (api) {
					api.send('terminal-resize', { cols: t.cols, rows: t.rows });
				}
			}
		};

		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
			if (terminalRef.current) {
				terminalRef.current.dispose();
			}
			// Можно также отправить сигнал завершения, если нужно убить pty
			// if (api) api.send('terminal-exit');
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
				backgroundColor: '#1e1e1e',
			}}
		/>
	);
};

// Монтируем в #root
import ReactDOM from 'react-dom/client';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<TerminalComponent />);