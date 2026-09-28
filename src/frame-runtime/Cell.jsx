import React from 'react';
import { Tooltip } from '@mui/material';

const DEFAULT_BG = 'rgba(255,255,255,0.03)';
const HOVER_BG   = 'rgba(168,85,247,0.18)';

export default function Cell({
  children,
  cursor,
  onMouseDown,
  onClick,
  onDoubleClick,
  title,
  row,
  col,
  style,
}) {
  const baseBg = style?.background || DEFAULT_BG;

  const inner = (
    <div
      onMouseDown={onMouseDown}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        cursor: cursor || 'default',
        borderRadius: 4,
        background: baseBg,
        color: '#fff',
        fontSize: 14,
        boxSizing: 'border-box',
        transition: 'background 0.12s',
        gridColumn: col,
        gridRow: row,
        ...style,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = HOVER_BG; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = baseBg; }}
    >
      {children}
    </div>
  );

  return title
    ? <Tooltip title={title} enterDelay={400}>{inner}</Tooltip>
    : inner;
}