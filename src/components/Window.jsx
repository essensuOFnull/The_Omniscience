import React, { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Box } from '@mui/material';
import TitleBar from './TitleBar';
import AddressBar from './AddressBar';
import ResizeHandles from './ResizeHandles';
import useDesktopOffset from '../hooks/useDesktopOffset';
import useWindowNavigation from '../hooks/useWindowNavigation';
import useContentView from '../hooks/useContentView';
import useWindowDragResize from '../hooks/useWindowDragResize';

export default function Window({ windowId, app, state, actions, config, animations, desktopId }) {
  const win = state?.windows?.[windowId];
  if (!win) return null;

  const isFocused = state.focusedWindowId === windowId;
  const isGrid = state.isOverviewOpened && state.overviewTab === 1;
  const overviewScrollTop = state.overviewScrollTop || 0;

  const contentRef = useRef(null);
  const titleBarRef = useRef(null);
  const frameRef = useRef(null);

  const desktopOffset = useDesktopOffset();
  const { currentUrl, pageTitle, loading, canGoBack, canGoForward, setCurrentUrl, navigateTo, goBack, goForward, reload } =
    useWindowNavigation(windowId, win.url, app?.url);

  const { viewCreated, sendUpdate } = useContentView(
    windowId, win, app, config, contentRef, desktopOffset, isGrid, overviewScrollTop
  );

  const { handleTitleMouseDown, onResizeMouseDown } = useWindowDragResize(
    desktopId, windowId, win, state, actions, isFocused, isGrid, contentRef
  );

  const onAnimationComplete = useCallback(() => {
    actions.animationComplete(desktopId, windowId);
    sendUpdate();
  }, [desktopId, actions, windowId, sendUpdate]);

  // Вычисляем позиционирование и анимацию
  const topOffset = (isGrid && state.gridViewport?.top != null) ? state.gridViewport.top - overviewScrollTop : 0;
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
  const baseAnimate = {
    left: ghost.centerX,
    top: ghost.centerY + topOffset,
    x: '-50%',
    y: '-50%',
    width: ghost.width,
    height: ghost.height,
  };

  const variant = win.animationVariant || 'create';
  const variantConfig = animations?.[variant] || {};
  const initial = { ...baseInitial, ...variantConfig.initial };
  const animate = { ...baseAnimate, ...variantConfig.animate };

  const showResizeHandles = !isGrid && !win.maximized && !win.minimized && !win.closing;
  const contentScale = win.contentScale > 0 ? win.contentScale : 1;

  return (
    <motion.div
      style={{ position: 'absolute', zIndex: win.z || 0 }}
      initial={initial}
      animate={animate}
      onAnimationComplete={onAnimationComplete}
      onClick={(e) => {
        if (isGrid && !win.closing) {
          e.stopPropagation();
          actions.closeOverview(desktopId);
          actions.focusWindow(desktopId, windowId);
        }
      }}
    >
      <Box
        ref={frameRef}
        sx={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: isFocused ? 4 : 2,
          borderRadius: win.maximized ? 0 : 3,
          border: '1px solid',
          borderColor: isFocused ? 'primary.main' : 'divider',
          cursor: isGrid ? 'pointer' : 'default',
        }}
      >
        <TitleBar
          app={app}
          windowId={windowId}
          desktopId={desktopId}
          win={win}
          isFocused={isFocused}
          isGrid={isGrid}
          actions={actions}
          pageTitle={pageTitle}
          currentUrl={currentUrl}
          onTitleMouseDown={handleTitleMouseDown}
        />

        <AddressBar
          win={win}
          app={app}
          currentUrl={currentUrl}
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
          <motion.div
            ref={contentRef}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              transformOrigin: 'top left',
              width: '100%', height: '100%',
              pointerEvents: isGrid ? 'none' : 'auto',
              userSelect: 'none',
            }}
            animate={{ scale: contentScale }}
            transition={animations?.setContentScale?.animate?.transition || { duration: 0.3 }}
          >
            <Box sx={{ flex: 1 }} />
          </motion.div>
        </Box>

        {showResizeHandles && <ResizeHandles onResizeMouseDown={onResizeMouseDown} />}
      </Box>
    </motion.div>
  );
}