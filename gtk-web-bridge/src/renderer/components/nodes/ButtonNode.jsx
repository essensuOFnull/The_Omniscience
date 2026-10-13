import React, { useState } from 'react';
import { Box } from '@mui/material';

export default function ButtonNode({ node, onActivate }) {
  const { bounds, color = '#45475a', radius = 6 } = node;
  const [hover, setHover] = useState(false);

  return (
    <Box
      onClick={() => onActivate && onActivate(node.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      sx={{
        position: 'absolute',
        left: bounds.x,
        top: bounds.y,
        width: bounds.w,
        height: bounds.h,
        backgroundColor: color,
        borderRadius: `${radius}px`,
        cursor: 'pointer',
        transition: 'filter 120ms ease, transform 60ms ease',
        filter: hover ? 'brightness(1.25)' : 'brightness(1)',
        transform: hover ? 'scale(1.01)' : 'scale(1)',
        userSelect: 'none',
        '&:active': { transform: 'scale(0.98)' },
      }}
    />
  );
}