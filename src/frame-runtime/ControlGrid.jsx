import React from 'react';
import AnchorLeft from './AnchorLeft';
import WindowButtons from './WindowButtons';
import ResizeCells from './ResizeCells';

export default function ControlGrid({
  gridStyle,
  iconSize,
  icon,
  maximized,
  onMaximize,
  onMinimize,
  onClose,
  onWindowDragStart,
  onPanelDragStart,
  onPanelDoubleClick,
  onToggleMode,
  onOpenDevTools,
  onResize,
}) {
  return (
    <div style={gridStyle}>
      <AnchorLeft
        icon={icon}
        iconSize={iconSize}
        onPanelDragStart={onPanelDragStart}
        onPanelDoubleClick={onPanelDoubleClick}
        onToggleMode={onToggleMode}
        onOpenDevTools={onOpenDevTools}
      />

      <WindowButtons
        iconSize={iconSize}
        maximized={maximized}
        onMaximize={onMaximize}
        onMinimize={onMinimize}
        onClose={onClose}
        col={2}
      />

      <ResizeCells
        iconSize={iconSize}
        onResize={onResize}
        onWindowDragStart={onWindowDragStart}
      />
    </div>
  );
}