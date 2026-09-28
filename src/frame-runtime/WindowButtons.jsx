import React from 'react';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import FilterNoneIcon from '@mui/icons-material/FilterNone';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CloseIcon from '@mui/icons-material/Close';

import Cell from './Cell';

/**
 * Классический вертикальный столбец системных кнопок:
 *   [развернуть / восстановить]
 *   [свернуть]
 *   [закрыть]
 *
 * Используется и в control-режиме, и в search-режиме.
 */
export default function WindowButtons({
  iconSize,
  maximized,
  onMaximize,
  onMinimize,
  onClose,
  col = 5,
}) {
  return (
    <>
      <Cell
        row="1" col={col}
        cursor="pointer"
        onClick={onMaximize}
        title={maximized ? 'Восстановить' : 'На весь экран'}
      >
        {maximized
          ? <FilterNoneIcon style={{ fontSize: iconSize }} />
          : <CropSquareIcon style={{ fontSize: iconSize }} />}
      </Cell>

      <Cell
        row="2" col={col}
        cursor="pointer"
        onClick={onMinimize}
        title="Свернуть"
      >
        <MinimizeIcon style={{ fontSize: iconSize }} />
      </Cell>

      <Cell
        row="3" col={col}
        cursor="pointer"
        onClick={onClose}
        title="Закрыть окно"
      >
        <CloseIcon style={{ fontSize: iconSize }} />
      </Cell>
    </>
  );
}