import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';

export default function Clock({ showMs = false }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), showMs ? 33 : 1000);
    return () => clearInterval(id);
  }, [showMs]);

  const pad = (n, w = 2) => String(n).padStart(w, '0');
  let text =
    `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  if (showMs) text += `.${pad(now.getMilliseconds(), 3)}`;

  return (
    <Box sx={{
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: 12,
      whiteSpace: 'nowrap',
      userSelect: 'none',
      WebkitAppRegion: 'no-drag',
      letterSpacing: '0.3px',
      opacity: 0.9,
    }}>
      {text}
    </Box>
  );
}