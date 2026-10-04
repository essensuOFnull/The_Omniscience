import React, { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Box, Tabs, Tab, IconButton, Paper, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import useTabContentView from '../hooks/useTabContentView';
import { useSetting } from '../settings/useSettings';

function AppTabContent({ app, viewId, desktopId, tabId }) {
  const containerRef = useRef(null);
  useTabContentView(viewId, app, containerRef, { desktopId, tabId });
  return <Box ref={containerRef} sx={{ width: '100%', height: '100%' }} />;
}

export default function Overview({ state, actions, config, apps, desktopId }) {
  const overviewTabsConfig = useSetting('overviewTabs') || [];

  const tabs = useMemo(() => {
    // Гарантируем, что settings всегда есть в конфиге
    const entries = [...overviewTabsConfig];
    if (!entries.some((e) => e.id === 'settings')) {
      entries.push({ id: 'settings', visible: true, locked: true });
    }

    return entries
      .filter((e) => e.visible)
      .map((e) => {
        const app = (apps || []).find((a) => a.id === e.id);
        if (!app) return null;
        return { id: e.id, label: app.title || e.id, app };
      })
      .filter(Boolean);
  }, [overviewTabsConfig, apps]);

  if (!state) return null;
  const { isOverviewOpened, overviewTab } = state;

  const activeTab = tabs.find((t) => t.id === overviewTab) || tabs[0];

  const handleTabChange = (_, newValue) => {
    actions.setOverviewTab(desktopId, newValue);
  };

  const handleClose = () => {
    actions.closeOverview(desktopId);
  };

  return (
    <motion.div
      initial={false}
      animate={{
        opacity: isOverviewOpened ? 1 : 0,
        top:isOverviewOpened ? 0 : '-100vh',
        bottom:isOverviewOpened ? 0 : '100vh',
      }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        top:isOverviewOpened ? 0 : '-100vh', left: 0, right: 0, bottom:isOverviewOpened ? 0 : '100vh',
        zIndex: isOverviewOpened ?(config?.overviewZIndex || 1000):-1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(12px)',
        pointerEvents: isOverviewOpened ? 'auto' : 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'transparent', borderRadius: 0, p: 2,
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tabs
            value={activeTab?.id || false}
            onChange={handleTabChange}
            textColor="inherit"
            variant="scrollable"
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                value={tab.id}
                label={tab.label}
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  '&.Mui-selected': { color: '#fff' },
                }}
              />
            ))}
          </Tabs>
          <IconButton onClick={handleClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Paper>

      <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {isOverviewOpened && activeTab && (
          <AppTabContent
            key={activeTab.id}
            app={activeTab.app}
            viewId={`tab:${desktopId}:${activeTab.id}`}
            desktopId={desktopId}
            tabId={activeTab.id}
          />
        )}
        {!activeTab && (
          <Box sx={{ p: 2 }}>
            <Typography sx={{ color: '#fff' }}>Нет доступных вкладок.</Typography>
          </Box>
        )}
      </Box>
    </motion.div>
  );
}