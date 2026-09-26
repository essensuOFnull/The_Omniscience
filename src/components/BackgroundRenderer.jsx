import React from 'react';
import { Box } from '@mui/material';
import { useSetting } from '../settings/useSettings';

const CUSTOM_BACKGROUNDS = {
  // 'MyCustom': React.lazy(() => import('./backgrounds/MyCustom')),
};

// Локальный резолвер: URL оставляем, абсолютный путь → file://,
// относительный → new URL относительно текущего shell (index.html).
function resolveSource(path) {
  if (!path) return path;
  if (/^(https?|data|blob|file):\/\//i.test(path)) return path;

  if (/^([a-zA-Z]:[\\/]|\/)/.test(path)) {
    let p = path.replace(/\\/g, '/');
    if (!p.startsWith('/')) p = '/' + p;
    return 'file://' + p;
  }

  try {
    return new URL(path, window.location.href).href;
  } catch {
    return path;
  }
}

export default function BackgroundRenderer() {
  const bg = useSetting('background');
  const { type, source, color, opacity, componentName } = bg;
  const src = resolveSource(source);

  if (type === 'color' || (!source && type !== 'component')) {
    return <Box sx={{ width: '100%', height: '100%', backgroundColor: color, opacity }} />;
  }
  if (type === 'image') {
    return (
      <Box sx={{
        width: '100%', height: '100%', opacity,
        backgroundImage: `url('${src}')`,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }} />
    );
  }
  if (type === 'video') {
    return (
      <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', opacity }}>
        <video autoPlay loop muted playsInline src={src}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </Box>
    );
  }
  if (type === 'iframe') {
    return (
      <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', opacity }}>
        <iframe src={src} title="bg"
          style={{ width: '100%', height: '100%', border: 'none' }}
          sandbox="allow-scripts allow-same-origin allow-presentation" />
      </Box>
    );
  }
  if (type === 'component') {
    const Comp = CUSTOM_BACKGROUNDS[componentName];
    if (!Comp) return <Box sx={{ width: '100%', height: '100%', backgroundColor: color, opacity }} />;
    return (
      <React.Suspense fallback={null}>
        <Box sx={{ width: '100%', height: '100%', opacity }}><Comp /></Box>
      </React.Suspense>
    );
  }
  return null;
}