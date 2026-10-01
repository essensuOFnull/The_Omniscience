import { useEffect, useState } from 'react';

export default function useNativeWindows() {
  const [windows, setWindows] = useState([]);

  useEffect(() => {
    const api = window.electron_desktop_API;
    if (!api) return;

    const off = api.on('shell:native-windows-updated', (list) => {
      setWindows(Array.isArray(list) ? list : []);
    });

    return off;
  }, []);

  return windows;
}