import React from 'react';
import { Box } from '@mui/material';

export default function RectNode({ node }) {
  const { bounds, color, radius = 0 } = node;
  return (
    <Box sx={{
      position: 'absolute',
      left: bounds.x,
      top: bounds.y,
      width: bounds.w,
      height: bounds.h,
      backgroundColor: color,
      borderRadius: `${radius}px`,
      pointerEvents: 'none',
    }} />
  );
}