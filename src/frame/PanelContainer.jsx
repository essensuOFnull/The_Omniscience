import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Panel from '../frame-runtime/Panel.jsx';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#a855f7' },
        background: { paper: 'rgba(28,0,28,0.88)', default: 'transparent' },
        text: { primary: '#fff', secondary: 'rgba(255,255,255,0.7)' },
    },
});

export default function PanelContainer({ windowId }) {
    const api = window.electron_panel_API;

    const [props, setProps] = useState({
        title: document.title || 'Окно',
        icon: null,
        isFocused: false,
        maximized: false,
    });

    const [mode, setMode] = useState('control'); // 'control' | 'search'
    const [navState, setNavState] = useState({
        currentUrl: location.href,
        canGoBack: false,
        canGoForward: false,
        loading: false,
    });

    // ---- Props от shell ----
    useEffect(() => {
        if (!api) return;
        return api.on('panel:props', (data) => {
            setProps((p) => ({ ...p, ...(data || {}) }));
        });
    }, [api]);

    // ---- Pointer lock: drag/resize window / panel move ----
    const modeRef = useRef(null);
    const panelBoundsRef = useRef(null);

    useEffect(() => {
        if (!api) return;
        // Узнаём свои bounds
        api.invoke('view:get-bounds', { id: `panel:${windowId}` }).then((b) => {
            if (b) panelBoundsRef.current = b;
        });
    }, [api, windowId]);

    useEffect(() => {
        const onMove = (e) => {
            if (!document.pointerLockElement || !modeRef.current) return;
            const m = modeRef.current;

            if (m === 'panelMove') {
                const cur = panelBoundsRef.current;
                if (!cur) return;
                const next = {
                    x: cur.x + e.movementX,
                    y: cur.y + e.movementY,
                    width: cur.width,
                    height: cur.height,
                };
                panelBoundsRef.current = next;
                api.updateOwnBounds(next, false);
            } else if (m === 'windowDrag') {
                api.send('frame:drag-delta', { windowId, dx: e.movementX, dy: e.movementY });
            } else if (m.resize) {
                api.send('frame:resize-delta', {
                    windowId, direction: m.resize,
                    dx: e.movementX, dy: e.movementY,
                });
            }
        };
        const finish = () => {
            const m = modeRef.current;
            if (!m) return;
            modeRef.current = null;
            try { document.exitPointerLock?.(); } catch (_) { }
            if (m === 'windowDrag') api.send('frame:drag-end', { windowId });
            else if (m.resize) api.send('frame:resize-end', { windowId });
        };
        const onLockChange = () => { if (!document.pointerLockElement) finish(); };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', finish);
        document.addEventListener('pointerlockchange', onLockChange);
        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', finish);
            document.removeEventListener('pointerlockchange', onLockChange);
        };
    }, [api, windowId]);

    const lockPointer = () => {
        try {
            const p = document.body.requestPointerLock();
            if (p && p.catch) p.catch(() => { });
        } catch (_) { }
    };

    const onPanelDragStart = useCallback((e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        api.invoke('view:get-bounds', { id: `panel:${windowId}` }).then((b) => {
            if (b) panelBoundsRef.current = b;
        });
        modeRef.current = 'panelMove';
        lockPointer();
    }, [api, windowId]);

    const onPanelDoubleClick = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        // Сброс в дефолтный угол — считаем от viewport окна
        // (грубо: сдвинуть к правому-нижнему краю mainWindow)
        // Точный дефолт вычисляет main, но пока оставим no-op.
    }, []);

    const onWindowDragStart = useCallback((e) => {
        if (props.maximized || e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        modeRef.current = 'windowDrag';
        lockPointer();
        api.send('frame:drag-start', { windowId });
    }, [api, windowId, props.maximized]);

    const beginResize = useCallback((dir) => (e) => {
        if (props.maximized || e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        modeRef.current = { resize: dir };
        lockPointer();
        api.send('frame:resize-start', { windowId, direction: dir });
    }, [api, windowId, props.maximized]);

    const send = useCallback((type, payload) => {
        api.send('panel:event', { windowId, type, payload });
    }, [api, windowId]);

    const onClose = useCallback(() => send('close', {}), [send]);
    const onMinimize = useCallback(() => send('minimize', {}), [send]);
    const onMaximize = useCallback(() => send('toggle-maximize', {}), [send]);
    const onToggleMode = useCallback(() => {
        setMode((m) => (m === 'control' ? 'search' : 'control'));
    }, []);

    const onNavigateTo = (url) => {
        if (!url) return;
        try {
            if (!/^[a-z]+:/i.test(url)) url = 'https://' + url;
            api.send('window-load-url', windowId, url);
        } catch (_) { }
    };
    const onBack = () => api.send('window-go-back', windowId);
    const onForward = () => api.send('window-go-forward', windowId);
    const onReload = () => api.send('window-reload', windowId);

    // Размеры — панель на весь свой view
    const cell = 28;
    const gap = 1;
    const pad = 4;

    const onOpenDevTools = useCallback(() => {
        api.send('panel:event', { windowId, type: 'open-devtools', payload: {} });
    }, [api, windowId]);

    return (
        <ThemeProvider theme={darkTheme}>
            <Panel
                x={0} y={0} width="100%" height="100%"
                cell={cell} gap={gap} pad={pad}
                mode={mode}
                scale={1}
                title={props.title}
                icon={props.icon}
                isFocused={props.isFocused}
                maximized={props.maximized}
                closing={false}
                loading={navState.loading}
                currentUrl={navState.currentUrl}
                canGoBack={navState.canGoBack}
                canGoForward={navState.canGoForward}
                onPanelDragStart={onPanelDragStart}
                onPanelDoubleClick={onPanelDoubleClick}
                onWindowDragStart={onWindowDragStart}
                onResize={beginResize}
                onToggleMode={onToggleMode}
                onClose={onClose}
                onMinimize={onMinimize}
                onMaximize={onMaximize}
                onNavigateTo={onNavigateTo}
                onBack={onBack}
                onForward={onForward}
                onReload={onReload}
                onOpenDevTools={onOpenDevTools}
            />
        </ThemeProvider>
    );
}