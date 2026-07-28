(function () {
	contextBridge.exposeInMainWorld('electron_componentapp_xterm_API', {
		createTerminal: (containerId) => {
			const el = document.getElementById(containerId);
			if (!el) return;

			const term = new Terminal({
				cursorBlink: true,
				theme: { background: '#000000' }
			});

			const fitAddon = new FitAddon();
			term.loadAddon(fitAddon);

			term.open(el);

			fitAddon.fit();

			const dims = fitAddon.proportialDimensions;
			if (dims) {
				ipcRenderer.send('terminal-resize', { cols: term.cols, rows: term.rows });
			}

			window.addEventListener('resize', () => {
				fitAddon.fit();
				ipcRenderer.send('terminal-resize', { cols: term.cols, rows: term.rows });
			});

			ipcRenderer.on('terminal-incoming-data', (event, data) => {
				term.write(data);
			});

			term.onData((data) => ipcRenderer.send('terminal-out-data', data));
		}
	});
})();