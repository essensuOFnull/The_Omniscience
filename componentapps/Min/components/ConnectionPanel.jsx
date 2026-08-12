import React, { useState } from 'react';
import {
  Box, Button, TextField, Typography, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { CheckCircle, Cancel, Close } from '@mui/icons-material';

const ConnectionPanel = ({ connected, activePort, onCreateServer, onJoinServer, onDisconnect }) => {
  const [mode, setMode] = useState(null); // 'host' или 'join'
  const [port, setPort] = useState('3000');

  const handleOpen = (type) => {
    setMode(type);
    setPort('3000');
  };

  const handleConfirm = () => {
    if (!port) return;
    if (mode === 'host') {
      onCreateServer(port);
    } else if (mode === 'join') {
      onJoinServer(port);
    }
    setMode(null);
  };

  if (connected) {
    return (
      <Box sx={{flexDirection:'row',display:'flex',gap:1,alignItems:'center'}}>
        <CheckCircle fontSize="small" color="success" sx={{display:'flex'}}/>
        <Typography variant="body2" sx={{display:'flex'}}>
          Порт {activePort}
        </Typography>
        <IconButton size="small" onClick={onDisconnect} sx={{display:'flex'}}>
          <Close fontSize="small" />
        </IconButton>
      </Box>
    );
  }

  return (
    <>
      <Box display="flex" gap={1}>
        <Button variant="outlined" size="small" onClick={() => handleOpen('host')}>
          Создать
        </Button>
        <Button variant="outlined" size="small" onClick={() => handleOpen('join')}>
          Подключиться
        </Button>
      </Box>

      <Dialog open={!!mode} onClose={() => setMode(null)}>
        <DialogTitle>
          {mode === 'host' ? 'Создать сервер' : 'Подключиться к серверу'}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Порт"
            type="number"
            fullWidth
            value={port}
            onChange={(e) => setPort(e.target.value)}
            inputProps={{ min: 1, max: 65535 }}
            autoFocus
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMode(null)}>Отмена</Button>
          <Button variant="contained" onClick={handleConfirm}>
            {mode === 'host' ? 'Создать' : 'Подключиться'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ConnectionPanel;