import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import * as MuiIcons from '@mui/icons-material';

// ---------- helpers ---------------------------------------------------------

function kebabToPascal(s) {
  return s.split(/[-_ ]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function resolveIcon(name) {
  if (!name) return null;
  const candidates = [
    kebabToPascal(name),
    kebabToPascal(name) + 'Outlined',
    'Folder',
  ];
  for (const c of candidates) if (MuiIcons[c]) return MuiIcons[c];
  return null;
}

function baseStyle(node, x, y) {
  return {
    position: 'absolute',
    left: x,
    top: y,
    width: node.bounds.w,
    height: node.bounds.h,
    pointerEvents: 'none',
    opacity: node.opacity !== undefined ? node.opacity : 1,
  };
}

// ---------- node components -------------------------------------------------

function WindowNode({ node, x, y }) {
  return (
    <Box sx={{ ...baseStyle(node, x, y), backgroundColor: node.bg || '#1e1e2e' }} />
  );
}

function BoxNode() { return null; }
function InvisibleNode() { return null; }

function ButtonNode({ node, x, y, onActivate }) {
  const [hover, setHover] = useState(false);
  const disabled = node.sensitive === false;

  return (
    <Box
      onClick={() => !disabled && onActivate?.(node.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      sx={{
        ...baseStyle(node, x, y),
        pointerEvents: disabled ? 'none' : 'auto',
        backgroundColor: node.bg || 'transparent',
        borderRadius: `${node.radius ?? 6}px`,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'filter 120ms ease, transform 60ms ease',
        filter: disabled ? 'grayscale(0.7)' : (hover ? 'brightness(1.2)' : 'brightness(1)'),
        transform: hover && !disabled ? 'scale(1.01)' : 'scale(1)',
        userSelect: 'none',
        '&:active': { transform: disabled ? 'scale(1)' : 'scale(0.98)' },
      }}
    />
  );
}

function LabelNode({ node, x, y }) {
  const justify = node.align === 'center' ? 'center'
                : node.align === 'right'  ? 'flex-end'
                : 'flex-start';
  return (
    <Box sx={{
      ...baseStyle(node, x, y),
      color: node.color || '#cdd6f4',
      fontSize: node.size || 14,
      display: 'flex',
      alignItems: 'center',
      justifyContent: justify,
      textAlign: node.align || 'left',
      fontFamily: 'Inter, system-ui, sans-serif',
      lineHeight: 1.2,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    }}>
      {node.text}
    </Box>
  );
}

function ImageNode({ node, x, y }) {
  const style = baseStyle(node, x, y);

  // data-URI PNG — самая частая ветка для Nautilus/Adwaita
  if (node.src?.startsWith('data:')) {
    return (
      <Box
        component="img"
        src={node.src}
        sx={{ ...style, objectFit: 'contain' }}
        draggable={false}
      />
    );
  }

  // Путь к файлу (GFileIcon без themed-обёртки)
  if (node.src?.startsWith('file:')) {
    return (
      <Box
        component="img"
        src={`file://${node.src.slice(5)}`}
        sx={{ ...style, objectFit: 'contain' }}
        draggable={false}
      />
    );
  }

  // Имя иконки из icon-theme
  if (node.src?.startsWith('icon:')) {
    const name = node.src.slice(5);
    const Icon = resolveIcon(name);
    const size = Math.min(node.bounds.w, node.bounds.h);

    if (Icon) {
      return (
        <Box sx={{
          ...style,
          color: node.color || 'text.primary',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon sx={{ fontSize: size }} />
        </Box>
      );
    }
    // Неизвестная иконка — красная плашка с куском имени
    return (
      <Box sx={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(243, 139, 168, 0.7)',
        fontSize: 8,
        fontFamily: 'monospace',
        overflow: 'hidden',
        textAlign: 'center',
      }}>
        {name.slice(0, 6)}
      </Box>
    );
  }

  return null;
}

function EntryNode({ node, x, y, onSetValue }) {
  const [localText, setLocalText] = useState(node.text || '');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setLocalText(node.text || '');
  }, [node.text, focused]);

  const showPlaceholder = !localText && node.placeholder;

  return (
    <Box sx={{
      ...baseStyle(node, x, y),
      pointerEvents: 'auto',
      backgroundColor: node.bg || '#181825',
      border: `${node.borderWidth ?? 1}px solid ${
        focused ? '#89b4fa' : (node.borderColor || '#585b70')
      }`,
      borderRadius: `${node.radius ?? 6}px`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
      boxSizing: 'border-box',
      transition: 'border-color 120ms ease',
    }}>
      <input
        value={localText}
        placeholder={node.placeholder || ''}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          setLocalText(e.target.value);
          onSetValue?.(node.id, 'text', e.target.value);
        }}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: node.color || '#cdd6f4',
          fontSize: 14,
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: 0,
          minWidth: 0,
        }}
      />
    </Box>
  );
}

