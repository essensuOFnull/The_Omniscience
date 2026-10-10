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
const MIN_BRUSH_RADIUS = 15;
const WHEEL_SENSITIVITY = 0.15;
const STORAGE_KEY = 'fileview.brushRadius';
const RADIUS_SPRING = { stiffness: 260, damping: 26, mass: 0.5 };
const AUTOPLAY_VIDEO_LIMIT = 12;

/* ------------------------------------------------------------------ */
/* Утилиты путей                                                        */
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
        if (e.shiftKey) return;
        onSelect(file.id, e);
    };
    const handleDoubleClick = (e) => {
        e.stopPropagation();
        if (e.shiftKey) return;
        onOpen(file);
    };
    const handleMouseDown = (e) => {
        if (e.button !== 2) return;
        if (e.shiftKey) return;
        e.stopPropagation();
        onContextRequest(file);
    };
    const handleContextMenu = (e) => { e.stopPropagation(); };

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
            onContextMenu={handleContextMenu}
            onDragStart={handleDragStart}
            sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 0.5, p: 1, borderRadius: 0,
                cursor: 'pointer', userSelect: 'none',
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
/* FileListRow                                                          */
/* ------------------------------------------------------------------ */

function FileListRow({
    file, selected, cut, onSelect, onOpen, onContextRequest,
    onDragRequest, registerRef,
}) {
    const iconUrl = useFileIcon(file.id);
    const [iconFailed, setIconFailed] = useState(false);
    const [mediaFailed, setMediaFailed] = useState(false);

    useEffect(() => { setIconFailed(false); setMediaFailed(false); }, [file.id]);

    const setRef = useCallback((el) => { registerRef(file.id, el); }, [file.id, registerRef]);

    const hasMedia = file.mediaKind === 'image' && !mediaFailed;

    const handleClick = (e) => {
        e.stopPropagation();
        if (e.shiftKey) return;
        onSelect(file.id, e);
    };
    const handleMouseDown = (e) => {
        if (e.button !== 2) return;
        if (e.shiftKey) return;
        e.stopPropagation();
        onContextRequest(file);
    };
    const handleDragStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragRequest(file);
    };

    return (
        <Box
            ref={setRef}
            data-file-item=""
            draggable
            onClick={handleClick}
            onDoubleClick={(e) => { e.stopPropagation(); if (!e.shiftKey) onOpen(file); }}
            onMouseDown={handleMouseDown}
            onContextMenu={(e) => e.stopPropagation()}
            onDragStart={handleDragStart}
            sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                px: 1, py: 0.5,
                cursor: 'pointer', userSelect: 'none', borderRadius: 0,
                opacity: cut ? 0.45 : 1,
                bgcolor: selected ? 'rgba(168,85,247,0.25)' : 'transparent',
                '&:hover': {
                    bgcolor: selected ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.05)',
                },
                transition: 'opacity 0.15s',
            }}
        >
            <Box
                sx={{
                    width: 24, height: 24,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', borderRadius: 0,
                    pointerEvents: 'none',
                }}
            >
                {hasMedia ? (
                    <img
                        src={file.fileUrl}
                        alt=""
                        draggable={false}
                        onError={() => setMediaFailed(true)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : iconUrl && !iconFailed ? (
                    <img
                        src={iconUrl}
                        width="20" height="20"
                        alt=""
                        draggable={false}
                        onError={() => setIconFailed(true)}
                        style={{ objectFit: 'contain' }}
                    />
                ) : (
                    <span style={{ fontSize: 16 }}>{file.isDir ? '📁' : '📄'}</span>
                )}
            </Box>
            <Typography sx={{ color: '#fff', fontSize: 13 }} noWrap>
                {file.name}
            </Typography>
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/* FileViewInner — сердце рабочего стола                               */
/* ------------------------------------------------------------------ */

function FileViewInner({ basePath }) {
    const [currentPath, setCurrentPath] = useState(basePath);
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [cutPaths, setCutPaths] = useState(() => new Set());

    const [shiftHeld, setShiftHeld] = useState(false);
    const [brushMode, setBrushMode] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    /* --- Единственная подписка на директорию во всём компоненте --- */
    const { files, loading, error, reload } = useDirectory(currentPath);

    /* --- Radius --- */
    const initialRadius = (() => {
        try {
            const saved = parseFloat(localStorage.getItem(STORAGE_KEY));
            return Number.isFinite(saved)
                ? Math.max(MIN_BRUSH_RADIUS, saved)
                : DEFAULT_BRUSH_RADIUS;
        } catch (_) { return DEFAULT_BRUSH_RADIUS; }
    })();

    const radiusTarget = useMotionValue(initialRadius);
    const radiusSpring = useSpring(radiusTarget, RADIUS_SPRING);
    const brushX = useMotionValue(0);
    const brushY = useMotionValue(0);

    const brushLeft = useTransform([brushX, radiusSpring], ([x, r]) => x - r);
    const brushTop = useTransform([brushY, radiusSpring], ([y, r]) => y - r);
    const brushSize = useTransform(radiusSpring, (r) => r * 2);

    /* --- Refs --- */
    const containerRef = useRef(null);
    const fileRefs = useRef(new Map());
    const selectedIdsRef = useRef(selectedIds);
    const brushRef = useRef({ mode: null, workingSet: null });
    const lastMousePosRef = useRef(null);

    const filesRef = useRef(files);
    useEffect(() => { filesRef.current = files; }, [files]);

    const currentPathRef = useRef(currentPath);
    useEffect(() => { currentPathRef.current = currentPath; }, [currentPath]);

    // reload меняет идентичность при каждом ре-рендере — держим в ref,
    // чтобы подписка на события main не переподключалась.
    const reloadRef = useRef(reload);
    useEffect(() => { reloadRef.current = reload; }, [reload]);

    useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

    // Сброс выделения и кисти при смене папки
    useEffect(() => {
        setSelectedIds(new Set());
        setBrushMode(null);
        brushRef.current = { mode: null, workingSet: null };
    }, [currentPath]);

    /* -------------------- Вырезанные файлы -------------------- */

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

    /* -------------------- Слушаем main: перезагрузка -------------------- */

    useEffect(() => {
        const api = window.electron_desktop_API;
        if (!api?.on) return;

        const offReload = api.on('fs:request-reload', () => {
            reloadRef.current?.();
        });

        return () => { offReload?.(); };
    }, []);

    /* -------------------- Keyboard capture через main -------------------- */
    // Desktop-окно может не получать клавиатурный фокус от WM,
    // поэтому Ctrl+C/X/V/A и Delete приходят не через keydown, а через
    // before-input-event в главном процессе. Здесь — только реакция.

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
    }, []);  // один раз за жизнь компонента

    /* -------------------- Производные -------------------- */

    const videoCount = useMemo(
        () => files.filter((f) => f.mediaKind === 'video').length,
        [files],
    );
    const autoPlayVideo = videoCount <= AUTOPLAY_VIDEO_LIMIT;

    const crumbs = useMemo(() => buildCrumbs(currentPath), [currentPath]);
    const canGoBack = !isRoot(currentPath);

    /* -------------------- DOM-рефы -------------------- */

    const registerRef = useCallback((id, el) => {
        if (el) fileRefs.current.set(id, el);
        else fileRefs.current.delete(id);
    }, []);

    /* -------------------- Навигация -------------------- */

    const handleOpenFolder = useCallback((folderPath) => {
        setCurrentPath(folderPath);
    }, []);

    const handleBack = useCallback(() => {
        setCurrentPath((prev) => {
            if (isRoot(prev)) return prev;
            const parent = prev.replace(/[\\/][^\\/]+[\\/]?$/, '') || '/';
            return parent || '/';
        });
    }, []);

    const handleNavigateTo = useCallback((targetPath) => {
        setCurrentPath(targetPath);
    }, []);

    /* -------------------- Выделение кликом -------------------- */

    const handleSelect = useCallback((id, e) => {
        if (e && e.shiftKey) return;
        const additive = e && (e.ctrlKey || e.metaKey);
        setSelectedIds((prev) => {
            if (additive) {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
            }
            return new Set([id]);
        });
    }, []);

    /* -------------------- Открытие -------------------- */

    const handleOpen = useCallback(async (file) => {
        const api = window.electron_desktop_API;
        if (file.isDir) {
            handleOpenFolder(file.id);
            return;
        }
        await api.openPath(file.id);
    }, [handleOpenFolder]);

    /* -------------------- ПКМ / drag-out -------------------- */

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

    const handleContainerMouseDown = useCallback((e) => {
        if (e.button !== 2) return;
        if (e.shiftKey) return;
        if (e.target instanceof Element && e.target.closest('[data-file-item]')) return;

        const api = window.electron_desktop_API;
        if (!api?.setContextPaths) return;

        const selected = selectedIdsRef.current;
        if (selected.size > 0) {
            api.setContextPaths({ kind: 'files', paths: [...selected] });
        } else {
            api.setContextPaths({ kind: 'background', paths: [currentPath] });
        }
    }, [currentPath]);

    /* -------------------- Drag-in -------------------- */

    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);

        const api = window.electron_desktop_API;
        if (!api) { console.warn('[drop] no api'); return; }

        const dt = e.dataTransfer;
        console.log('[drop] ===== DROP =====');
        console.log('[drop] effectAllowed:', dt.effectAllowed);
        console.log('[drop] types:', Array.from(dt.types || []));
        console.log('[drop] items.length:', dt.items?.length ?? 0);
        console.log('[drop] files.length:', dt.files?.length ?? 0);

        const items = dt.items;
        if (!items || items.length === 0) {
            console.warn('[drop] no items — aborting');
            return;
        }

        // КРИТИЧНО: getAsFileSystemHandle вызывается СИНХРОННО для всех items.
        // DataTransferItemList инвалидируется после первого await — если ждать
        // внутри цикла, второй вызов молча вернёт null.
        const handlePromises = [];
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            console.log(`[drop] item[${i}]: kind=${it.kind}, type=${it.type}, hasFSA=${typeof it.getAsFileSystemHandle === 'function'}`);
            if (it.kind !== 'file') continue;
            if (typeof it.getAsFileSystemHandle !== 'function') continue;
            try {
                handlePromises.push(it.getAsFileSystemHandle());
            } catch (err) {
                console.error(`[drop] item[${i}] sync FSA call threw:`, err);
            }
        }

        console.log('[drop] handle promises created:', handlePromises.length);

        const inlineFiles = [];
        for (let i = 0; i < handlePromises.length; i++) {
            try {
                const handle = await handlePromises[i];
                console.log(`[drop] handle[${i}]:`, handle ? handle.kind : 'null');
                if (!handle || handle.kind !== 'file') continue;

                const file = await handle.getFile();
                console.log(`[drop] file[${i}]: name="${file.name}", size=${file.size}, type="${file.type}"`);

                const buf = await file.arrayBuffer();
                console.log(`[drop] buffer[${i}]: ${buf.byteLength} bytes`);

                if (buf.byteLength > 0) {
                    inlineFiles.push({ name: file.name || '', data: new Uint8Array(buf) });
                }
            } catch (err) {
                console.error(`[drop] handle[${i}] failed:`, err);
            }
        }

        console.log('[drop] collected inline files:', inlineFiles.length);
        if (inlineFiles.length === 0) {
            console.warn('[drop] nothing to write — aborting');
            return;
        }

        const res = await api.writeDroppedFiles(inlineFiles, currentPath);
        console.log('[drop] writeDroppedFiles result:', res);
        if (res?.success) reload();
    }, [currentPath, reload]);

    /* -------------------- Трекер мыши -------------------- */

    useEffect(() => {
        const onMove = (e) => {
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
            brushX.set(e.clientX);
            brushY.set(e.clientY);
        };
        document.addEventListener('mousemove', onMove);
        return () => document.removeEventListener('mousemove', onMove);
    }, [brushX, brushY]);

    /* -------------------- Shift -------------------- */

    useEffect(() => {
        const applyShift = (e) => {
            const held = !!e.shiftKey;
            setShiftHeld(held);
            if (held && lastMousePosRef.current) {
                brushX.set(lastMousePosRef.current.x);
                brushY.set(lastMousePosRef.current.y);
            }
        };
        const onKeyDown = (e) => applyShift(e);
        const onKeyUp = (e) => applyShift(e);
        const onBlur = () => {
            setShiftHeld(false);
            setBrushMode(null);
            brushRef.current = { mode: null, workingSet: null };
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', onBlur);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
        };
    }, [brushX, brushY]);

    /* -------------------- Колесо: радиус -------------------- */

    useEffect(() => {
        if (!shiftHeld) return;
        const onWheel = (e) => {
            const t = e.target;
            if (t instanceof Element && t.closest('[data-no-brush-wheel]')) return;
            e.preventDefault();
            e.stopPropagation();
            const delta = -e.deltaY * WHEEL_SENSITIVITY;
            const next = Math.max(MIN_BRUSH_RADIUS, radiusTarget.get() + delta);
            radiusTarget.set(next);
            try { localStorage.setItem(STORAGE_KEY, String(next)); } catch (_) { }
        };
        document.addEventListener('wheel', onWheel, { passive: false });
        return () => document.removeEventListener('wheel', onWheel);
    }, [shiftHeld, radiusTarget]);

    /* -------------------- Кисть -------------------- */

    useEffect(() => {
        if (!shiftHeld) {
            setBrushMode(null);
            brushRef.current = { mode: null, workingSet: null };
            return;
        }

        const applyBrushAt = (x, y) => {
            const st = brushRef.current;
            if (!st.workingSet) return;
            const r = radiusSpring.get();
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
        };

        const onMove = (e) => {
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
            brushX.set(e.clientX);
            brushY.set(e.clientY);
            if (brushRef.current.mode) {
                e.preventDefault();
                applyBrushAt(e.clientX, e.clientY);
            }
        };
        const onDown = (e) => {
            if (e.button !== 0 && e.button !== 2) return;
            const t = e.target;
            if (t instanceof Element && t.closest('[data-no-brush]')) return;
            e.preventDefault();
            e.stopPropagation();
            const mode = e.button === 0 ? 'add' : 'remove';
            brushRef.current = { mode, workingSet: new Set(selectedIdsRef.current) };
            setBrushMode(mode);
            applyBrushAt(e.clientX, e.clientY);
        };
        const onUp = () => {
            if (!brushRef.current.mode) return;
            brushRef.current = { mode: null, workingSet: null };
            setBrushMode(null);
        };
        const onCtx = (e) => {
            const t = e.target;
            if (t instanceof Element && t.closest('[data-no-brush]')) return;
            e.preventDefault();
            e.stopPropagation();
        };

        let rafId = null;
        const scheduleReapply = () => {
            if (rafId != null) return;
            rafId = requestAnimationFrame(() => {
                rafId = null;
                if (brushRef.current.mode && lastMousePosRef.current) {
                    applyBrushAt(lastMousePosRef.current.x, lastMousePosRef.current.y);
                }
            });
        };
        const unsubscribeRadius = radiusSpring.on('change', scheduleReapply);

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mousedown', onDown, true);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('contextmenu', onCtx, true);

        return () => {
            if (rafId != null) cancelAnimationFrame(rafId);
            unsubscribeRadius();
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mousedown', onDown, true);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('contextmenu', onCtx, true);
        };
    }, [shiftHeld, radiusSpring, brushX, brushY]);

    /* -------------------- Стили сетки -------------------- */

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
        cursor: shiftHeld ? 'none' : 'default',
        outline: 'none',
    }), [shiftHeld]);

    /* -------------------- Рендер -------------------- */

    return (
        <Box
            sx={{
                position: 'absolute', inset: 0, zIndex: 0,
                display: 'flex', flexDirection: 'column',
                pointerEvents: 'auto',
            }}
        >
            {/* ----- Панель навигации ----- */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 0.75,
                    mb: 1,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    flexShrink: 0,
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
                        flex: 1,
                        minWidth: 0,
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
                                    fontSize: 13,
                                    fontFamily: 'monospace',
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                }}
                            >
                                {c.name}
                            </Link>
                        );
                    })}
                </Breadcrumbs>
            </Box>

            {/* ----- Сетка файлов (принимает drop извне и отдаёт drag наружу) ----- */}
            <Box
                ref={containerRef}
                tabIndex={-1}
                onMouseDown={(e) => {
                    if (e.button === 0) containerRef.current?.focus?.();
                    handleContainerMouseDown(e);
                }}
                onDragEnter={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
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

                {shiftHeld && (
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
/* Экспорт: самодостаточный рабочий стол                               */
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