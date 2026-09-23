import { useEffect, useRef } from 'react';
import { useSetting } from '../settings/useSettings';

export default function ThemeApplier() {
  const enabled = useSetting('themeEnabled');
  const colors  = useSetting('themeColors');
  const firstRef = useRef(true);

  // Локальные CSS-переменные главного окна
  useEffect(() => {
    const root = document.documentElement;
    if (enabled) {
      root.classList.remove('ignore_The_Omniscience_Theme_recursive');
      root.style.setProperty('--TheOmniscience-max-r', colors.maxR);
      root.style.setProperty('--TheOmniscience-max-g', colors.maxG);
      root.style.setProperty('--TheOmniscience-max-b', colors.maxB);
      root.style.setProperty('--TheOmniscience-target-alpha', colors.targetAlpha);
      root.style.setProperty('--TheOmniscience-text-brightness', colors.textBrightness);
    } else {
      root.classList.add('ignore_The_Omniscience_Theme_recursive');
    }
  }, [enabled, colors]);

  // Пересоздание view — ТОЛЬКО при смене тумблера
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    window.electron_desktop_API?.send?.('theme:enabled-changed', enabled);
  }, [enabled]);

  return null;
}