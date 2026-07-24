// Taskbar.jsx
import React from 'react';
import { AppBar, Toolbar, Button, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import useTaskbar from '../hooks/useTaskbar';

export default function Taskbar({ state, actions, apps, config, menuButtonClick }) {
  const { windowsArray, maxZ, handleTaskbarClick } = useTaskbar(state, actions);
  const taskbarHeight = config?.taskbarHeight || 40;

  return (
    <AppBar position="static" sx={{ height: taskbarHeight, bgcolor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.1)', boxShadow: 'none', top: 'auto', bottom: 0 }}>
      <Toolbar variant="dense" sx={{ minHeight: taskbarHeight, px: 1, gap: 1, overflow: 'hidden' }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<MenuIcon />}
          onClick={menuButtonClick}
          sx={{ bgcolor: '#6f42c1', '&:hover': { bgcolor: '#5a32a3' }, flexShrink: 0, textTransform: 'none' }}
        >
          Меню
        </Button>
        <Box sx={{ display: 'flex', gap: 0.5, overflowX: 'auto', flex: 1, py: 0.5, '&::-webkit-scrollbar': { height: 3 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#6f42c1', borderRadius: 1 } }}>
          {windowsArray.map(w => {
            const app = apps.find(a => a.id === w.appId);
            const icon = app?.icon;
            const title = w.title || app?.title || 'Окно';
            const isActive = !w.minimized && w.z === maxZ;
            return (
              <Button
                key={w.id}
                data-window-id={w.id}
                size="small"
                variant={isActive ? 'contained' : 'text'}
                startIcon={icon ? <img src={icon} width="16" height="16" alt="icon" /> : <span>📦</span>}
                onClick={(e) => handleTaskbarClick(w, e)}
                sx={{
                  bgcolor: isActive ? '#6f42c1' : 'rgba(255,255,255,0.08)',
                  color: isActive ? 'white' : '#ddd',
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  '&:hover': { bgcolor: isActive ? '#6f42c1' : 'rgba(255,255,255,0.15)' },
                }}
              >
                {title}
              </Button>
            );
          })}
        </Box>
      </Toolbar>
    </AppBar>
  );
}