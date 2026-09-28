import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Box } from '@mui/material';
import useDesktopOffset from '../hooks/useDesktopOffset';
import useWindowNavigation from '../hooks/useWindowNavigation';
import useContentView from '../hooks/useContentView';

export default function Window({ windowId, app, state, actions, config, animations, desktopId, active }) {
  const win = state?.windows?.[windowId];
  if (!win) return null;

  const isFocused = state.focusedWindowId === windowId;
  const contentRef = useRef(null);
  const desktopOffset = useDesktopOffset();

  const {
    currentUrl, pageTitle, loading, canGoBack, canGoForward,
    setCurrentUrl, navigateTo, goBack, goForward, reload,
  } = useWindowNavigation(windowId, win.url, app?.url);

  const { viewCreated, sendUpdate } = useContentView(
    windowId, win, app, config, contentRef, desktopOffset, active, desktopId
  );

  const winRef = useRef(win); winRef.current = win;
  const actionsRef = useRef(actions); actionsRef.current = actions;
  const desktopIdRef = useRef(desktopId); desktopIdRef.current = desktopId;

  // Кнопки окна (из preload)
  useEffect(() => {
    const api = window.electron_desktop_API;
    if (!api) return;
    const off = api.on('shell:frame-event', (msg) => {
      if (!msg) return;
      const { windowId: wId, type } = msg;
      if (wId !== windowId || !type) return;
      const w = winRef.current, a = actionsRef.current, dId = desktopIdRef.current;
      if (!w || !a) return;

      if (type === 'close') { if (!w.closing) a.closeWindow(dId, wId); }
      else if (type === 'minimize') {
        if (w.closing) return;
        if (w.minimized) a.unminimizeWindow(dId, wId);
        else a.minimizeWindow(dId, wId);
      } else if (type === 'toggle-maximize') {
        if (w.closing) return;
        if (w.maximized) a.unmaximizeWindow(dId, wId);
        else a.maximizeWindow(dId, wId);
      }
    });
    return off;
  }, [windowId]);

  // Props → preload (title, icon, focus, maximized)
  useEffect(() => {
    const api = window.electron_desktop_API;
    if (!api || !viewCreated) return;
    api.send('shell:send-to-frame', {
      windowId,
      data: {
        title: pageTitle || app?.title || 'Окно',
        icon: app?.icon || null,
        isFocused,
        maximized: !!win.maximized,
        frameState: win.frame || null,
      },
    });
  }, [viewCreated, windowId, pageTitle, app?.icon, app?.title, isFocused, win.maximized, win.frame]);

  const ghost = win.ghost;
  const initialGhost = win.initialGhost || ghost;
  const hiddenInOverview = state.isOverviewOpened;
  const viewportWidth = state.viewport?.width || window.innerWidth;
  const viewportHeight = state.viewport?.height || window.innerHeight;
  const viewportCenterX = state.viewport?.centerX ?? viewportWidth / 2;
  const hideDistance = Math.max(win.ghost.height, viewportHeight) * -1;
  const offscreenGhost = hiddenInOverview
    ? { ...ghost, centerX: viewportCenterX, centerY: hideDistance }
    : ghost;

  const baseInitial = {
    left: initialGhost.centerX, top: initialGhost.centerY,
    x: '-50%', y: '-50%',
    width: initialGhost.width, height: initialGhost.height,
  };
  const baseAnimate = {
    left: offscreenGhost.centerX, top: offscreenGhost.centerY,
    x: '-50%', y: '-50%',
    width: offscreenGhost.width, height: offscreenGhost.height,
  };

  const variant = win.animationVariant || 'create';
  const variantConfig = animations?.[variant] || {};

  const initial = useMemo(() => ({ ...baseInitial, ...variantConfig.initial }), [initialGhost, variant]);
  const animateKey = JSON.stringify({
    cx: offscreenGhost.centerX, cy: offscreenGhost.centerY,
    w: offscreenGhost.width, h: offscreenGhost.height, variant,
  });
  const animate = useMemo(() => ({ ...baseAnimate, ...variantConfig.animate }), [animateKey]);

  const onAnimationComplete = useCallback(() => {
    actions.animationComplete(desktopId, windowId);
    sendUpdate();
  }, [desktopId, actions, windowId, sendUpdate]);

  return (
    <motion.div
      style={{ position: 'absolute', zIndex: win.z || 0, pointerEvents: 'none' }}
      initial={initial}
      animate={animate}
      onAnimationComplete={onAnimationComplete}
    >
      <Box
        ref={contentRef}
        sx={{ width: '100%', height: '100%', overflow: 'hidden', userSelect: 'none' }}
      />
    </motion.div>
  );
}