import React, { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import TabsTab from './TabsTab';
import ThemeTab from './ThemeTab';
import BackgroundTab from './BackgroundTab';
import AnimationTab from './AnimationTab';

export default function App() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: 2, width: '100%', height: '100%', boxSizing: 'border-box' }}>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        textColor="inherit"
        variant="scrollable"
        TabIndicatorProps={{ style: { backgroundColor: '#a855f7' } }}
        sx={{ mb: 2 }}
      >
        <Tab label="🧩 Вкладки" />
        <Tab label="🎨 Тема" />
        <Tab label="🖼️ Фон" />
        <Tab label="✨ Анимации" />
      </Tabs>
      {tab === 0 && <TabsTab />}
      {tab === 1 && <ThemeTab />}
      {tab === 2 && <BackgroundTab />}
      {tab === 3 && <AnimationTab />}
    </Box>
  );
}