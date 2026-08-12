import React from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import FileMessage from './FileMessage';

const MessageItem = ({ message, downloadState, onDownload }) => {
  const isMe = message.sender === 'me';
  const align = isMe ? 'flex-end' : 'flex-start';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align,
        mb: 2,
        animation: 'fadeIn 0.3s ease',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Typography variant="caption" color="text.secondary" mb={0.5}>
        {message.nickname}
      </Typography>

      {message.type === 'text' ? (
        <Paper
          sx={{
            px: 2,
            py: 1,
            borderRadius: 2,
            bgcolor: isMe ? 'primary.main' : 'grey.300',
            color: isMe ? 'primary.contrastText' : 'text.primary',
            maxWidth: '70%',
            wordBreak: 'break-word',
          }}
        >
          <Typography variant="body2">{message.text}</Typography>
        </Paper>
      ) : (
        <FileMessage
          message={message}
          downloadState={downloadState}
          onDownload={onDownload}
        />
      )}

      <Typography variant="caption" color="text.disabled" mt={0.3}>
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Typography>

      <Divider
        sx={{
          width: '100%',
          mt: 1,
          '&::before, &::after': { borderColor: 'divider' },
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <FiberManualRecordIcon sx={{ fontSize: 8, color: 'text.disabled' }} />
      </Divider>
    </Box>
  );
};

export default MessageItem;