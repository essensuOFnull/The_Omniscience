import React from 'react';
import { Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import FilterNoneIcon from '@mui/icons-material/FilterNone';

export default function BaseWindowButtons({ onMinimize, onMaximize, onClose, isMaximized, vertical }) {
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: vertical ? 'column' : 'row',
      gap: 0.5,
      zIndex: 1,
      flexShrink: 0,
      padding: vertical ? '4px 0' : '0 4px',
    }}>
      <IconButton size="small" onClick={onMinimize} sx={{ color: '#fff' }}>
        <MinimizeIcon fontSize="small" />
      </IconButton>
      <IconButton size="small" onClick={onMaximize} sx={{ color: '#fff' }}>
        {isMaximized ? <FilterNoneIcon fontSize="small" /> : <CropSquareIcon fontSize="small" />}
      </IconButton>
      <IconButton size="small" onClick={onClose} sx={{ color: '#fff' }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}