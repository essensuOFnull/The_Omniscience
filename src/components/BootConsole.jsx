import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export function BootConsole() {
    const ref = useRef(null);

    useEffect(() => {
        const term = new Terminal({
            fontFamily: 'Terminus, monospace',
            fontSize: 16,
            theme: { background: '#000000', foreground: '#ffffff' },
            convertEol: true,       // \n → \r\n на стороне xterm.js
            cursorBlink: false,
            disableStdin: true,     // пока только смотрим
            scrollback: 20000,
        });
        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(ref.current);
        fit.fit();

        window.omniscience.onConsoleData(chunk => term.write(chunk));
        window.omniscience.consoleReady();

        const ro = new ResizeObserver(() => fit.fit());
        ro.observe(ref.current);

        return () => {
            ro.disconnect();
            term.dispose();
        };
    }, []);

    return (
        <div
            ref={ref}
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                background: '#000',
            }}
        />
    );
}