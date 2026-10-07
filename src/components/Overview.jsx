// src/components/Overview.jsx
import React, { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Box, Tabs, Tab, IconButton, Paper, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import useTabContentView from '../hooks/useTabContentView';

function AppTabContent({ app, viewId, tabId, parentWindowId }) {
  const containerRef = useRef(null);
  useTabContentView(viewId, app, containerRef, { tabId, parentWindowId });
  return <Box ref={containerRef} sx={{ width: '100%', height: '100%' }} />;
}

export default function Overview({
  isOpen,
  activeTabId,
  onTabChange,
  onClose,
  apps = [],            // ← плоский список { id, title, icon, url, preloadPath }
  tabsConfig = [],      // ← [{ id, visible }]
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
    <motion.div
      initial={false}
      animate={{ opacity: isOpen ? 1 : 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        top: 72, left: 0, right: 0, bottom: 0,
        zIndex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(12px)',
        pointerEvents: isOpen ? 'auto' : 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Paper elevation={0} sx={{
        bgcolor: 'transparent', borderRadius: 0, p: 1,
        borderBottom: '1px solid rgba(255,255,255,0.12)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tabs value={activeTab?.id || false} onChange={(_, v) => onTabChange(v)}
            textColor="inherit" variant="scrollable">
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
        {isOpen && activeTab && (
          <AppTabContent
            key={activeTab.id}
            app={activeTab.app}
            viewId={`topbar-overview:${activeTab.id}`}
            tabId={activeTab.id}
            parentWindowId={parentWindowId}
          />
        )}
      </Box>
    </motion.div>
  );
}