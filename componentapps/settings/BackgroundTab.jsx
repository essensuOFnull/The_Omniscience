import React, { useState } from 'react';
import {
  Box, Typography, TextField, Select, MenuItem, FormControl,
  InputLabel, Slider, Button, Divider, Alert,
} from '@mui/material';
import {
  useViewSetting, viewDispatch, useProjectRoot, resolveForDisplay,
} from '@viewRuntime';

function Preview({ bg, keyNonce, projectRoot }) {
  if (!bg.source && bg.type !== 'color') {
    return (
      <Alert severity="info" sx={{ bgcolor: 'rgba(168,85,247,0.1)', color: '#fff' }}>
        Укажите источник, чтобы увидеть превью
      </Alert>
    );
  }

  const src = resolveForDisplay(bg.source, projectRoot);

  const fill = {
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block',
    margin: 0,
    padding: 0,
  };

  return (
    <Box sx={{
      flex: 1,
      minHeight: 200,
      width: '100%',
      borderRadius: 1,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.1)',
      bgcolor: '#111',
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'stretch',
    }}>
      {bg.type === 'color' && <Box sx={{ width: '100%', height: '100%', bgcolor: bg.color }} />}
      {bg.type === 'image' && <img key={keyNonce} src={src} alt="preview" style={{ ...fill, objectFit: 'contain' }} />}
      {bg.type === 'video' && <video key={keyNonce} src={src} autoPlay loop muted style={{ ...fill, objectFit: 'contain' }} />}
      {bg.type === 'iframe' && (
        <iframe key={keyNonce} src={src} title="preview"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          style={fill} />
      )}
      {bg.type === 'webview' && (
        <div style={{ ...fill, display: 'flex', flexDirection: 'column' }}>
          <webview key={keyNonce} src={src}
            style={{ flex: 1, width: '100%', height: '100%', border: 'none', display: 'inline-flex' }} />
        </div>
      )}
      {bg.type === 'component' && (
        <Box sx={{ color: '#888', fontSize: 13, textAlign: 'center', p: 2, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          🧩 Компонент «{bg.componentName || '—'}»
        </Box>
      )}
    </Box>
  );
}

export default function BackgroundTab() {
  const bg = useViewSetting('settings.background') || {};
  const projectRoot = useProjectRoot();
  const [nonce, setNonce] = useState(0);

  const set = (key, value) => {
    viewDispatch('updateSetting', { path: `background.${key}`, value });
  };

  const type = bg.type || 'color';
  const opacity = typeof bg.opacity === 'number' ? bg.opacity : 1;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%', minHeight: 0 }}>
      <FormControl size="small">
        <InputLabel sx={{ color: '#aaa' }}>Тип фона</InputLabel>
        <Select value={type} label="Тип фона"
          onChange={(e) => set('type', e.target.value)}
          sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }, '& .MuiSvgIcon-root': { color: '#aaa' } }}>
          <MenuItem value="image">🖼️ Изображение</MenuItem>
          <MenuItem value="video">🎬 Видео</MenuItem>
          <MenuItem value="iframe">🌐 iframe</MenuItem>
          <MenuItem value="webview">🧩 WebView</MenuItem>
          <MenuItem value="component">⚛️ React-компонент</MenuItem>
          <MenuItem value="color">🎨 Сплошной цвет</MenuItem>
        </Select>
      </FormControl>

      {type === 'component' && (
        <TextField label="Имя компонента" value={bg.componentName || ''}
          onChange={(e) => set('componentName', e.target.value)}
          size="small"
          helperText="Зарегистрируйте в BackgroundRenderer → CUSTOM_BACKGROUNDS"
          sx={{ '& input': { color: '#fff' }, '& label': { color: '#aaa' }, '& .MuiFormHelperText-root': { color: '#888' } }} />
      )}

      {type === 'color' && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <input type="color" value={bg.color || '#000000'}
            onChange={(e) => set('color', e.target.value)}
            style={{ width: 48, height: 40, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, background: 'transparent', cursor: 'pointer' }} />
          <TextField label="HEX" value={bg.color || '#000000'}
            onChange={(e) => set('color', e.target.value)} size="small"
            sx={{ '& input': { color: '#fff', fontFamily: 'monospace' }, '& label': { color: '#aaa' } }} />
        </Box>
      )}

      {(type === 'image' || type === 'video' || type === 'iframe' || type === 'webview') && (
        <>
          <TextField label="Источник (URL или путь)" value={bg.source || ''}
            onChange={(e) => set('source', e.target.value)} size="small"
            placeholder={type === 'image' ? 'public/images/bg.jpg или https://.../bg.jpg' :
              type === 'video' ? 'public/videos/loop.mp4 или https://.../loop.mp4' : 'https://example.com'}
            sx={{ '& input': { color: '#fff' }, '& label': { color: '#aaa' } }} />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined" onClick={() => setNonce((n) => n + 1)}
              sx={{ color: '#a855f7', borderColor: '#a855f7' }}>🔄 Обновить превью</Button>
            <Button size="small" variant="text" onClick={() => set('source', '')}
              sx={{ color: '#888' }}>Очистить</Button>
          </Box>
          <Preview bg={bg} keyNonce={nonce} projectRoot={projectRoot} />
        </>
      )}

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <Box>
        <Typography variant="caption" sx={{ color: '#ccc' }}>Прозрачность: {opacity.toFixed(2)}</Typography>
        <Slider value={opacity} onChange={(_, v) => set('opacity', v)} min={0} max={1} step={0.05} size="small" />
      </Box>
    </Box>
  );
}