function CheckboxNode({ node, x, y, onSetValue }) {
  const boxSize = Math.min(node.bounds.h, 20);
  const [hover, setHover] = useState(false);
  return (
    <Box
      onClick={() => onSetValue?.(node.id, 'checked', !node.checked)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      sx={{
        ...baseStyle(node, x, y),
        pointerEvents: 'auto',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        userSelect: 'none',
      }}
    >
      <Box sx={{
        width: boxSize,
        height: boxSize,
        borderRadius: `${node.radius ?? 4}px`,
        border: `${node.borderWidth ?? 1}px solid ${node.borderColor || '#585b70'}`,
        backgroundColor: node.checked ? '#89b4fa' : (hover ? '#313244' : (node.bg || 'transparent')),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#1e1e2e',
        fontSize: boxSize * 0.7,
        fontWeight: 700,
        flexShrink: 0,
        transition: 'background-color 120ms ease',
      }}>
        {node.checked ? '✓' : ''}
      </Box>
      {node.text && (
        <Box component="span" sx={{ color: node.color || '#cdd6f4', fontSize: 14 }}>
          {node.text}
        </Box>
      )}
    </Box>
  );
}

function SwitchNode({ node, x, y, onSetValue }) {
  const trackW = node.bounds.w;
  const trackH = node.bounds.h;
  const knobD = trackH - 4;
  const knobX = node.checked ? trackW - knobD - 2 : 2;
  const [hover, setHover] = useState(false);

  return (
    <Box
      onClick={() => onSetValue?.(node.id, 'checked', !node.checked)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      sx={{
        ...baseStyle(node, x, y),
        pointerEvents: 'auto',
        cursor: 'pointer',
        backgroundColor: node.checked
          ? (hover ? '#9cc3fb' : '#89b4fa')
          : (hover ? '#525568' : '#45475a'),
        borderRadius: trackH / 2,
        transition: 'background-color 150ms ease',
      }}
    >
      <Box sx={{
        position: 'absolute',
        top: 2,
        left: knobX,
        width: knobD,
        height: knobD,
        borderRadius: '50%',
        backgroundColor: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        transition: 'left 150ms ease',
      }} />
    </Box>
  );
}

function ProgressNode({ node, x, y }) {
  const pct = Math.max(0, Math.min(1, node.fraction || 0)) * 100;
  return (
    <Box sx={{
      ...baseStyle(node, x, y),
      backgroundColor: '#313244',
      borderRadius: node.bounds.h / 2,
      overflow: 'hidden',
    }}>
      <Box sx={{
        height: '100%',
        width: `${pct}%`,
        backgroundColor: '#89b4fa',
        transition: 'width 200ms ease',
      }} />
    </Box>
  );
}

function SeparatorNode({ node, x, y }) {
  const vertical = node.orientation === 'vertical';
  return (
    <Box sx={{
      ...baseStyle(node, x, y),
      backgroundColor: '#585b70',
      width: vertical ? 1 : node.bounds.w,
      height: vertical ? node.bounds.h : 1,
    }} />
  );
}

// ---------- dispatcher -----------------------------------------------------

export default function NodeRenderer({ node, x, y, onActivate, onSetValue }) {
  switch (node.type) {
    case 'window':     return <WindowNode node={node} x={x} y={y} />;
    case 'box':        return <BoxNode />;
    case 'invisible':  return <InvisibleNode />;
    case 'button':     return <ButtonNode node={node} x={x} y={y} onActivate={onActivate} />;
    case 'label':      return <LabelNode node={node} x={x} y={y} />;
    case 'image':      return <ImageNode node={node} x={x} y={y} />;
    case 'entry':      return <EntryNode node={node} x={x} y={y} onSetValue={onSetValue} />;
    case 'checkbox':   return <CheckboxNode node={node} x={x} y={y} onSetValue={onSetValue} />;
    case 'switch':     return <SwitchNode node={node} x={x} y={y} onSetValue={onSetValue} />;
    case 'progress':   return <ProgressNode node={node} x={x} y={y} />;
    case 'separator':  return <SeparatorNode node={node} x={x} y={y} />;
    case 'scrolled':   return null; // контейнер, обрезка делается в Renderer
    default:           return null;
  }
}