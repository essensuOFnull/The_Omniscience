import React from 'react';
import { AppBar, Toolbar, Box, IconButton, Typography } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import BaseWindowButtons from './BaseWindowButtons.jsx';
import AddressBar from './AddressBar.jsx';

export default function TitleBar({
  title,
  icon,
  browserMode,
  maximized,
  closing,
  isFocused,
  onMouseDown,
  onDoubleClick,
  onToggleBrowser,
  onMinimize,
  onMaximize,
  onClose,
  // AddressBar props
  currentUrl,
  canGoBack,
  canGoForward,
  loading,
  onNavigateTo,
  onBack,
  onForward,
  onReload,
}) {
  return (
    <>
      <AppBar position="static" color="transparent" elevation={0}
        sx={{ minHeight: 36, bgcolor: 'rgba(42,0,42,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Toolbar
          variant="dense"
          onMouseDown={onMouseDown}
          onDoubleClick={onDoubleClick}
          sx={{
            minHeight: 36,
            px: 1,
            cursor: maximized || closing ? 'default' : 'move',
            userSelect: 'none',
          }}
        >
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
            {icon
              ? <img src={icon} width="16" height="16" alt="" draggable={false} />
              : <span style={{ color: '#fff' }}>📄</span>}
            <Typography variant="body2" noWrap sx={{ color: '#fff', userSelect: 'none' }}>
              {title || (browserMode ? (currentUrl || 'Новая вкладка') : 'Окно')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <IconButton
              size="small"
              onClick={onToggleBrowser}
              sx={{ color: browserMode ? 'primary.main' : 'text.secondary' }}
              title="Переключить режим браузера"
            >
              <LanguageIcon fontSize="small" />
            </IconButton>
            <BaseWindowButtons
              onMinimize={onMinimize}
              onMaximize={onMaximize}
              onClose={onClose}
              isMaximized={maximized}
            />
          </Box>
        </Toolbar>
      </AppBar>

      {browserMode ? (
        <AddressBar
          currentUrl={currentUrl}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          loading={loading}
          onNavigateTo={onNavigateTo}
          onBack={onBack}
          onForward={onForward}
          onReload={onReload}
        />
      ) : null}
    </>
  );
}