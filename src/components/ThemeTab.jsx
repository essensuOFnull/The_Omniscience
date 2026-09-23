import React from 'react';
import {
  Box, Typography, Slider, Switch, FormControlLabel, TextField, Divider,
} from '@mui/material';
import { useSetting } from '../settings/useSettings';
import { settingsStore } from '../settings/store';

function ColorControl({ label, varKey, min = 0, max = 255, step = 1, disabled, color }) {
  const value = useSetting(`themeColors.${varKey}`);
  const set = (v) => settingsStore.update(`themeColors.${varKey}`, Number(v));

  return (
    <Box>
      <Typography variant="caption" sx={{ color: '#ccc' }}>{label}</Typography>
      <Slider value={value} onChange={(_, v) => set(v)}
        min={min} max={max} step={step} disabled={disabled} size="small"
        sx={{ color: color || '#a855f7' }} />
      <TextField size="small" fullWidth type="number" value={value}
        disabled={disabled} onChange={(e) => set(e.target.value)}
        inputProps={{ min, max, step }}
        sx={{ '& input': { color: '#fff', fontSize: 12 } }} />
    </Box>
  );
}

export default function ThemeTab() {
  const themeEnabled = useSetting('themeEnabled');
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControlLabel
        control={<Switch checked={themeEnabled}
          onChange={(e) => settingsStore.update('themeEnabled', e.target.checked)}
          color="secondary" />}
        label={<Typography variant="body2" sx={{ color: '#fff' }}>Включить тему</Typography>}
      />
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <Typography variant="subtitle2" sx={{ color: '#aaa' }}>
        CSS-переменные на :root
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <ColorControl label="--TheOmniscience-max-r" varKey="maxR" color="#ff5555" disabled={!themeEnabled} />
        <ColorControl label="--TheOmniscience-max-g" varKey="maxG" color="#55ff55" disabled={!themeEnabled} />
        <ColorControl label="--TheOmniscience-max-b" varKey="maxB" color="#5555ff" disabled={!themeEnabled} />
        <ColorControl label="--TheOmniscience-target-alpha" varKey="targetAlpha"
          min={0} max={1} step={0.05} disabled={!themeEnabled} />
        <ColorControl label="--TheOmniscience-text-brightness" varKey="textBrightness" disabled={!themeEnabled} />
      </Box>
    </Box>
  );
}