import React, { useEffect } from 'react';

export default function FrameHandler() {
  useEffect(() => {
    // Подписка на изменения состояния окна
    const unsubscribe = window.electron_mainWindow_API.onWindowStateChange((state) => {
      document.documentElement.style.setProperty(
        '--frame-size',
        state.maximized || state.fullscreen ? '0px' : '5px'
      );
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handles = document.querySelectorAll('.frame-handle');

    const onMouseDown = (e) => {
      const direction = e.currentTarget.dataset.resize;
      if (!direction) return;

      // Запускаем ресайз
      window.electron_mainWindow_API.startResize(direction);

      const onMouseMove = (ev) => {
        window.electron_mainWindow_API.sendResizeMove(ev.screenX, ev.screenY);
      };
      const onMouseUp = () => {
        window.electron_mainWindow_API.endResize();
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    };

    handles.forEach((h) => h.addEventListener('mousedown', onMouseDown));

    return () => handles.forEach((h) => h.removeEventListener('mousedown', onMouseDown));
  }, []);

  return null;
}