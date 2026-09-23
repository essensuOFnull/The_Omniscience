import React from 'react';
import { Box } from '@mui/material';
import { useSetting } from '../settings/useSettings';

const CUSTOM_BACKGROUNDS = {
  // 'MyCustom': React.lazy(() => import('./backgrounds/MyCustom')),
};

export default function BackgroundRenderer() {
  const bg = useSetting('background');
  const { type, source, color, opacity, componentName } = bg;

  if (type === 'color' || (!source && type !== 'component')) {
    return <Box sx={{ width: '100%', height: '100%', backgroundColor: color, opacity }} />;
  }
  if (type === 'image') {
    return (
      <Box sx={{
        width: '100%', height: '100%', opacity,
        backgroundImage: `url('${source}')`,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }} />
    );
  }
  if (type === 'video') {
    return (
      <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', opacity }}>
        <video autoPlay loop muted playsInline src={source}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </Box>
    );
  }
  if (type === 'iframe') {
    return (
      <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', opacity }}>
        <iframe src={source} title="bg"
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