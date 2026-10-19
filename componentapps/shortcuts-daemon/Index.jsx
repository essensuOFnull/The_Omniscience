// apps/shortcuts-daemon/Index.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    Alert, Box, Button, Chip, Divider, IconButton,
    List, ListItem, ListItemText, Paper, Stack,
    TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import StopIcon from '@mui/icons-material/Stop';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

const MODIFIER_KEYS = new Set(['Alt', 'Control', 'Shift', 'Meta', 'AltGraph', 'CapsLock']);

function normalizeMainKey(e) {
    const k = e.key;
    if (k === ' ') return 'Space';
    if (k === 'Escape') return 'Esc';
    if (k === 'ArrowUp') return 'Up';
    if (k === 'ArrowDown') return 'Down';
    if (k === 'ArrowLeft') return 'Left';
    if (k === 'ArrowRight') return 'Right';
    if (k.length === 1) return k.toUpperCase();
    return k;
}
function buildAccelerator(e, mainKey) {
    const parts = [];
    if (e.ctrlKey)  parts.push('Control');
    if (e.altKey)   parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey)  parts.push('Super');
    if (mainKey)    parts.push(mainKey);
    return parts.join('+');
}

// ─── Рекордер ──────────────────────────────────────────────────────────
function ShortcutRecorder({ value, onChange, disabled }) {
    const [recording, setRecording] = useState(false);
    const inputRef = useRef(null);

    const start = useCallback(() => {
        setRecording(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    }, []);
    const stop = useCallback(() => setRecording(false), []);

    const handleKeyDown = useCallback((e) => {
        if (!recording) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Escape') { stop(); return; }
        if (MODIFIER_KEYS.has(e.key)) {
            const accel = buildAccelerator(e, null);
            if (accel) onChange(accel);
            return;
        }
        onChange(buildAccelerator(e, normalizeMainKey(e)));
        stop();
    }, [recording, onChange, stop]);

    return (
        <Stack direction="row" spacing={1} alignItems="stretch">
            <TextField
                inputRef={inputRef}
                value={value || ''}
                placeholder={recording ? 'Нажмите комбинацию…' : 'Например, Alt+Shift'}
                size="small" fullWidth disabled={disabled}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (recording) stop(); }}
                InputProps={{ readOnly: !recording }}
                sx={{ '& .MuiInputBase-input': recording ? { fontFamily: 'monospace', color: 'warning.main' } : {} }}
            />
            {recording ? (
                <Button variant="contained" color="warning" startIcon={<StopIcon />} onClick={stop}>Стоп</Button>
            ) : (
                <Button variant="outlined" startIcon={<KeyboardIcon />} onClick={start} disabled={disabled}>Записать</Button>
            )}
        </Stack>
    );
}

// ─── Раскладки ─────────────────────────────────────────────────────────
function LayoutsSection() {
    const [layouts, setLayouts] = useState([]);
    const [currentGroup, setCurrentGroup] = useState(null);
    const [newLayout, setNewLayout] = useState('');
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');

    const refresh = useCallback(async () => {
        try {
            const data = await window.shortcutAPI.layoutsGet();
            setLayouts(data.layouts ?? []);
            setCurrentGroup(data.current ?? null);
        } catch (err) { setError(`Не удалось получить раскладки: ${err.message}`); }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);
    useEffect(() => {
        const id = setInterval(async () => {
            try {
                const data = await window.shortcutAPI.layoutsGet();
                setCurrentGroup(data.current ?? null);
            } catch { /* ignore */ }
        }, 1000);
        return () => clearInterval(id);
    }, []);

    const add = () => {
        const code = newLayout.trim().toLowerCase();
        if (!code) return;
        if (layouts.includes(code)) { setError(`Раскладка «${code}» уже есть`); return; }
        setError(''); setLayouts([...layouts, code]); setNewLayout('');
    };
    const remove = (code) => setLayouts(layouts.filter(l => l !== code));
    const apply = async () => {
        setError(''); setMsg('');
        if (!layouts.length) { setError('Нужна хотя бы одна раскладка'); return; }
        const res = await window.shortcutAPI.layoutsSet(layouts);
        if (res.ok) { setMsg('Применено'); refresh(); }
        else setError(res.error || 'Ошибка применения');
    };
    const switchNext = async () => {
        setError('');
        await window.shortcutAPI.layoutsSwitchNext();
        refresh();
    };

    const currentDisplay = (() => {
        if (currentGroup == null) return '—';
        const name = layouts[currentGroup];
        return name ? `${name} (group ${currentGroup})` : `group ${currentGroup}`;
    })();

    return (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Раскладки клавиатуры (XKB)</Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap">
                <Chip label={`Текущая: ${currentDisplay}`} color="primary" variant="outlined" />
                <Button size="small" startIcon={<SwapHorizIcon />} onClick={switchNext}>Следующая</Button>
            </Stack>
            {layouts.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>Список пуст.</Typography>
            ) : (
                <List dense disablePadding>
                    {layouts.map((code, idx) => (
                        <React.Fragment key={code}>
                            {idx > 0 && <Divider component="li" />}
                            <ListItem secondaryAction={
                                <IconButton edge="end" onClick={() => remove(code)}><DeleteIcon /></IconButton>
                            }>
                                <ListItemText primary={
                                    <Chip label={code} size="small"
                                          variant={idx === currentGroup ? 'filled' : 'outlined'}
                                          sx={{ fontFamily: 'monospace' }} />
                                } />
                            </ListItem>
                        </React.Fragment>
                    ))}
                </List>
            )}
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="stretch">
                <TextField size="small" label="Код (us, ru, de…)"
                           value={newLayout}
                           onChange={e => setNewLayout(e.target.value)}
                           onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
                           sx={{ maxWidth: 220 }} />
                <Button startIcon={<AddIcon />} onClick={add}>Добавить</Button>
                <Box sx={{ flexGrow: 1 }} />
                <Button variant="contained" onClick={apply}>Применить</Button>
            </Stack>
            {error && <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError('')}>{error}</Alert>}
            {msg   && <Alert severity="success" sx={{ mt: 1 }} onClose={() => setMsg('')}>{msg}</Alert>}
        </Paper>
    );
}

