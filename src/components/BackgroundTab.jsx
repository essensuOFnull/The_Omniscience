import React, { useState } from 'react';
import {
  Box, Typography, TextField, Select, MenuItem, FormControl,
  InputLabel, Slider, Button, Divider, Alert,
} from '@mui/material';
import { useSetting } from '../settings/useSettings';
import { settingsStore } from '../settings/store';

function Preview({ bg, keyNonce }) {
  if (!bg.source && bg.type !== 'color') {
    return <Alert severity="info" sx={{ bgcolor: 'rgba(168,85,247,0.1)', color: '#fff' }}>
      Укажите источник, чтобы увидеть превью
    </Alert>;
  }
  return (
    <Box sx={{ height: 140, borderRadius: 1, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.1)', bgcolor: '#111' }}>
      {bg.type === 'color' && <Box sx={{ width: '100%', height: '100%', bgcolor: bg.color }} />}
      {bg.type === 'image' && <img key={keyNonce} src={bg.source} alt="preview"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      {bg.type === 'video' && <video key={keyNonce} src={bg.source} autoPlay loop muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      {bg.type === 'iframe' && <iframe key={keyNonce} src={bg.source} title="preview"
        style={{ width: '100%', height: '100%', border: 'none' }}
        sandbox="allow-scripts allow-same-origin allow-presentation" />}
      {bg.type === 'component' && (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#888', fontSize: 13, textAlign: 'center', p: 2 }}>
          🧩 Компонент «{bg.componentName || '—'}»
        </Box>
      )}
    </Box>
  );
}

export default function BackgroundTab() {
  const bg = useSetting('background');
  const [nonce, setNonce] = useState(0);
  const set = (key, value) => settingsStore.update(`background.${key}`, value);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl fullWidth size="small">
        <InputLabel sx={{ color: '#aaa' }}>Тип фона</InputLabel>
        <Select value={bg.type} label="Тип фона"
          onChange={(e) => set('type', e.target.value)}
          sx={{ color: '#fff',
            '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
            '& .MuiSvgIcon-root': { color: '#aaa' } }}>
          <MenuItem value="image">🖼️ Изображение</MenuItem>
          <MenuItem value="video">🎬 Видео</MenuItem>
          <MenuItem value="iframe">🌐 iframe</MenuItem>
          <MenuItem value="component">🧩 React-компонент</MenuItem>
          <MenuItem value="color">🎨 Сплошной цвет</MenuItem>
        </Select>
      </FormControl>

      {bg.type === 'component' && (
        <TextField label="Имя компонента" value={bg.componentName || ''}
          onChange={(e) => set('componentName', e.target.value)}
          fullWidth size="small"
          helperText="Зарегистрируйте в BackgroundRenderer → CUSTOM_BACKGROUNDS"
          sx={{ '& input': { color: '#fff' }, '& label': { color: '#aaa' },
            '& .MuiFormHelperText-root': { color: '#888' } }} />
      )}

      {bg.type === 'color' && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <input type="color" value={bg.color}
            onChange={(e) => set('color', e.target.value)}
            style={{ width: 48, height: 40, border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 4, background: 'transparent', cursor: 'pointer' }} />
          <TextField label="HEX" value={bg.color}
            onChange={(e) => set('color', e.target.value)} size="small" fullWidth
            sx={{ '& input': { color: '#fff', fontFamily: 'monospace' }, '& label': { color: '#aaa' } }} />
        </Box>
      )}

      {(bg.type === 'image' || bg.type === 'video' || bg.type === 'iframe') && (
        <>
          <TextField label="Источник (URL или путь)" value={bg.source}
            onChange={(e) => set('source', e.target.value)} fullWidth size="small"
            placeholder={bg.type === 'image' ? 'https://.../bg.jpg' :
              bg.type === 'video' ? 'https://.../loop.mp4' : 'https://example.com'}
            sx={{ '& input': { color: '#fff' }, '& label': { color: '#aaa' } }} />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined" onClick={() => setNonce((n) => n + 1)}
              sx={{ color: '#a855f7', borderColor: '#a855f7' }}>🔄 Обновить превью</Button>
            <Button size="small" variant="text" onClick={() => set('source', '')}
              sx={{ color: '#888' }}>Очистить</Button>
          </Box>
          <Preview bg={bg} keyNonce={nonce} />
        </>
      )}

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <Box>
        <Typography variant="caption" sx={{ color: '#ccc' }}>
          Прозрачность: {bg.opacity.toFixed(2)}
        </Typography>
        <Slider value={bg.opacity} onChange={(_, v) => set('opacity', v)}
          min={0} max={1} step={0.05} size="small" />
      </Box>
    </Box>
  );
}