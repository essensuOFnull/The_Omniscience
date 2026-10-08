import React, { useMemo, useRef } from 'react';
import { Box, Tabs, Tab, IconButton, Paper } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import useTabContentView from '../hooks/useTabContentView';

function AppTabContent({ app, viewId, tabId, parentWindowId }) {
  const containerRef = useRef(null);
  useTabContentView(viewId, app, containerRef, { tabId, parentWindowId });
  return <Box ref={containerRef} sx={{ width: '100%', height: '100%' }} />;
}

export default function Overview({
  activeTabId,
  onTabChange,
  onClose,
  apps = [],
  tabsConfig = [],
  parentWindowId = null,
}) {
  const tabs = useMemo(() => {
    return tabsConfig
      .filter((e) => e.visible)
      .map((e) => {
        const app = apps.find((a) => a.id === e.id);
        if (!app) return null;
        return { id: e.id, label: app.title || e.id, app };
      })
      .filter(Boolean);
  }, [tabsConfig, apps]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  return (
    <Box
      onClick={(e) => e.stopPropagation()}
      sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
    >
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'transparent', borderRadius: 0, p: 1,
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tabs
            value={activeTab?.id || false}
            onChange={(_, v) => onTabChange(v)}
            textColor="inherit"
            variant="scrollable"
          >
            {tabs.map((t) => (
              <Tab key={t.id} value={t.id} label={t.label}
                sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-selected': { color: '#fff' } }} />
            ))}
          </Tabs>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Paper>

      <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {activeTab && (
          <AppTabContent
            key={activeTab.id}
            app={activeTab.app}
            viewId={`overview:${activeTab.id}`}
            tabId={activeTab.id}
            parentWindowId={parentWindowId}
          />
        )}
      </Box>
    </Box>
  );
}