import React, { useEffect, useRef, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import MessageItem from './MessageItem';

const MessageList = ({ messages, downloadStates, onDownload, typingUser, onDropFile }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && onDropFile) {
      onDropFile(files[0]);
    }
  }, [onDropFile]);

  return (
    <Box
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      sx={{
        flexGrow: 1,
        overflow: 'auto',
        px: 2,
        py: 1,
        bgcolor: 'grey.50',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          message={msg}
          downloadState={downloadStates[msg.id]}
          onDownload={onDownload}
        />
      ))}
      {typingUser && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1, px: 2 }}>
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
            {typingUser} печатает...
          </Typography>
        </Box>
      )}
      <div ref={bottomRef} />
    </Box>
  );
};

export default MessageList;