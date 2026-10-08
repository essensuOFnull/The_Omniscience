import React, { useEffect, useState, useCallback } from 'react';
import { Box } from '@mui/material';
import Overview from './Overview';

function getApi() {
  return window.electron_overview_API
      || window.electron_topbar_API
      || window.electron_desktop_API
      || null;
}

function callApi(channel, data) {
  const api = getApi();
  if (!api) return Promise.resolve(null);
  if (typeof api.invoke === 'function') return api.invoke(channel, data).catch(() => null);
  if (typeof api.send === 'function') { api.send(channel, data); return Promise.resolve(null); }
  return Promise.resolve(null);
}

export default function OverviewContainer() {
  const [apps, setApps] = useState([]);
  const [tabsConfig, setTabsConfig] = useState([]);
  const [activeTab, setActiveTab] = useState(null);

  useEffect(() => {
    const api = getApi();
    if (!api) return;

    callApi('topbar:get-state').then((s) => {
      if (!s) return;
      setApps(s.apps || []);
      setTabsConfig(s.overviewTabs || []);
      if (!activeTab) {
        const first = (s.overviewTabs || []).find((t) => t.visible);
        if (first) setActiveTab(first.id);
      }
    });

    const off = api.on?.('topbar:state-update', (patch) => {
      if (!patch) return;
      if (patch.apps) setApps(patch.apps);
      if (patch.overviewTabs) setTabsConfig(patch.overviewTabs);
    });
    return off;
  }, []);

  const close = useCallback(() => {
    callApi('overview:close');
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  const onBackdropClick = (e) => {
    if (e.target === e.currentTarget) close();
  };

  return (
    <Box
      sx={{
        position: 'fixed', inset: 0,
        width: '100vw', height: '100vh',
        bgcolor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(16px)',
        overflow: 'hidden',
      }}
      onClick={onBackdropClick}
    >
      <Overview
        activeTabId={activeTab}
        onTabChange={setActiveTab}
        onClose={close}
        apps={apps}
        tabsConfig={tabsConfig}
        parentWindowId="__overview__"
      />
    </Box>
  );
}