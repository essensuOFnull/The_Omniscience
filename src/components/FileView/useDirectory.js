import { useState, useEffect, useCallback, useRef } from 'react';

export default function useDirectory(path) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);
  const pathRef = useRef(path);
  pathRef.current = path;

  const load = useCallback(async (targetPath) => {
    if (!targetPath) {
      setFiles([]);
      return;
    }

    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const api = window.electron_desktop_API;
      const res = await api.readDir(targetPath);
      if (reqId !== requestIdRef.current) return;

      if (!res.success) {
        setError(res.error || 'unknown');
        setFiles([]);
      } else {
        const sorted = [...res.files].sort((a, b) => {
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        });
        setFiles(sorted);
      }
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err?.message || 'unknown');
      setFiles([]);
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, []);

  // Первичная загрузка + подписка на fs.watch через main
  useEffect(() => {
    if (!path) {
      setFiles([]);
      return;
    }

    const api = window.electron_desktop_API;

    load(path);
    api.watchStart(path);

    return () => {
      api.watchStop(path);
    };
  }, [path, load]);

  // Слушаем fs:did-change — если наша папка, перезагружаем
  useEffect(() => {
    const api = window.electron_desktop_API;
    const off = api.on('fs:did-change', (msg) => {
      if (!msg || !msg.dir) return;
      if (msg.dir === pathRef.current) {
        // Небольшая задержка — fs.watch иногда стреляет быстрее,
        // чем файловая система успевает применить изменения
        setTimeout(() => load(pathRef.current), 100);
      }
    });
    return off;
  }, [load]);

  const reload = useCallback(() => load(path), [path, load]);

  return { files, loading, error, reload };
}