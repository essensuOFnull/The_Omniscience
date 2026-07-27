import { useCallback } from 'react';

export default function useWindowDragResize(desktopId, windowId, win, state, actions, isFocused, isGrid, contentRef) {
  // Защита от отсутствия viewport
  const viewport = state.viewport || { width: window.innerWidth, height: window.innerHeight };

  const handleTitleMouseDown = useCallback((e) => {
    if (isGrid || win.maximized || win.closing) return;
    e.preventDefault();
    if (!isFocused) actions.focusWindow(desktopId, windowId);
    if (contentRef.current) contentRef.current.style.pointerEvents = 'none';

    const startX = e.clientX, startY = e.clientY;
    const { centerX: startCX, centerY: startCY, width, height } = win.ghost;

    const onMove = (ev) => {
      actions.setWindowRect(
        desktopId, windowId,
        startCX + ev.clientX - startX,
        startCY + ev.clientY - startY,
        width, height
      );
    };
    const onUp = () => {
      if (contentRef.current) contentRef.current.style.pointerEvents = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [desktopId, windowId, actions, isGrid, isFocused, win, contentRef]);

  const onResizeMouseDown = useCallback((direction) => (e) => {
    if (win.maximized || win.closing) return;
    e.preventDefault();
    e.stopPropagation();
    if (!isFocused) actions.focusWindow(desktopId, windowId);
    if (contentRef.current) contentRef.current.style.pointerEvents = 'none';

    const startX = e.clientX, startY = e.clientY;
    const { width: startW, height: startH, centerX: startCX, centerY: startCY } = win.ghost;
    const left = startCX - startW / 2, right = startCX + startW / 2;
    const top = startCY - startH / 2, bottom = startCY + startH / 2;

    const onMove = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      let newW = startW, newH = startH, newCX = startCX, newCY = startCY;

      if (direction.includes('e')) {
        newW = Math.min(Math.max(startW + dx, 1), viewport.width - left);
        newCX = left + newW / 2;
      } else if (direction.includes('w')) {
        newW = Math.min(Math.max(startW - dx, 1), right);
        newCX = right - newW / 2;
      }
      if (direction.includes('s')) {
        newH = Math.min(Math.max(startH + dy, 1), viewport.height - top);
        newCY = top + newH / 2;
      } else if (direction.includes('n')) {
        newH = Math.min(Math.max(startH - dy, 1), bottom);
        newCY = bottom - newH / 2;
      }

      actions.setWindowRect(desktopId, windowId, newCX, newCY, newW, newH);
    };
    const onUp = () => {
      if (contentRef.current) contentRef.current.style.pointerEvents = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [desktopId, windowId, actions, isFocused, win, contentRef, viewport]);

  return { handleTitleMouseDown, onResizeMouseDown };
}