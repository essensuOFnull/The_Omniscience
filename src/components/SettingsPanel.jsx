import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Tabs, Tab, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ThemeTab from './ThemeTab';
import BackgroundTab from './BackgroundTab';
import AnimationTab from './AnimationTab';

export default function SettingsPanel({ open, onClose, windowId, desktopId }) {
  const [tab, setTab] = useState(0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(20,20,30,0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        ⚙️ Настройки {windowId ? `окна` : 'The Omniscience'}
        <IconButton onClick={onClose} size="small" sx={{ color: '#aaa' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          textColor="inherit"
          TabIndicatorProps={{ style: { backgroundColor: '#a855f7' } }}
          sx={{ mb: 2 }}
        >
          <Tab label="🎨 Тема" />
          <Tab label="🖼️ Фон" />
          <Tab label="✨ Анимации" />
        </Tabs>
        {tab === 0 && <ThemeTab />}
        {tab === 1 && <BackgroundTab />}
        {tab === 2 && <AnimationTab />}
      </DialogContent>
    </Dialog>
  );
}