// ─── Основной компонент ────────────────────────────────────────────────
function App() {
    const [list, setList] = useState([]);
    const [accelerator, setAccelerator] = useState('');
    const [command, setCommand] = useState('switch-layout');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const refresh = useCallback(async () => {
        try { setList(await window.shortcutAPI.list()); }
        catch (err) { setError(`Не удалось получить список: ${err.message}`); }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const finalCommand = command.trim();

    const handleAdd = async () => {
        setError(''); setSuccess('');
        if (!accelerator.trim()) { setError('Сначала запишите сочетание клавиш.'); return; }
        if (!finalCommand) { setError('Введите команду.'); return; }
        if (list.some(item => item.accelerator === accelerator)) {
            setError(`Сочетание ${accelerator} уже используется.`); return;
        }
        const res = await window.shortcutAPI.set(accelerator, finalCommand);
        if (res.ok) {
            setSuccess(`Добавлено: ${accelerator} → ${finalCommand}`);
            setAccelerator(''); refresh();
        } else setError(res.error || 'Не удалось добавить.');
    };

    const handleRemove = async (acc) => {
        setError(''); setSuccess('');
        const res = await window.shortcutAPI.remove(acc);
        if (res.ok) { setSuccess(`Удалено: ${acc}`); refresh(); }
        else setError(res.error || 'Не удалось удалить.');
    };

    return (
        <Box sx={{ maxWidth: 720, mx: 'auto', p: 2 }}>
            <Typography variant="h5" gutterBottom>Демон сочетаний и раскладок</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Хоткеи — uIOhook. Раскладки — XKB (node-x11).
                По умолчанию <code>Alt+Shift</code> переключает раскладку.
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>Сочетание</Typography>
                        <ShortcutRecorder value={accelerator} onChange={setAccelerator} />
                    </Box>
                    <Box>
                        <TextField
                            label="Команда"
                            value={command}
                            onChange={e => setCommand(e.target.value)}
                            size="small" fullWidth
                            helperText={
                                <>Для переключения раскладки — <code>switch-layout</code>. 
                                Остальное выполняется через <code>sh -c</code>.</>
                            }
                        />
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Chip size="small" variant="outlined" label="Вставить: switch-layout"
                                  onClick={() => setCommand('switch-layout')} />
                        </Stack>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>Добавить</Button>
                        {finalCommand && (
                            <Tooltip title="Выполнить команду сейчас, не назначая клавишу">
                                <Button size="small" variant="text"
                                        onClick={() => window.shortcutAPI.execute(finalCommand)}>
                                    Проверить
                                </Button>
                            </Tooltip>
                        )}
                    </Stack>
                    {error   && <Alert severity="error"   onClose={() => setError('')}>{error}</Alert>}
                    {success && <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>}
                </Stack>
            </Paper>

            <Typography variant="subtitle2" gutterBottom>Активные сочетания ({list.length})</Typography>
            <Paper variant="outlined">
                {list.length === 0 ? (
                    <Box sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">Пока ничего не добавлено.</Typography></Box>
                ) : (
                    <List dense disablePadding>
                        {list.map(({ accelerator: acc, command: cmd }, idx) => (
                            <React.Fragment key={acc}>
                                {idx > 0 && <Divider component="li" />}
                                <ListItem secondaryAction={
                                    <IconButton edge="end" onClick={() => handleRemove(acc)}><DeleteIcon /></IconButton>
                                }>
                                    <ListItemText
                                        primary={<Chip label={acc} size="small" variant="outlined"
                                                       sx={{ fontFamily: 'monospace', mb: 0.5 }} />}
                                        secondary={<Typography component="span" variant="body2"
                                                               color="text.secondary"
                                                               sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                            {cmd}</Typography>}
                                    />
                                </ListItem>
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </Paper>

            <LayoutsSection />

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Escape отменяет запись. Нажатие модификатора фиксирует его в аккорде,
                нажатие обычной клавиши завершает запись.
            </Typography>
        </Box>
    );
}

createRoot(document.getElementById('root')).render(<App />);