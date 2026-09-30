(function () {
    try {
        var params = new URLSearchParams(location.search);
        // DevTools-окно само себя не инспектирует
        if (params.get('omniDevTools') === '1') return;

        var windowId = params.get('windowId') || '';
        if (!windowId) {
            // Для shell-окна и всяких служебных view backend не нужен
            return;
        }

        // 1. Мост из isolated world в main world
        contextBridge.exposeInMainWorld('__omniRTD', {
            sendToMain: function (msg) {
                try {
                    ipcRenderer.send('rtd:backend-to-main', {
                        windowId: windowId,
                        event: msg.event,
                        payload: msg.payload,
                    });
                } catch (e) { console.error('[RTD] send failed', e); }
            },
            subscribeFromMain: function (cb) {
                var channel = 'rtd:main-to-backend-' + windowId;
                var handler = function (_, msg) {
                    try { cb(msg); } catch (e) { console.error('[RTD] cb failed', e); }
                };
                ipcRenderer.on(channel, handler);
                return function () { ipcRenderer.removeListener(channel, handler); };
            },
        });

        // 2. Читаем backend.js
        var fs = require('fs');
        var path = require('path');
        var backendPath = path.join(
            __dirname, '..',
            'node_modules', 'react-devtools-inline', 'dist', 'backend.js'
        );

        var backendSource;
        try {
            backendSource = fs.readFileSync(backendPath, 'utf8');
        } catch (e) {
            console.error('[RTD] backend.js not found at', backendPath, e.message);
            return;
        }

        // 3. Bootstrap, который выполнится в MAIN world
        function bootstrap(src, wid) {
            try {
                var wall = {
                    listen: function (fn) {
                        try { return window.__omniRTD.subscribeFromMain(fn); }
                        catch (e) { console.error('[RTD] listen failed', e); return function () { }; }
                    },
                    send: function (event, payload) {
                        try { window.__omniRTD.sendToMain({ event: event, payload: payload }); }
                        catch (e) { console.error('[RTD] send failed', e); }
                    },
                };

                // Фиктивный require — backend.js написан для браузера,
                // require внутри — это webpack-полифилы для Node-совместимости.
                // Они не используются в реальной работе.
                var fakeRequire = function (name) {
                    if (name === 'buffer') return { Buffer: window.Buffer };
                    if (name === 'util') return {};
                    if (name === 'events') return { EventEmitter: function () { } };
                    if (name === 'stream') return {};
                    return {};
                };

                var module = { exports: {} };
                var exports = module.exports;

                (new Function(
                    'module', 'exports', 'require', 'window', 'self', 'global', 'console',
                    src
                ))(
                    module, exports, fakeRequire, window, window, window, console
                );

                var backend = module.exports;
                if (!backend || typeof backend.initialize !== 'function') {
                    console.error('[RTD] backend.js did not export initialize');
                    return;
                }

                backend.initialize(window);
                var bridge = backend.createBridge(window, wall);
                backend.activate(window, { bridge: bridge });
                console.log('[RTD] ✓ backend activated for windowId=' + wid);
            } catch (e) {
                console.error('[RTD] bootstrap failed:', e);
            }
        }

        contextBridge.executeInMainWorld({
            func: bootstrap,
            args: [backendSource, windowId],
        });
    } catch (err) {
        console.error('[RTD-backend] init failed:', err);
    }
})();