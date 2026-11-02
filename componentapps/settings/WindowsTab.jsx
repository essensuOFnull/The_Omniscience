import React, { useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';

export default function WindowsTab() {
  const [busy, setBusy] = useState(false);
  const [adminHelperActive, setAdminHelperActive] = useState(false);
  const [message, setMessage] = useState(null);

  const requestAdmin = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await window.electron_desktop_API.invoke('windows:request-admin');
      if (!result?.ok) throw new Error(result?.error || 'Не удалось запустить помощник Windows.');
      setAdminHelperActive(true);
      setMessage({
        severity: 'success',
        text: 'Повышенный помощник запущен и останется активен до закрытия приложения.',
      });
    } catch (error) {
      setMessage({ severity: 'error', text: error.message || 'Не удалось запросить права администратора.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Проводник остаётся обычной оболочкой Windows. Omniscience запускается через автозагрузку текущего пользователя и скрывает штатную панель задач только пока приложение работает; при завершении панель восстанавливается.
      </Alert>

      <Box>
        <Typography variant="subtitle1" sx={{ color: '#fff', mb: 0.5 }}>
          Повышенные права для приложения
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1.5 }}>
          Основной процесс приложения остаётся без повышения. По запросу запускается отдельный администраторский помощник; он завершится вместе с приложением.
        </Typography>
        <Button
          variant="outlined"
          disabled={busy || adminHelperActive}
          onClick={requestAdmin}
        >
          {adminHelperActive ? 'Помощник активен до конца сессии' : 'Запросить права администратора'}
        </Button>
      </Box>

      {message && <Alert severity={message.severity}>{message.text}</Alert>}
    </Stack>
  );
}
