import React from 'react';
import { Box } from '@mui/material';
import NodeRenderer from './NodeRenderer';

function RenderTreeNode({ node, offsetX, offsetY, onActivate, onSetValue }) {
  if (!node) return null;

  const x = node.bounds.x - offsetX;
  const y = node.bounds.y - offsetY;

  if (node.clip) {
    return (
      <Box sx={{
        position: 'absolute',
        left: x, top: y,
        width: node.bounds.w,
        height: node.bounds.h,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        {node.children?.map((child) => (
          <RenderTreeNode
            key={child.id}
            node={child}
            offsetX={node.bounds.x}
            offsetY={node.bounds.y}
            onActivate={onActivate}
            onSetValue={onSetValue}
          />
        ))}
      </Box>
    );
  }

  return (
    <>
      <NodeRenderer node={node} x={x} y={y} onActivate={onActivate} onSetValue={onSetValue} />
      {node.children?.map((child) => (
        <RenderTreeNode
          key={child.id}
          node={child}
          offsetX={offsetX}
          offsetY={offsetY}
          onActivate={onActivate}
          onSetValue={onSetValue}
        />
      ))}
    </>
  );
}

export default function Renderer({ frame, onNodeActivate, onNodeSetValue }) {
  if (!frame?.root) return null;

  return (
    <Box sx={{
      position: 'relative',
      width: frame.width,
      height: frame.height,
      overflow: 'hidden',
    }}>
      <RenderTreeNode
        node={frame.root}
        offsetX={0}
        offsetY={0}
        onActivate={onNodeActivate}
        onSetValue={onNodeSetValue}
      />
    </Box>
  );
}