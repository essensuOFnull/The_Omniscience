import React from 'react';
import {
  Box, Typography, Paper, IconButton, CircularProgress, Chip
} from '@mui/material';
import {
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { formatSize } from '../utils/helpers';

const typeIcons = {
  image: <ImageIcon />,
  video: <VideoIcon />,
  audio: <AudioIcon />,
  default: <FileIcon />,
};

const getIcon = (mime) => {
  if (mime.startsWith('image/')) return typeIcons.image;
  if (mime.startsWith('video/')) return typeIcons.video;
  if (mime.startsWith('audio/')) return typeIcons.audio;
  return typeIcons.default;
};

const FileMessage = ({ message, downloadState, onDownload }) => {
  const { id, file, downloadedUrl: msgDownloadedUrl } = message;
  const state = downloadState || { downloading: false, progress: 0, downloadedUrl: null };
  // Берём URL либо из состояния, либо напрямую из сообщения (если пришёл уже готовый)
  const downloadedUrl = state.downloadedUrl || msgDownloadedUrl;
  const downloading = state.downloading || false;
  const progress = state.progress || 0;
  const isMedia =
    file.type.startsWith('image/') ||
    file.type.startsWith('video/') ||
    file.type.startsWith('audio/');

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper', maxWidth: 320 }}>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        {getIcon(file.type)}
        <Box flexGrow={1} overflow="hidden">
          <Typography variant="body2" noWrap fontWeight={500}>
            {file.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatSize(file.size)} · {file.type}
          </Typography>
        </Box>
      </Box>

      <Box display="flex" alignItems="center" gap={1}>
        {downloading ? (
          <Box position="relative" display="inline-flex">
            <CircularProgress variant="determinate" value={progress} size={36} />
            <Box
              position="absolute"
              top={0}
              left={0}
              bottom={0}
              right={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Typography variant="caption">{`${Math.round(progress)}%`}</Typography>
            </Box>
          </Box>
        ) : downloadedUrl ? (
          <IconButton component="a" href={downloadedUrl} download={file.name} size="small" color="primary">
            <DownloadIcon />
          </IconButton>
        ) : (
          <IconButton onClick={() => onDownload(id, file.type)} size="small" color="primary">
            <DownloadIcon />
          </IconButton>
        )}
        {downloadedUrl && (
          <Chip
            icon={<CheckCircleIcon />}
            label="Готово"
            size="small"
            color="success"
            variant="outlined"
          />
        )}
      </Box>

      {downloadedUrl && isMedia && (
        <Box mt={1.5} borderRadius={1} overflow="hidden">
          {file.type.startsWith('image/') && (
            <img src={downloadedUrl} alt={file.name} style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 4 }} />
          )}
          {file.type.startsWith('video/') && (
            <video controls style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 4 }}>
              <source src={downloadedUrl} type={file.type} />
            </video>
          )}
          {file.type.startsWith('audio/') && (
            <audio controls style={{ width: '100%' }}>
              <source src={downloadedUrl} type={file.type} />
            </audio>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default FileMessage;