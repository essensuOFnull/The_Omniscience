import React, { useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Box } from '@mui/material';
import TitleBar from './TitleBar';
import ResizeHandles from './ResizeHandles';
import useDesktopOffset from '../hooks/useDesktopOffset';
import useWindowNavigation from '../hooks/useWindowNavigation';
import useContentView from '../hooks/useContentView';
import useWindowDragResize from '../hooks/useWindowDragResize';

export default function Window({ windowId, app, state, actions, config, animations, desktopId, active }) {
  const win = state?.windows?.[windowId];
  if (!win) return null;

  const isFocused = state.focusedWindowId === windowId;

  const contentRef = useRef(null);
  const frameRef = useRef(null);

  const desktopOffset = useDesktopOffset();

  const {
    currentUrl, pageTitle, loading, canGoBack, canGoForward,
    setCurrentUrl, navigateTo, goBack, goForward, reload,
  } = useWindowNavigation(windowId, win.url, app?.url);

  const { viewCreated, sendUpdate } = useContentView(
    windowId, win, app, config, contentRef, desktopOffset, active, desktopId
  );

  const { handleTitleMouseDown, onResizeMouseDown } = useWindowDragResize(
    desktopId, windowId, win, state, actions, isFocused, contentRef
  );

  const onAnimationComplete = useCallback(() => {
    actions.animationComplete(desktopId, windowId);
    sendUpdate();
  }, [desktopId, actions, windowId, sendUpdate]);

  const ghost = win.ghost;
  const initialGhost = win.initialGhost || ghost;

  const baseInitial = {
    left: initialGhost.centerX,
    top: initialGhost.centerY,
    x: '-50%',
    y: '-50%',
    width: initialGhost.width,
    height: initialGhost.height,
  };

  const hiddenInOverview = state.isOverviewOpened;
  const viewportWidth = state.viewport?.width || window.innerWidth;
  const viewportHeight = state.viewport?.height || window.innerHeight;
  const viewportCenterX = state.viewport?.centerX ?? viewportWidth / 2;
  const hideDistance = Math.max(win.ghost.height, viewportHeight) * -1;
  const offscreenGhost = hiddenInOverview
    ? { ...ghost, centerX: viewportCenterX, centerY: hideDistance }
    : ghost;

  const baseAnimate = {
    left: offscreenGhost.centerX,
    top: offscreenGhost.centerY,
    x: '-50%',
    y: '-50%',
    width: offscreenGhost.width,
    height: offscreenGhost.height,
  };

  const variant = win.animationVariant || 'create';
  const variantConfig = animations?.[variant] || {};

  const initial = useMemo(() => ({
    ...baseInitial,
    ...variantConfig.initial,
  }), [initialGhost, variant]);

  const animateKey = JSON.stringify({
    cx: offscreenGhost.centerX,
    cy: offscreenGhost.centerY,
    w: offscreenGhost.width,
    h: offscreenGhost.height,
    variant,
  });

  const animate = useMemo(() => ({
    ...baseAnimate,
    ...variantConfig.animate,
  }), [animateKey]);

  const showResizeHandles = !win.maximized && !win.minimized && !win.closing;

  return (
    <motion.div
      style={{ position: 'absolute', zIndex: win.z || 0 }}
      initial={initial}
      animate={animate}
      onAnimationComplete={onAnimationComplete}
    >
      <Box
        ref={frameRef}
        sx={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: isFocused ? 4 : 2,
          borderRadius: win.maximized ? 0 : 3,
          border: '1px solid',
          borderColor: isFocused ? 'primary.main' : 'divider',
        }}
      >
        <TitleBar
          app={app}
          windowId={windowId}
          desktopId={desktopId}
          win={win}
          isFocused={isFocused}
          actions={actions}
          pageTitle={pageTitle}
          currentUrl={currentUrl}
          onTitleMouseDown={handleTitleMouseDown}
          setCurrentUrl={setCurrentUrl}
          navigateTo={navigateTo}
          goBack={goBack}
          goForward={goForward}
          reload={reload}
          loading={loading}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
        />

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          <Box
            ref={contentRef}
            sx={{
              flex: 1,
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              userSelect: 'none',
            }}
          />
        </Box>

        {showResizeHandles && <ResizeHandles onResizeMouseDown={onResizeMouseDown} />}
      </Box>
    </motion.div>
  );
}