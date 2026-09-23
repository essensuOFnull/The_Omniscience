import React, { useState } from 'react';
import {
  Box, Typography, Switch, FormControlLabel, Divider, Button,
  TextField, Alert, FormControl, InputLabel, Select, MenuItem, Stack,
} from '@mui/material';
import { useSetting } from '../settings/useSettings';
import { settingsStore } from '../settings/store';
import defaultAnimations from '../../themes/window_animations/default';
import noneAnimations from '../../themes/window_animations/none';

const MODES = { DEFAULT: 'default', CUSTOM: 'custom' };

export default function AnimationTab() {
  const animationsEnabled = useSetting('animationsEnabled');
  const customAnimations = useSetting('customAnimations');

  const [mode, setMode] = useState(customAnimations ? MODES.CUSTOM : MODES.DEFAULT);
  const [codeInput, setCodeInput] = useState(
    customAnimations ? JSON.stringify(customAnimations, null, 2) : ''
  );
  const [error, setError] = useState('');

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setError('');
    if (nextMode === MODES.DEFAULT) {
      settingsStore.update('customAnimations', null);
      setCodeInput('');
    }
  };

  const handleApply = () => {
    try {
      const parsed = JSON.parse(codeInput);
      settingsStore.update('customAnimations', parsed);
      setError('');
    } catch (e) {
      setError('Ошибка JSON: ' + e.message);
    }
  };

  const handleLoadDefault = () => {
    setCodeInput(JSON.stringify(defaultAnimations, null, 2));
    setError('');
  };

  const handleLoadNone = () => {
    setCodeInput(JSON.stringify(noneAnimations, null, 2));
    setError('');
  };

  return (
    <Stack spacing={2}>
      <FormControlLabel
        control={<Switch checked={animationsEnabled}
          onChange={(e) => settingsStore.update('animationsEnabled', e.target.checked)}
          color="secondary" />}
        label={<Typography variant="body2" sx={{ color: '#fff' }}>Включить анимации окон</Typography>}
      />

      {!animationsEnabled && (
        <Alert severity="warning" sx={{ bgcolor: 'rgba(255,180,0,0.1)', color: '#fff' }}>
          Анимации отключены — все переходы мгновенные.
        </Alert>
      )}

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      <FormControl fullWidth size="small" disabled={!animationsEnabled}>
        <InputLabel sx={{ color: '#aaa' }}>Режим анимаций</InputLabel>
        <Select value={mode} label="Режим анимаций"
          onChange={(e) => handleModeChange(e.target.value)}
          sx={{ color: '#fff',
            '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
            '& .MuiSvgIcon-root': { color: '#aaa' } }}>
          <MenuItem value={MODES.DEFAULT}>Стандартные</MenuItem>
          <MenuItem value={MODES.CUSTOM}>Кастомные (JSON)</MenuItem>
        </Select>
      </FormControl>

      {mode === MODES.CUSTOM && animationsEnabled && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button size="small" variant="outlined" onClick={handleLoadDefault}
              sx={{ color: '#a855f7', borderColor: '#a855f7' }}>Загрузить стандартные</Button>
            <Button size="small" variant="outlined" onClick={handleLoadNone}
              sx={{ color: '#a855f7', borderColor: '#a855f7' }}>Загрузить «мгновенные»</Button>
          </Stack>

          <TextField multiline rows={12} fullWidth value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder={`{\n  "create": {\n    "initial": { "scale": 0, "opacity": 0 },\n    "animate": { "scale": 1, "opacity": 1 }\n  }\n}`}
            sx={{ '& textarea': { color: '#7effa0', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.4 },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }} />

          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={handleApply}
              sx={{ bgcolor: '#a855f7', '&:hover': { bgcolor: '#9333ea' } }}>Применить</Button>
            <Button variant="outlined" onClick={handleLoadDefault}
              sx={{ color: '#aaa', borderColor: 'rgba(255,255,255,0.2)' }}>Сбросить</Button>
          </Stack>

          {customAnimations && (
            <Alert severity="success" sx={{ bgcolor: 'rgba(76,175,80,0.1)', color: '#fff' }}>
              Активны кастомные анимации
            </Alert>
          )}
        </Stack>
      )}
    </Stack>
  );
}