import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { buildWindowTree } from './groupWindows.js';
import WindowGroup from './WindowGroup.jsx';

export default function WindowList({ windows = [], onFocus, onClose }) {
  const groups = useMemo(() => buildWindowTree(windows), [windows]);

  return (
    <Box sx={{
      display: 'flex',
      gap: 0.75,
      overflowX: 'auto',
      overflowY: 'hidden',
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      WebkitAppRegion: 'no-drag',
      '&::-webkit-scrollbar': { height: 0, width: 0 },
    }}>
      {groups.map((g) => (
        <Box key={g.id} sx={{ flexShrink: 0 }}>
          <WindowGroup root={g} onFocus={onFocus} onClose={onClose} />
        </Box>
      ))}
    </Box>
  );
}