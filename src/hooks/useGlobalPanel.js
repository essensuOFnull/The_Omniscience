import { useEffect, useRef } from 'react';

const BASE_W = 184;
const BASE_H = 102;

export default function useGlobalPanel() {
    const createdRef = useRef(false);

    useEffect(() => {
        if (createdRef.current) return;

        const frameUrl = (() => {
            try {
                const isDev = window.location.protocol === 'http:';
                const p = isDev ? 'src/frame/index.html' : 'frame/index.html';
                return new URL(p, window.location.href).href + '?globalPanel=1';
            } catch { return null; }
        })();
        if (!frameUrl) return;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const x = Math.round((vw - BASE_W) / 2);
        const y = Math.round((vh - BASE_H) / 2);

        window.electron_desktop_API.createView({
            id: 'panel:global',
            kind: 'panel',
            url: frameUrl,
            bounds: { x, y, width: BASE_W, height: BASE_H },
        });

        createdRef.current = true;

        return () => {
            createdRef.current = false;
            window.electron_desktop_API.destroyView({ id: 'panel:global' });
        };
    }, []);
}