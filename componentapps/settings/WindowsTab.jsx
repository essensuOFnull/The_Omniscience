import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';

function describeError(error) {
  const messages = {
    unsupported_edition: 'Shell Launcher доступен только в Enterprise, Education и IoT Enterprise.',
    shell_launcher_feature_disabled: 'Компонент Shell Launcher не установлен или недоступен. Установите его средствами Windows; приложение не устанавливает системные компоненты.',
    shell_launcher_status_failed: 'Не удалось получить сведения о Shell Launcher. Проверьте системный журнал и компоненты Windows.',
    administrator_required: 'Для этой операции нужны права администратора.',
    backup_not_found: 'Сохранённая резервная копия конфигурации не найдена.',
    backup_user_mismatch: 'Резервная копия относится к другой учётной записи.',
  };
  return messages[error] || error || 'Неизвестная ошибка Windows.';
}

export default function WindowsTab() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const refresh = useCallback(async () => {
    const result = await window.electron_desktop_API.invoke('windows:shell-launcher-status');
    setStatus(result);
  }, []);

  useEffect(() => {
    refresh().catch((error) => {
      setMessage({ severity: 'error', text: describeError(error.message) });
    });
  }, [refresh]);

  const perform = async (channel) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await window.electron_desktop_API.invoke(channel);
      if (!result?.ok) {
        setMessage({ severity: 'error', text: describeError(result?.error) });
      } else {
        const text = channel === 'windows:request-admin'
          ? 'Повышенный помощник запущен и останется активен до закрытия приложения.'
          : channel === 'windows:shell-launcher-enable'
            ? 'Shell Launcher настроен для этой учётной записи. Изменение вступит в силу после следующего входа в Windows.'
            : channel === 'windows:shell-launcher-reset'
              ? 'Пользовательская оболочка удалена. При следующем входе Windows использует оболочку по умолчанию.'
              : 'Предыдущая конфигурация Shell Launcher восстановлена.';
        setMessage({ severity: 'success', text });
      }
      await refresh();
    } catch (error) {
      setMessage({ severity: 'error', text: describeError(error.message) });
    } finally {
      setBusy(false);
    }
  };

  const shellLauncherReady = !!(status?.supported && status?.available && status?.enabled);

  return (
    <Stack spacing={2}>
      <Alert severity="warning">
        Не включайте замену shell на основном устройстве без проверки. Сначала протестируйте её на отдельной учётной записи и сохраните доступ к другой учётной записи администратора.
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
          disabled={busy || status?.adminHelperActive}
          onClick={() => perform('windows:request-admin')}
        >
          {status?.adminHelperActive ? 'Помощник активен до конца сессии' : 'Запросить права администратора'}
        </Button>
      </Box>

      <Box>
        <Typography variant="subtitle1" sx={{ color: '#fff', mb: 0.5 }}>
          Shell Launcher
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1.5 }}>
          Эта функция Windows может запускать приложение вместо Explorer при входе в систему. Она не включается автоматически, не меняется при npm install и действует только для текущей учётной записи.
        </Typography>

        {!status && <Alert severity="info">Проверка возможностей Windows…</Alert>}
        {status?.supported === false && (
          <Alert severity="info">Редакция Windows «{status.edition || 'неизвестна'}» не поддерживает Shell Launcher.</Alert>
        )}
        {status?.supported && !status.available && (
          <Alert severity="info">
            {status.error ? describeError(status.error) : 'Компонент Shell Launcher недоступен.'}
          </Alert>
        )}
        {status?.available && !status.enabled && (
          <Alert severity="info">Shell Launcher установлен, но системный механизм выключен. Явное включение затронет механизм для Windows в целом, а назначение этой оболочки — только текущую учётную запись. При восстановлении резервной копии прежнее состояние механизма будет возвращено.</Alert>
        )}
        {shellLauncherReady && (
          <Alert severity="success">
            Shell Launcher активен в Windows. {status.hasCustomShell
              ? `Сейчас для пользователя настроена оболочка: ${status.shell}`
              : 'Для пользователя пока не задана пользовательская оболочка.'}
          </Alert>
        )}
      </Box>

      {message && <Alert severity={message.severity}>{message.text}</Alert>}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button
          variant="contained"
          disabled={busy || !(status?.supported && status?.available)}
          onClick={() => {
            if (!status.enabled && !window.confirm('Включить механизм Shell Launcher в Windows? Назначение приложения оболочкой ограничится текущей учётной записью.')) return;
            perform('windows:shell-launcher-enable');
          }}
        >
          {status?.enabled ? 'Использовать это приложение вместо Explorer' : 'Включить Shell Launcher и заменить Explorer'}
        </Button>
        <Button
          variant="outlined"
          disabled={busy || !status?.backupAvailable || !(status?.supported && status?.available)}
          onClick={() => perform('windows:shell-launcher-restore')}
        >
          Восстановить предыдущую оболочку
        </Button>
        <Button
          color="warning"
          variant="outlined"
          disabled={busy || !(status?.supported && status?.available)}
          onClick={() => {
            if (window.confirm('Удалить настройку оболочки для этой учётной записи? Windows вернётся к оболочке по умолчанию.')) {
              perform('windows:shell-launcher-reset');
            }
          }}
        >
          Вернуться к оболочке Windows по умолчанию
        </Button>
      </Box>

      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
        Резервная копия хранится локально. Если приложение не запустится после входа, используйте Ctrl+Shift+Esc → Диспетчер задач → «Запустить новую задачу», запустите приложение в этой же учётной записи и восстановите настройки. Другую учётную запись администратора держите как дополнительный способ восстановления.
      </Typography>
    </Stack>
  );
}
