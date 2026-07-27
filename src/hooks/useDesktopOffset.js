import { useState, useEffect } from 'react';

export default function useDesktopOffset() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let unsubscribe = null;
    window.electron_desktop_API.getDesktopViewBounds().then(bounds => {
      if (bounds) setOffset({ x: bounds.x, y: bounds.y });
    });
    unsubscribe = window.electron_desktop_API.onDesktopViewBoundsChanged?.(bounds => {
      if (bounds) setOffset({ x: bounds.x, y: bounds.y });
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  return offset;
}