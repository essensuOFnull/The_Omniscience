import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExtensionIcon from '@mui/icons-material/Extension';

export default function QuickLaunch({ apps = [], onLaunch, onAdd }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center', flexShrink: 0 }}>
      {apps.map((app) => (
        <Tooltip key={app.id} title={app.title || app.id}>
          <IconButton
            size="small"
            onClick={() => onLaunch?.(app)}
            sx={{ WebkitAppRegion: 'no-drag', width: 32, height: 32 }}
          >
            {app.icon
              ? <img src={app.icon} width={20} height={20} alt="" draggable={false} />
              : <ExtensionIcon sx={{ fontSize: 18 }} />}
          </IconButton>
        </Tooltip>
      ))}
      <IconButton
        size="small"
        onClick={onAdd}
        sx={{ WebkitAppRegion: 'no-drag', width: 32, height: 32, color: '#aaa' }}
        title="Добавить в панель"
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}