import React, { useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Box } from '@mui/material';
import useDesktopOffset from '../hooks/useDesktopOffset';
import useWindowNavigation from '../hooks/useWindowNavigation';
import useContentView from '../hooks/useContentView';
import useChromiumDevToolsView from '../hooks/useChromiumDevToolsView';

export default function Window({ windowId, app, state, actions, config, animations, desktopId, active }) {
  const win = state?.windows?.[windowId];
  const isDevTools = win?.kind === 'devtools';
  const hasWin = !!win;

  const contentRef = useRef(null);
  const desktopOffset = useDesktopOffset();

  const contentResult = useContentView(
    (hasWin && !isDevTools) ? windowId : null,
    (hasWin && !isDevTools) ? win : null,
    isDevTools ? null : app,
    config, contentRef, desktopOffset, active, desktopId
  );

  const devtoolsResult = useChromiumDevToolsView(
    (hasWin && isDevTools) ? windowId : null,
    (hasWin && isDevTools) ? win : null,
    contentRef, desktopOffset, active,
    (hasWin && isDevTools) ? win.targetWindowId : null
  );

  const {
    currentUrl, pageTitle, loading, canGoBack, canGoForward,
    setCurrentUrl, navigateTo, goBack, goForward, reload,
  } = useWindowNavigation(windowId, win?.url, app?.url);

  if (!win) return null;

  const isFocused = state.focusedWindowId === windowId;
  const { viewCreated, sendUpdate } = isDevTools ? devtoolsResult : contentResult;

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