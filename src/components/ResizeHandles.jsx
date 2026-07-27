import React from 'react';
import { Box } from '@mui/material';

const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

const styleMap = {
  n:  { top: -4, left: 8, right: 8, height: 8, cursor: 'n-resize' },
  s:  { bottom: -4, left: 8, right: 8, height: 8, cursor: 's-resize' },
  e:  { right: -4, top: 8, bottom: 8, width: 8, cursor: 'e-resize' },
  w:  { left: -4, top: 8, bottom: 8, width: 8, cursor: 'w-resize' },
  ne: { top: -4, right: -4, width: 12, height: 12, cursor: 'ne-resize' },
  nw: { top: -4, left: -4, width: 12, height: 12, cursor: 'nw-resize' },
  se: { bottom: -4, right: -4, width: 12, height: 12, cursor: 'se-resize' },
  sw: { bottom: -4, left: -4, width: 12, height: 12, cursor: 'sw-resize' },
};

export default function ResizeHandles({ onResizeMouseDown }) {
  return (
    <>
      {directions.map(dir => (
        <Box
          key={dir}
          onMouseDown={(e) => { e.stopPropagation(); onResizeMouseDown(dir)?.(e); }}
          sx={{ position: 'absolute', zIndex: 10, ...styleMap[dir] }}
        />
      ))}
    </>
  );
}