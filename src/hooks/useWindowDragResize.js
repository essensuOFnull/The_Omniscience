import { useCallback } from 'react';

function getSnapArea(cursorX, cursorY, viewportWidth, viewportHeight) {
  const threshold = Math.max(24, Math.min(80, Math.min(viewportWidth, viewportHeight) * 0.08));
  const leftEdge = cursorX <= threshold;
  const rightEdge = cursorX >= viewportWidth - threshold;
  const topEdge = cursorY <= threshold;
  const bottomEdge = cursorY >= viewportHeight - threshold;

  if (topEdge && leftEdge) return 'top-left';
  if (topEdge && rightEdge) return 'top-right';
  if (bottomEdge && leftEdge) return 'bottom-left';
  if (bottomEdge && rightEdge) return 'bottom-right';
  if (topEdge) return 'top';
  if (bottomEdge) return 'bottom';
  if (leftEdge) return 'left';
  if (rightEdge) return 'right';
  return null;
}

function getSnapGeometry(snap, viewport) {
  const { width, height } = viewport;
  const halfW = width / 2;
  const halfH = height / 2;
  switch (snap) {
    case 'top':
      return { centerX: width / 2, centerY: height / 4, width, height: halfH };
    case 'bottom':
      return { centerX: width / 2, centerY: halfH + height / 4, width, height: halfH };
    case 'left':
      return { centerX: width / 4, centerY: height / 2, width: halfW, height };
    case 'right':
      return { centerX: halfW + width / 4, centerY: height / 2, width: halfW, height };
    case 'top-left':
      return { centerX: width / 4, centerY: height / 4, width: halfW, height: halfH };
    case 'top-right':
      return { centerX: halfW + width / 4, centerY: height / 4, width: halfW, height: halfH };
    case 'bottom-left':
      return { centerX: width / 4, centerY: halfH + height / 4, width: halfW, height: halfH };
    case 'bottom-right':
      return { centerX: halfW + width / 4, centerY: halfH + height / 4, width: halfW, height: halfH };
    default:
      return null;
  }
}

export default function useWindowDragResize(desktopId, windowId, win, state, actions, isFocused, isGrid, contentRef) {
  // Защита от отсутствия viewport
  const viewport = state.viewport || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, centerX: window.innerWidth / 2, centerY: window.innerHeight / 2 };

  const handleTitleMouseDown = useCallback((e) => {
    if (isGrid || win.maximized || win.closing) return;
    e.preventDefault();
    if (!isFocused) actions.focusWindow(desktopId, windowId);
    if (contentRef.current) contentRef.current.style.pointerEvents = 'none';

    const startX = e.clientX, startY = e.clientY;
    const { centerX: startCX, centerY: startCY, width, height } = win.ghost;

    const onMove = (ev) => {
      const localX = ev.clientX - viewport.left;
      const localY = ev.clientY - viewport.top;
      const snap = getSnapArea(localX, localY, viewport.width, viewport.height);
      if (snap) {
        const geometry = getSnapGeometry(snap, viewport);
        actions.setWindowRect(
          desktopId,
          windowId,
          geometry.centerX,
          geometry.centerY,
          geometry.width,
          geometry.height,
          snap
        );
        return;
      }

      actions.setWindowRect(
        desktopId,
        windowId,
        startCX + ev.clientX - startX,
        startCY + ev.clientY - startY,
        width,
        height,
        win.snapped ? null : undefined
      );
    };
    const onUp = () => {
      if (contentRef.current) contentRef.current.style.pointerEvents = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [desktopId, windowId, actions, isGrid, isFocused, win, contentRef, viewport]);

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