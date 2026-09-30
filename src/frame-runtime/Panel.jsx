import React from 'react';
import ControlGrid from './ControlGrid';
import SearchGrid from './SearchGrid';

const RING_KEYFRAMES = `
@keyframes omni-ring-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
`;

export default function Panel({
  x, y, width, height, cell, gap, pad,
  mode, scale,
  title, icon, isFocused, maximized, closing, loading,
  currentUrl, canGoBack, canGoForward,
  onPanelDragStart, onPanelDoubleClick,
  onWindowDragStart, onResize,
  onToggleMode, onClose, onMinimize, onMaximize,
  onNavigateTo, onBack, onForward, onReload,
  onOpenDevTools,
}) {
  const iconSize = Math.round(cell * 0.7);

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: mode === 'search'
      ? `${cell}px ${cell}px ${cell}px 1fr`
      : `${cell}px ${cell}px ${cell * 1.3}px ${cell}px ${cell}px`,
    gridTemplateRows: `${cell}px ${cell * 1.15}px ${cell}px`,
    gap: `${gap}px`,
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
  };

  const panelStyle = {
    position: 'fixed',
    left: x,
    top: y,
    width,
    height,
    pointerEvents: 'auto',
    zIndex: 2147483646,
    userSelect: 'none',
    background: 'rgba(28,0,28,0.88)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px dashed cyan',
    boxSizing: 'border-box',
    padding: pad,
    overflow: 'hidden',
    opacity: closing ? 0.5 : 1,
  };

  const LoadingRing = () => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 8,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: -50,
          background:
            'conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(168,85,247,0.9) 340deg, rgba(168,85,247,1) 360deg)',
          animation: 'omni-ring-spin 1.6s linear infinite',
          mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: 2,
          boxSizing: 'content-box',
        }}
      />
    </div>
  );

  return (
    <>
      <style>{RING_KEYFRAMES}</style>
      <div style={panelStyle}>
        {mode === 'control' ? (
          <ControlGrid
            gridStyle={gridStyle}
            iconSize={iconSize}
            icon={icon}
            maximized={maximized}
            onMaximize={onMaximize}
            onMinimize={onMinimize}
            onClose={onClose}
            onWindowDragStart={onWindowDragStart}
            onPanelDragStart={onPanelDragStart}
            onPanelDoubleClick={onPanelDoubleClick}
            onToggleMode={onToggleMode}
            onOpenDevTools={onOpenDevTools}
            onResize={onResize}
          />
        ) : (
          <SearchGrid
            gridStyle={gridStyle}
            iconSize={iconSize}
            icon={icon}
            title={title}
            maximized={maximized}
            currentUrl={currentUrl}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onPanelDragStart={onPanelDragStart}
            onPanelDoubleClick={onPanelDoubleClick}
            onToggleMode={onToggleMode}
            onOpenDevTools={onOpenDevTools}
            onMaximize={onMaximize}
            onMinimize={onMinimize}
            onClose={onClose}
            onNavigateTo={onNavigateTo}
            onBack={onBack}
            onForward={onForward}
            onReload={onReload}
          />
        )}
        {loading && <LoadingRing />}
      </div>
    </>
  );
}