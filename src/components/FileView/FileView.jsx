import React, {
    useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import {
    Box, IconButton, Breadcrumbs, Link, Typography, CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import useDirectory from './useDirectory';
import { useFileIcon } from './useIcons';
import { useSetting } from '../../settings/useSettings';

/* ------------------------------------------------------------------ */
/* Параметры кисти                                                     */
/* ------------------------------------------------------------------ */

const DEFAULT_BRUSH_RADIUS = 55;
const MIN_BRUSH_RADIUS = 3;
const MAX_BRUSH_RADIUS = 400;
const COLLAPSE_THRESHOLD = 2;
const WHEEL_STEP = 4;
const RADIUS_STEP_BUTTONS = 5;
const STORAGE_KEY = 'fileview.brushRadius';
const RADIUS_SPRING = { stiffness: 260, damping: 26, mass: 0.5 };
const AUTOPLAY_VIDEO_LIMIT = 12;

/* ------------------------------------------------------------------ */
/* Утилиты                                                             */
/* ------------------------------------------------------------------ */

function buildCrumbs(fullPath) {
    if (!fullPath) return [];
    const isWin = /^[a-zA-Z]:\\/.test(fullPath);

    if (isWin) {
        const parts = fullPath.replace(/\\+$/, '').split('\\').filter(Boolean);
        const crumbs = [];
        let acc = parts[0] + '\\';
        crumbs.push({ name: parts[0] + '\\', path: acc });
        for (let i = 1; i < parts.length; i++) {
            acc = acc.endsWith('\\') ? acc + parts[i] : acc + '\\' + parts[i];
            crumbs.push({ name: parts[i], path: acc });
        }
        return crumbs;
    }

    const crumbs = [{ name: '/', path: '/' }];
    const parts = fullPath.replace(/\/+$/, '').split('/').filter(Boolean);
    let acc = '';
    for (const part of parts) {
        acc = acc + '/' + part;
        crumbs.push({ name: part, path: acc });
    }
    return crumbs;
}

function isRoot(p) {
    if (!p) return false;
    if (p === '/') return true;
    if (/^[a-zA-Z]:\\?$/.test(p)) return true;
    return false;
}

function isFileItem(el) {
    return el instanceof Element && !!el.closest('[data-file-item]');
}

/* ------------------------------------------------------------------ */
/* Медиа-превью                                                        */
/* ------------------------------------------------------------------ */

function MediaThumb({ file, autoPlayVideo }) {
    const [failed, setFailed] = useState(false);

    useEffect(() => { setFailed(false); }, [file.id]);

    if (failed || !file.fileUrl) return null;

    if (file.mediaKind === 'image') {
        return (
            <img
                src={file.fileUrl}
                alt=""
                draggable={false}
                onError={() => setFailed(true)}
                style={{
                    width: '100%', height: '100%', objectFit: 'contain',
                    borderRadius: 0, userSelect: 'none',
                }}
            />
        );
    }

    if (file.mediaKind === 'video') {
        return (
            <video
                src={file.fileUrl}
                autoPlay={autoPlayVideo}
                muted loop playsInline preload="metadata"
                draggable={false}
                onError={() => setFailed(true)}
                style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    borderRadius: 0, background: '#000',
                }}
            />
        );
    }

    return null;
}

/* ------------------------------------------------------------------ */
/* FileItem                                                             */
/* ------------------------------------------------------------------ */

