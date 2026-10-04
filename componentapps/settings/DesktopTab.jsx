import React from 'react';
import {
  Box, Typography, Switch, FormControlLabel, TextField, Divider, Alert,
} from '@mui/material';
import { useSetting } from '../../src/settings/useSettings';
import { settingsStore } from '../../src/settings/store';

export default function DesktopTab() {
  const enabled = useSetting('desktopFiles.enabled');
  const path = useSetting('desktopFiles.path');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControlLabel
        control={
          <Switch
            checked={!!enabled}
            onChange={(e) => settingsStore.update('desktopFiles.enabled', e.target.checked)}
            color="secondary"
          />
        }
        label={
          <Typography variant="body2" sx={{ color: '#fff' }}>
            Показывать файлы на рабочем столе
          </Typography>
        }
      />

      {enabled && (
        <>
          <Alert
            severity="info"
            sx={{ bgcolor: 'rgba(168,85,247,0.1)', color: '#fff' }}
          >
            По умолчанию используется системная папка Desktop (из XDG user-dirs).
            Оставьте поле пустым, чтобы использовать её.
          </Alert>

          <TextField
            label="Путь к папке"
            value={path || ''}
            onChange={(e) => settingsStore.update('desktopFiles.path', e.target.value || null)}
            size="small"
            placeholder="/home/user/Desktop"
            sx={{
              '& input': { color: '#fff', fontFamily: 'monospace', fontSize: 13 },
              '& label': { color: '#aaa' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
            }}
          />
        </>
      )}

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      <Typography variant="caption" sx={{ color: '#888' }}>
        Двойной клик по файлу — открыть через систему. Правый клик — контекстное меню.
      </Typography>
    </Box>
  );
}