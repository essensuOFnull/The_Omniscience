import { useState, useEffect, useRef } from 'react';

const iconCache = new Map(); // path → dataUrl | null

/**
 * Возвращает dataUrl иконки для файла. Кэшируется глобально.
 */
export function useFileIcon(filePath) {
  const [url, setUrl] = useState(() => iconCache.get(filePath) ?? null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    if (iconCache.has(filePath)) {
      setUrl(iconCache.get(filePath));
      return () => { aliveRef.current = false; };
    }

    const api = window.electron_desktop_API;
    api.getFileIcon(filePath).then((res) => {
      const value = res?.success ? res.dataUrl : null;
      iconCache.set(filePath, value);
      if (aliveRef.current) setUrl(value);
    }).catch(() => {
      iconCache.set(filePath, null);
      if (aliveRef.current) setUrl(null);
    });

    return () => { aliveRef.current = false; };
  }, [filePath]);

  return url;
}