function FileItem({
    file, selected, cut, onSelect, onOpen, onContextRequest,
    onDragRequest, registerRef, autoPlayVideo,
}) {
    const iconUrl = useFileIcon(file.id);
    const [iconFailed, setIconFailed] = useState(false);
    const [mediaFailed, setMediaFailed] = useState(false);

    useEffect(() => { setIconFailed(false); setMediaFailed(false); }, [file.id]);

    const setRef = useCallback((el) => { registerRef(file.id, el); }, [file.id, registerRef]);

    const handleClick = (e) => {
        e.stopPropagation();
        onSelect(file.id);
    };
    const handleDoubleClick = (e) => {
        e.stopPropagation();
        onOpen(file);
    };
    const handleMouseDown = (e) => {
        if (e.button !== 2) return;
        e.stopPropagation();
        onContextRequest(file);
    };

    const handleDragStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragRequest(file);
    };

    const hasMedia = file.mediaKind && !mediaFailed;

    return (
        <Box
            ref={setRef}
            data-file-item=""
            draggable
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onMouseDown={handleMouseDown}
            onContextMenu={(e) => e.stopPropagation()}
            onDragStart={handleDragStart}
            sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 0.5, p: 1, borderRadius: 0,
                userSelect: 'none',
                opacity: cut ? 0.45 : 1,
                bgcolor: selected ? 'rgba(168,85,247,0.25)' : 'transparent',
                border: selected ? '1px solid rgba(168,85,247,0.6)' : '1px solid transparent',
                transition: 'background 0.1s, opacity 0.15s',
                '&:hover': {
                    bgcolor: selected ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.05)',
                },
                width: 90, boxSizing: 'border-box',
            }}
        >
            <Box
                sx={{
                    width: '100%', height: 56,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 0, overflow: 'hidden', position: 'relative',
                    bgcolor: hasMedia ? 'rgba(0,0,0,0.35)' : 'transparent',
                    pointerEvents: 'none',
                }}
            >
                {hasMedia ? (
                    <MediaThumb file={file} autoPlayVideo={autoPlayVideo} />
                ) : iconUrl && !iconFailed ? (
                    <img
                        src={iconUrl}
                        width="48" height="48"
                        alt=""
                        draggable={false}
                        onError={() => setIconFailed(true)}
                        style={{ objectFit: 'contain' }}
                    />
                ) : (
                    <span style={{ fontSize: 36, lineHeight: 1 }}>
                        {file.isDir ? '📁' : '📄'}
                    </span>
                )}
            </Box>
            <Typography
                variant="caption"
                sx={{
                    color: '#fff', textAlign: 'center', wordBreak: 'break-word',
                    lineHeight: 1.15, maxWidth: '100%', overflow: 'hidden',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}
            >
                {file.name}
            </Typography>
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/* FileViewInner                                                       */
/* ------------------------------------------------------------------ */

function FileViewInner({ basePath }) {
    const [currentPath, setCurrentPath] = useState(basePath);
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [cutPaths, setCutPaths] = useState(() => new Set());

    /* --- Состояние кисти --- */
    const [inContainer, setInContainer] = useState(false);
    const [brushMode, setBrushMode] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    /* --- Единственная подписка на директорию --- */
    const { files, loading, error, reload } = useDirectory(currentPath);

    /* --- Радиус --- */
    const initialRadius = (() => {
        try {
            const saved = parseFloat(localStorage.getItem(STORAGE_KEY));
            if (!Number.isFinite(saved)) return DEFAULT_BRUSH_RADIUS;
            return Math.max(0, Math.min(MAX_BRUSH_RADIUS, saved));
        } catch (_) { return DEFAULT_BRUSH_RADIUS; }
    })();

    const radiusTarget = useMotionValue(initialRadius);
    const radiusSpring = useSpring(radiusTarget, RADIUS_SPRING);
    const brushX = useMotionValue(0);
    const brushY = useMotionValue(0);
    const [radiusDisplay, setRadiusDisplay] = useState(Math.round(initialRadius));

    const brushLeft = useTransform([brushX, radiusSpring], ([x, r]) => x - r);
    const brushTop = useTransform([brushY, radiusSpring], ([y, r]) => y - r);
    const brushSize = useTransform(radiusSpring, (r) => r * 2);

    /* --- Единый режим: кисть включена, пока радиус >= порога --- */
    const brushEnabled = radiusDisplay >= COLLAPSE_THRESHOLD;

    /* --- Refs --- */
    const containerRef = useRef(null);
    const fileRefs = useRef(new Map());
    const selectedIdsRef = useRef(selectedIds);
    const brushRef = useRef({ mode: null, workingSet: null });
    const brushEnabledRef = useRef(brushEnabled);
    const lastMousePosRef = useRef(null);

    useEffect(() => { brushEnabledRef.current = brushEnabled; }, [brushEnabled]);

    const filesRef = useRef(files);
    useEffect(() => { filesRef.current = files; }, [files]);

    const currentPathRef = useRef(currentPath);
    useEffect(() => { currentPathRef.current = currentPath; }, [currentPath]);

    const reloadRef = useRef(reload);
    useEffect(() => { reloadRef.current = reload; }, [reload]);

    useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

    /* --- Сброс при смене папки --- */
    useEffect(() => {
        setSelectedIds(new Set());
        setBrushMode(null);
        brushRef.current = { mode: null, workingSet: null };
    }, [currentPath]);

    /* --- Вырезанные --- */
    useEffect(() => {
        const api = window.electron_desktop_API;
        if (!api) return;

        api.getCutPaths?.()
            .then((res) => {
                const arr = Array.isArray(res) ? res : (res?.paths || []);
                setCutPaths(new Set(arr));
            })
            .catch(() => { });

        const off = api.on?.('fs:cut-changed', (payload) => {
            const arr = Array.isArray(payload?.paths) ? payload.paths : [];
            setCutPaths(new Set(arr));
        });
        return () => { off?.(); };
    }, []);

    /* --- Перезагрузка по запросу main --- */
    useEffect(() => {
        const api = window.electron_desktop_API;
        if (!api?.on) return;
        const offReload = api.on('fs:request-reload', () => { reloadRef.current?.(); });
        return () => { offReload?.(); };
    }, []);

    /* --- Клавиатурные шорткаты через main --- */
    useEffect(() => {
        const api = window.electron_desktop_API;
        if (!api) return;

        api.enableKeyboardCapture?.();

        const off = api.on?.('fs:shortcut', (payload) => {
            if (!payload) return;
            const { action, shift } = payload;
            const selected = selectedIdsRef.current;

            if (action === 'copy' && selected.size > 0) {
                api.copyFiles([...selected]);
            } else if (action === 'cut' && selected.size > 0) {
                api.cutFiles([...selected]);
            } else if (action === 'paste') {
                const dir = currentPathRef.current;
                if (!dir) return;
                api.pasteFiles(dir).then((res) => {
                    if (res?.success) reloadRef.current?.();
                });
            } else if (action === 'selectAll') {
                setSelectedIds(new Set(filesRef.current.map((f) => f.id)));
            } else if (action === 'delete' && selected.size > 0) {
                const paths = [...selected];
                const hard = !!shift;
                (async () => {
                    if (hard) {
                        if (!window.confirm(`Удалить безвозвратно ${paths.length} объект(ов)?`)) return;
                        for (const p of paths) {
                            try { await api.deletePath(p); } catch (_) { }
                        }
                    } else {
                        for (const p of paths) {
                            try { await api.trashPath(p); } catch (_) { }
                        }
                    }
                    reloadRef.current?.();
                })();
            }
        });

        return () => {
            api.disableKeyboardCapture?.();
            off?.();
        };
    }, []);

    /* --- Производные --- */
    const videoCount = useMemo(
        () => files.filter((f) => f.mediaKind === 'video').length,
        [files],
    );
    const autoPlayVideo = videoCount <= AUTOPLAY_VIDEO_LIMIT;

    const crumbs = useMemo(() => buildCrumbs(currentPath), [currentPath]);
    const canGoBack = !isRoot(currentPath);

    /* --- Рефы элементов --- */
    const registerRef = useCallback((id, el) => {
        if (el) fileRefs.current.set(id, el);
        else fileRefs.current.delete(id);
    }, []);

    /* --- Навигация --- */
    const handleOpenFolder = useCallback((folderPath) => setCurrentPath(folderPath), []);

    const handleBack = useCallback(() => {
        setCurrentPath((prev) => {
            if (isRoot(prev)) return prev;
            const parent = prev.replace(/[\\/][^\\/]+[\\/]?$/, '') || '/';
            return parent || '/';
        });
    }, []);

    const handleNavigateTo = useCallback((targetPath) => setCurrentPath(targetPath), []);

    /* --- Выделение кликом (работает только в режиме курсора) --- */
    const handleSelect = useCallback((id) => {
        setSelectedIds(new Set([id]));
    }, []);

    /* --- Открытие --- */
    const handleOpen = useCallback(async (file) => {
        const api = window.electron_desktop_API;
        if (file.isDir) { handleOpenFolder(file.id); return; }
        await api.openPath(file.id);
    }, [handleOpenFolder]);

    /* --- ПКМ / drag-out --- */
    const handleItemContextRequest = useCallback((file) => {
        const api = window.electron_desktop_API;
        if (!api?.setContextPaths) return;
        const selected = selectedIdsRef.current;
        const paths = selected.has(file.id) ? [...selected] : [file.id];
        api.setContextPaths({ kind: 'files', paths });
    }, []);

    const handleItemDragRequest = useCallback((file) => {
        const api = window.electron_desktop_API;
        if (!api?.startDrag) return;
        const selected = selectedIdsRef.current;
        const paths = selected.has(file.id) ? [...selected] : [file.id];
        api.startDrag(paths);
    }, []);

    /* --- Drag-in --- */
    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);

        const api = window.electron_desktop_API;
        if (!api) { console.warn('[drop] no api'); return; }

        const dt = e.dataTransfer;
        const items = dt.items;
        if (!items || items.length === 0) return;

        const handlePromises = [];
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            if (it.kind !== 'file') continue;
            if (typeof it.getAsFileSystemHandle !== 'function') continue;
            try { handlePromises.push(it.getAsFileSystemHandle()); }
            catch (err) { console.error(`[drop] item[${i}] sync FSA call threw:`, err); }
        }

        const inlineFiles = [];
        for (let i = 0; i < handlePromises.length; i++) {
            try {
                const handle = await handlePromises[i];
                if (!handle || handle.kind !== 'file') continue;
                const file = await handle.getFile();
                const buf = await file.arrayBuffer();
                if (buf.byteLength > 0) {
                    inlineFiles.push({ name: file.name || '', data: new Uint8Array(buf) });
                }
            } catch (err) { console.error(`[drop] handle[${i}] failed:`, err); }
        }

        if (inlineFiles.length === 0) return;
        const res = await api.writeDroppedFiles(inlineFiles, currentPath);
        if (res?.success) reload();
    }, [currentPath, reload]);

    /* --- Кисть: применение в точке --- */
    const applyBrushAt = useCallback((x, y) => {
        const st = brushRef.current;
        if (!st.workingSet) return;
        const r = radiusSpring.get();
        if (r < MIN_BRUSH_RADIUS) return;
        const r2 = r * r;
        let changed = false;

        fileRefs.current.forEach((el, id) => {
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const closestX = Math.max(rect.left, Math.min(x, rect.right));
            const closestY = Math.max(rect.top, Math.min(y, rect.bottom));
            const dx = x - closestX;
            const dy = y - closestY;
            if (dx * dx + dy * dy <= r2) {
                if (st.mode === 'add' && !st.workingSet.has(id)) {
                    st.workingSet.add(id); changed = true;
                } else if (st.mode === 'remove' && st.workingSet.has(id)) {
                    st.workingSet.delete(id); changed = true;
                }
            }
        });
        if (changed) setSelectedIds(new Set(st.workingSet));
    }, [radiusSpring]);

    /* --- Радиус --- */
    const setRadius = useCallback((next) => {
        next = Math.max(0, Math.min(MAX_BRUSH_RADIUS, next));
        radiusTarget.set(next);
        setRadiusDisplay(Math.round(next));
        try { localStorage.setItem(STORAGE_KEY, String(next)); } catch (_) { }
    }, [radiusTarget]);

    const adjustRadius = useCallback((delta) => {
        setRadius(radiusTarget.get() + delta);
    }, [radiusTarget, setRadius]);

    /* --- Колесо: сжатие/рост кисти --- */
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onWheel = (e) => {
            if (e.target instanceof Element && e.target.closest('[data-no-brush-wheel]')) return;

            const current = radiusTarget.get();
            const delta = -Math.sign(e.deltaY) * WHEEL_STEP;
            let next = current + delta;
            if (next < MIN_BRUSH_RADIUS) next = 0;
            next = Math.max(0, Math.min(MAX_BRUSH_RADIUS, next));

            if (next === current) return;
            e.preventDefault();
            e.stopPropagation();
            setRadius(next);
        };

        container.addEventListener('wheel', onWheel, { passive: false });
        return () => container.removeEventListener('wheel', onWheel);
    }, [radiusTarget, setRadius]);

    /* --------------------------------------------------------------
     * Единый обработчик мыши
     * -------------------------------------------------------------- */
    useEffect(() => {
        const onMove = (e) => {
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
            brushX.set(e.clientX);
            brushY.set(e.clientY);

            const container = containerRef.current;
            setInContainer(!!(container && container.contains(e.target)));

            if (brushRef.current.mode) {
                e.preventDefault();
                applyBrushAt(e.clientX, e.clientY);
            }
        };

        const onDown = (e) => {
            if (e.button !== 0 && e.button !== 2) return;

            const container = containerRef.current;
            if (!container || !container.contains(e.target)) return;
            if (e.target instanceof Element && e.target.closest('[data-no-brush]')) return;

            /* --- Режим кисти: только рисование, никакого UI --- */
            if (brushEnabledRef.current) {
                e.preventDefault();
                e.stopPropagation();
                container.focus?.();

                const mode = e.button === 0 ? 'add' : 'remove';
                brushRef.current = { mode, workingSet: new Set(selectedIdsRef.current) };
                setBrushMode(mode);
                applyBrushAt(e.clientX, e.clientY);
                return;
            }

            /* --- Режим курсора: обычное поведение --- */
            // Файлы обрабатывают mousedown сами (через FileItem).
            if (isFileItem(e.target)) return;

            if (e.button === 2) {
                // ПКМ по фону — контекст для нативного меню
                const api = window.electron_desktop_API;
                if (api?.setContextPaths) {
                    const selected = selectedIdsRef.current;
                    if (selected.size > 0) {
                        api.setContextPaths({ kind: 'files', paths: [...selected] });
                    } else {
                        api.setContextPaths({ kind: 'background', paths: [currentPathRef.current] });
                    }
                }
            } else if (e.button === 0) {
                // ЛКМ по фону — снять выделение
                setSelectedIds(new Set());
            }
        };

        const onUp = () => {
            if (brushRef.current.mode) {
                brushRef.current = { mode: null, workingSet: null };
                setBrushMode(null);
            }
        };

        const onCtx = (e) => {
            if (!brushEnabledRef.current) return;      // в режиме курсора меню разрешено
            if (e.target instanceof Element && e.target.closest('[data-no-brush]')) return;
            e.preventDefault();
            e.stopPropagation();
        };

        const onBlur = () => {
            if (brushRef.current.mode) {
                brushRef.current = { mode: null, workingSet: null };
                setBrushMode(null);
            }
            setInContainer(false);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mousedown', onDown, true);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('contextmenu', onCtx, true);
        window.addEventListener('blur', onBlur);

        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mousedown', onDown, true);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('contextmenu', onCtx, true);
            window.removeEventListener('blur', onBlur);
        };
    }, [applyBrushAt, brushX, brushY]);

    /* --- Стили сетки --- */
    const containerStyle = useMemo(() => ({
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, 90px)',
        gap: 0.5,
        p: 1,
        alignContent: 'flex-start',
        width: '100%', height: '100%',
        boxSizing: 'border-box',
        overflowY: 'auto', overflowX: 'hidden',
        position: 'relative',
        userSelect: 'none',
        outline: 'none',
    }), []);

    /* --- Показывать ли кисть --- */
    const showBrush = brushEnabled && (brushMode || inContainer);

    /* --- Рендер --- */
    return (
        <Box
            sx={{
                position: 'absolute', inset: 0, zIndex: 0,
                display: 'flex', flexDirection: 'column',
                pointerEvents: 'auto',
            }}
        >
            {/* Панель навигации */}
            <Box
                sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    px: 1.5, py: 0.75, mb: 1,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    maxWidth: '100%', overflow: 'hidden', flexShrink: 0,
                }}
            >
                <IconButton
                    size="small"
                    onClick={handleBack}
                    disabled={!canGoBack}
                    sx={{ color: canGoBack ? '#fff' : 'rgba(255,255,255,0.3)' }}
                >
                    <ArrowBackIcon fontSize="small" />
                </IconButton>

                <Breadcrumbs
                    maxItems={6}
                    separator="/"
                    sx={{
                        color: '#aaa',
                        flex: 1, minWidth: 0,
                        '& .MuiBreadcrumbs-separator': { color: 'rgba(255,255,255,0.3)' },
                        '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' },
                    }}
                >
                    {crumbs.map((c, i) => {
                        const last = i === crumbs.length - 1;
                        return (
                            <Link
                                key={c.path}
                                component="button"
                                underline="hover"
                                onClick={() => handleNavigateTo(c.path)}
                                sx={{
                                    color: last ? '#fff' : '#aaa',
                                    fontSize: 13, fontFamily: 'monospace',
                                    whiteSpace: 'nowrap', cursor: 'pointer',
                                }}
                            >
                                {c.name}
                            </Link>
                        );
                    })}
                </Breadcrumbs>

                {/* Индикатор / ручная регулировка радиуса */}
                <Box
                    data-no-brush=""
                    data-no-brush-wheel=""
                    sx={{
                        display: 'flex', alignItems: 'center', gap: 0.25,
                        ml: 'auto', flexShrink: 0,
                        bgcolor: 'rgba(255,255,255,0.06)',
                        borderRadius: 1, px: 0.5,
                    }}
                >
                    <Box
                        component="span"
                        role="button"
                        onClick={() => adjustRadius(-RADIUS_STEP_BUTTONS)}
                        sx={{
                            color: '#fff', cursor: 'pointer', px: 0.75,
                            fontSize: 16, lineHeight: 1, userSelect: 'none',
                            '&:hover': { color: '#a855f7' },
                        }}
                    >−</Box>
                    <Typography sx={{
                        color: brushEnabled ? '#fff' : '#a855f7',
                        fontSize: 11, minWidth: 22, textAlign: 'center',
                    }}>
                        {brushEnabled ? radiusDisplay : '↺'}
                    </Typography>
                    <Box
                        component="span"
                        role="button"
                        onClick={() => adjustRadius(RADIUS_STEP_BUTTONS)}
                        sx={{
                            color: '#fff', cursor: 'pointer', px: 0.75,
                            fontSize: 16, lineHeight: 1, userSelect: 'none',
                            '&:hover': { color: '#a855f7' },
                        }}
                    >+</Box>
                </Box>
            </Box>

            {/* Сетка файлов */}
            <Box
                ref={containerRef}
                tabIndex={-1}
                onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    if (!dragOver) setDragOver(true);
                }}
                onDragLeave={(e) => {
                    const related = e.relatedTarget;
                    if (related && e.currentTarget.contains(related)) return;
                    setDragOver(false);
                }}
                onDrop={handleDrop}
                sx={{
                    ...containerStyle,
                    // Курсор зависит только от режима
                    cursor: brushEnabled ? 'none' : 'default',
                    // В режиме кисти файлы полностью "выключены" для мыши:
                    // ни кликов, ни dblclick, ни drag, ни contextmenu.
                    '& [data-file-item]': brushEnabled
                        ? { pointerEvents: 'none', cursor: 'none' }
                        : { cursor: 'pointer' },
                    boxShadow: dragOver
                        ? 'inset 0 0 0 2px rgba(168,85,247,0.65)'
                        : 'none',
                    transition: 'box-shadow 0.15s',
                }}
            >
                {loading && files.length === 0 && (
                    <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 5 }}>
                        <CircularProgress size={18} sx={{ color: '#a855f7' }} />
                    </Box>
                )}
                {error === 'permission_denied' && (
                    <Typography sx={{ color: '#f55', p: 2 }}>Нет доступа к папке</Typography>
                )}
                {error && error !== 'permission_denied' && (
                    <Typography sx={{ color: '#f55', p: 2 }}>Ошибка: {error}</Typography>
                )}
                {!loading && !error && files.length === 0 && (
                    <Typography sx={{ color: 'rgba(255,255,255,0.4)', p: 2, fontSize: 13 }}>
                        Папка пуста
                    </Typography>
                )}

                {files.map((file) => (
                    <FileItem
                        key={file.id}
                        file={file}
                        selected={selectedIds.has(file.id)}
                        cut={cutPaths.has(file.id)}
                        onSelect={handleSelect}
                        onOpen={handleOpen}
                        onContextRequest={handleItemContextRequest}
                        onDragRequest={handleItemDragRequest}
                        registerRef={registerRef}
                        autoPlayVideo={autoPlayVideo}
                    />
                ))}

                {showBrush && (
                    <motion.div
                        className="ignore_The_Omniscience_Theme_recursive"
                        style={{
                            position: 'fixed',
                            left: brushLeft, top: brushTop,
                            width: brushSize, height: brushSize,
                            borderRadius: '50%', boxSizing: 'border-box',
                            border: '2px solid',
                            borderColor:
                                brushMode === 'add' ? 'rgba(80, 230, 130, 0.95)'
                                    : brushMode === 'remove' ? 'rgba(255, 90, 90, 0.95)'
                                        : 'rgba(190, 190, 230, 0.55)',
                            background:
                                brushMode === 'add' ? 'rgba(80, 230, 130, 0.18)'
                                    : brushMode === 'remove' ? 'rgba(255, 90, 90, 0.18)'
                                        : 'transparent',
                            boxShadow: brushMode
                                ? `0 0 16px ${brushMode === 'add' ? 'rgba(80,230,130,0.55)' : 'rgba(255,90,90,0.55)'}, inset 0 0 12px ${brushMode === 'add' ? 'rgba(80,230,130,0.25)' : 'rgba(255,90,90,0.25)'}`
                                : '0 0 8px rgba(190,190,230,0.2)',
                            pointerEvents: 'none',
                            zIndex: 9999,
                            transition: 'background 0.12s, border-color 0.12s, box-shadow 0.12s',
                        }}
                    />
                )}
            </Box>
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/* Экспорт                                                             */
/* ------------------------------------------------------------------ */

export default function FileView() {
    const enabled = useSetting('desktopFiles.enabled');
    const configuredPath = useSetting('desktopFiles.path');
    const [basePath, setBasePath] = useState(null);

    useEffect(() => {
        if (!enabled) { setBasePath(null); return; }
        if (configuredPath) { setBasePath(configuredPath); return; }

        const api = window.electron_desktop_API;
        if (!api?.getUserDirs) return;

        let cancelled = false;
        api.getUserDirs()
            .then((dirs) => { if (!cancelled) setBasePath(dirs?.desktop || null); })
            .catch(() => { if (!cancelled) setBasePath(null); });

        return () => { cancelled = true; };
    }, [enabled, configuredPath]);

    if (!enabled || !basePath) return null;

    return <FileViewInner key={basePath} basePath={basePath} />;
}