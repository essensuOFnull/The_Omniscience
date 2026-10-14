import React from 'react';
import { Box } from '@mui/material';
import * as MuiIcons from '@mui/icons-material';

function kebabToPascal(s) {
  return s.split(/[-_ ]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function resolveIcon(name) {
  if (!name) return null;
  const candidates = [kebabToPascal(name), kebabToPascal(name) + 'Outlined', 'Folder'];
  for (const c of candidates) if (MuiIcons[c]) return MuiIcons[c];
  return null;
}

export default function ImageNode({ node }) {
  const { bounds, src, color } = node;
  const base = {
    position: 'absolute',
    left: bounds.x,
    top: bounds.y,
    width: bounds.w,
    height: bounds.h,
  };

  // data-URI PNG
  if (src?.startsWith('data:')) {
    return (
      <Box component="img" src={src}
        sx={{ ...base, objectFit: 'contain', pointerEvents: 'none' }} />
    );
  }

  // Путь к файлу
  if (src?.startsWith('file:')) {
    return (
      <Box component="img" src={`file://${src.slice(5)}`}
        sx={{ ...base, objectFit: 'contain', pointerEvents: 'none' }} />
    );
  }

  // Имя иконки из icon-theme
  if (src?.startsWith('icon:')) {
    const name = src.slice(5);
    const Icon = resolveIcon(name);
    const size = Math.min(bounds.w, bounds.h);
    if (Icon) {
      return (
        <Box sx={{
          ...base,
          color: color || 'text.primary',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <Icon sx={{ fontSize: size }} />
        </Box>
      );
    }
    // Неизвестная иконка — красная плашка, чтобы было видно
    return (
      <Box sx={{
        ...base,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(243, 139, 168, 0.7)',
        fontSize: 8, fontFamily: 'monospace', textAlign: 'center',
        overflow: 'hidden',
      }}>
        {name.slice(0, 6)}
      </Box>
    );
  }

  return (
    <Box component="img" src={src} sx={{ ...base, objectFit: 'contain', pointerEvents: 'none' }} />
  );
}