import React from 'react';
import { Box } from '@mui/material';

export default function TextNode({ node }) {
  const { bounds, text, color, size = 14, align = 'left' } = node;
  const justify =
    align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

  return (
    <Box sx={{
      position: 'absolute',
      left: bounds.x,
      top: bounds.y,
      width: bounds.w,
      height: bounds.h,
      color,
      fontSize: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: justify,
      textAlign: align,
      fontFamily: 'Inter, system-ui, sans-serif',
      lineHeight: 1.2,
      pointerEvents: 'none',
      userSelect: 'none',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    }}>
      {text}
    </Box>
  );
}