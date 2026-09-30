import React from 'react';
import NorthWestIcon from '@mui/icons-material/NorthWest';
import NorthIcon from '@mui/icons-material/North';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import WestIcon from '@mui/icons-material/West';
import EastIcon from '@mui/icons-material/East';
import SouthWestIcon from '@mui/icons-material/SouthWest';
import SouthIcon from '@mui/icons-material/South';
import SouthEastIcon from '@mui/icons-material/SouthEast';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import Cell from './Cell';

const CURSORS = {
  nw: 'nwse-resize',
  n:  'ns-resize',
  ne: 'nesw-resize',
  w:  'ew-resize',
  e:  'ew-resize',
  sw: 'nesw-resize',
  s:  'ns-resize',
  se: 'nwse-resize',
};

export default function ResizeCells({
  iconSize,
  onResize,
  onWindowDragStart,
}) {
  return (
    <>
      {/* Столбец 3 — NW / W / SW */}
      <Cell row="1" col="3" cursor={CURSORS.nw} onMouseDown={onResize('nw')} title="Растянуть ↖">
        <NorthWestIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell row="2" col="3" cursor={CURSORS.w} onMouseDown={onResize('w')} title="Растянуть ←">
        <WestIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell row="3" col="3" cursor={CURSORS.sw} onMouseDown={onResize('sw')} title="Растянуть ↙">
        <SouthWestIcon style={{ fontSize: iconSize }} />
      </Cell>

      {/* Столбец 4 — N / move / S */}
      <Cell row="1" col="4" cursor={CURSORS.n} onMouseDown={onResize('n')} title="Растянуть ↑">
        <NorthIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell
        row="2" col="4"
        cursor="move"
        onMouseDown={onWindowDragStart}
        title="Переместить окно"
        style={{ background: 'rgba(168,85,247,0.22)' }}
      >
        <OpenWithIcon style={{ fontSize: Math.round(iconSize * 1.3) }} />
      </Cell>
      <Cell row="3" col="4" cursor={CURSORS.s} onMouseDown={onResize('s')} title="Растянуть ↓">
        <SouthIcon style={{ fontSize: iconSize }} />
      </Cell>

      {/* Столбец 5 — NE / E / SE */}
      <Cell row="1" col="5" cursor={CURSORS.ne} onMouseDown={onResize('ne')} title="Растянуть ↗">
        <NorthEastIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell row="2" col="5" cursor={CURSORS.e} onMouseDown={onResize('e')} title="Растянуть →">
        <EastIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell row="3" col="5" cursor={CURSORS.se} onMouseDown={onResize('se')} title="Растянуть ↘">
        <SouthEastIcon style={{ fontSize: iconSize }} />
      </Cell>
    </>
  );
}