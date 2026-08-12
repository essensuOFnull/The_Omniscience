import React, { useRef } from 'react';
import { Paper, IconButton, TextField } from '@mui/material';
import { Send as SendIcon, AttachFile as AttachFileIcon } from '@mui/icons-material';

const InputPanel = ({ text, onTextChange, onSend, onFileSelect }) => {
  const fileInputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <Paper square elevation={3} sx={{ p: 1, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={(e) => {
          onFileSelect(e);
          e.target.value = null;
        }}
      />
      <IconButton color="primary" onClick={() => fileInputRef.current?.click()}>
        <AttachFileIcon />
      </IconButton>

      <TextField
        fullWidth
        multiline
        maxRows={4}
        placeholder="Введите сообщение..."
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        size="small"
        variant="outlined"
      />

      <IconButton color="primary" onClick={onSend}>
        <SendIcon />
      </IconButton>
    </Paper>
  );
};

export default InputPanel;