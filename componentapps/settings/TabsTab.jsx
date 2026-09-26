import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Switch, IconButton, Divider, Stack, Alert,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import LockIcon from '@mui/icons-material/Lock';
import { useViewSetting, viewDispatch } from '@viewRuntime';

export default function TabsTab() {
  const config = useViewSetting('settings.overviewTabs') || [];
  const [apps, setApps] = useState([]);

  useEffect(() => {
    window.electron_view_API?.getAppsList?.().then(setApps).catch(() => {});
  }, []);

  // Собранный список: сначала всё из config (в порядке), потом остальные приложения
  const rows = useMemo(() => {
    const configIds = new Set(config.map((e) => e.id));
    const configured = config.map((e) => ({
      ...e,
      app: apps.find((a) => a.id === e.id) || null,
    }));
    const rest = apps
      .filter((a) => !configIds.has(a.id))
      .map((a) => ({ id: a.id, visible: false, locked: false, app: a }));
    return [...configured, ...rest];
  }, [config, apps]);

  const update = (newConfig) => viewDispatch('updateSetting', {
    path: 'overviewTabs',
    value: newConfig,
  });

  const toggle = (id) => {
    const entry = config.find((e) => e.id === id);
    if (entry?.locked) return;
    if (entry) {
      update(config.map((e) => e.id === id ? { ...e, visible: !e.visible } : e));
    } else {
      update([...config, { id, visible: true }]);
    }
  };

  const move = (id, dir) => {
    const idx = config.findIndex((e) => e.id === id);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= config.length) return;
    const arr = [...config];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    update(arr);
  };

  return (
    <Stack spacing={2}>
      <Alert severity="info" sx={{ bgcolor: 'rgba(168,85,247,0.1)', color: '#fff' }}>
        Порядок вкладок в Overview. Настройки — обязательная вкладка, её нельзя скрыть.
      </Alert>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {rows.map((row) => {
          const inConfig = config.some((e) => e.id === row.id);
          const isLocked = !!row.locked;
          const label = row.app?.title || row.id;

          return (
            <Box
              key={row.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                borderRadius: 1,
                bgcolor: row.visible ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                opacity: row.visible ? 1 : 0.6,
              }}
            >
              <Switch
                size="small"
                checked={!!row.visible}
                disabled={isLocked}
                onChange={() => toggle(row.id)}
              />

              <Typography sx={{ flex: 1, color: '#fff', fontSize: 13 }} noWrap>
                {label}
                {isLocked && (
                  <LockIcon
                    fontSize="inherit"
                    sx={{ ml: 0.5, color: '#a855f7', verticalAlign: 'middle' }}
                  />
                )}
              </Typography>

              {inConfig && (
                <Box sx={{ display: 'flex' }}>
                  <IconButton
                    size="small"
                    onClick={() => move(row.id, -1)}
                    disabled={config.findIndex((e) => e.id === row.id) === 0}
                    sx={{ color: '#ccc' }}
                  >
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => move(row.id, 1)}
                    disabled={config.findIndex((e) => e.id === row.id) === config.length - 1}
                    sx={{ color: '#ccc' }}
                  >
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}