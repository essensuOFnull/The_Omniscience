import { useState, useEffect, useRef } from 'react';

// Глобальный кэш: путь к файлу → file:// URL (или data: URL для fallback)
const iconCache = new Map();
const pendingPromises = new Map();

/**
 * Возвращает URL иконки файла (file:// для системных иконок,
 * data: для fallback через Electron). Кэшируется глобально.
 */
export function useFileIcon(filePath) {
  const [url, setUrl] = useState(() => iconCache.get(filePath) ?? null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    if (!filePath) { setUrl(null); return; }

    if (iconCache.has(filePath)) {
      setUrl(iconCache.get(filePath));
      return () => { aliveRef.current = false; };
    }

    if (pendingPromises.has(filePath)) {
      pendingPromises.get(filePath).then((u) => {
        if (aliveRef.current) setUrl(u);
      });
      return () => { aliveRef.current = false; };
    }

    const api = window.electron_desktop_API;
    const promise = api.getFileIcon(filePath)
      .then((res) => {
        const value = res?.success ? res.fileUrl : null;
        iconCache.set(filePath, value);
        pendingPromises.delete(filePath);
        return value;
      })
      .catch(() => {
        iconCache.set(filePath, null);
        pendingPromises.delete(filePath);
        return null;
      });

    pendingPromises.set(filePath, promise);
    promise.then((u) => { if (aliveRef.current) setUrl(u); });

    return () => { aliveRef.current = false; };
  }, [filePath]);

  return url;
}