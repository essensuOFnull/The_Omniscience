import React from 'react';
import { Dialog, DialogTitle, DialogActions, Button, Typography } from '@mui/material';

const IncomingCallDialog = ({ callerName, onAccept, onReject }) => {
  return (
    <Dialog open onClose={onReject}>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
        📞 Входящий звонок
      </DialogTitle>
      <Typography sx={{ p: 2 }}>{callerName} звонит...</Typography>
      <DialogActions>
        <Button onClick={onReject} color="error">Отклонить</Button>
        <Button variant="contained" onClick={onAccept} autoFocus>Принять</Button>
      </DialogActions>
    </Dialog>
  );
};

export default IncomingCallDialog;