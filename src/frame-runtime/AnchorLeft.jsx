import React from 'react';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SearchIcon from '@mui/icons-material/Search';
import DeveloperModeIcon from '@mui/icons-material/DeveloperMode';
import Cell from './Cell';

export default function AnchorLeft({
  icon,
  iconSize,
  onPanelDragStart,
  onPanelDoubleClick,
  onToggleMode,
  onOpenDevTools,
}) {
  return (
    <>
      <Cell
        row="1" col="1"
        cursor="grab"
        onMouseDown={onPanelDragStart}
        onDoubleClick={onPanelDoubleClick}
        title="Перетащить панель"
      >
        {icon
          ? <img
              src={icon}
              width={iconSize}
              height={iconSize}
              alt=""
              draggable={false}
              style={{ borderRadius: 2 }}
            />
          : <DragIndicatorIcon style={{ fontSize: iconSize }} />}
      </Cell>

      <Cell
        row="2" col="1"
        cursor="pointer"
        onClick={onToggleMode}
        title="Режим поиска / браузера"
      >
        <SearchIcon style={{ fontSize: iconSize }} />
      </Cell>

      <Cell
        row="3" col="1"
        cursor="pointer"
        onClick={onOpenDevTools}
        title="Открыть React DevTools"
      >
        <DeveloperModeIcon style={{ fontSize: iconSize }} />
      </Cell>
    </>
  );
}