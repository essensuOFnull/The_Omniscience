import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import useDirectory from './useDirectory';
import { useFileIcon } from './useIcons';

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
                    borderRadius: 4, userSelect: 'none',
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
                    borderRadius: 4, background: '#000',
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
                gap: 0.5, p: 1, borderRadius: 1,
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
                    borderRadius: 1, overflow: 'hidden', position: 'relative',
                    bgcolor: hasMedia ? 'rgba(0,0,0,0.35)' : 'transparent',
                    pointerEvents:'none',
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
                cursor: 'pointer', userSelect: 'none', borderRadius: 0.5,
                opacity: cut ? 0.45 : 1,
                bgcolor: selected ? 'rgba(168,85,247,0.25)' : 'transparent',
                '&:hover': {
                    bgcolor: selected ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.05)',
                },
                transition: 'opacity 0.15s',
            }}
        >
            <Box sx={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 0.5, pointerEvents:'none', }}>
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
/* FileView                                                             */
/* ------------------------------------------------------------------ */

export default function FileView({
    path,
    layout = 'grid',
    onOpen,
    onPathChange,
    navigateSelf = false,
    emptyText = 'Папка пуста',
}) {
    const [internalPath, setInternalPath] = useState(path);
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [cutPaths, setCutPaths] = useState(() => new Set());

    const [shiftHeld, setShiftHeld] = useState(false);
    const [brushMode, setBrushMode] = useState(null);
    const [dragOver, setDragOver] = useState(false);

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

    const containerRef = useRef(null);
    const fileRefs = useRef(new Map());
    const selectedIdsRef = useRef(selectedIds);
    const brushRef = useRef({ mode: null, workingSet: null });
    const lastMousePosRef = useRef(null);

    useEffect(() => { setInternalPath(path); }, [path]);

    const activePath = navigateSelf ? internalPath : path;
    const { files, loading, error, reload } = useDirectory(activePath);

    useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

    useEffect(() => {
        setSelectedIds(new Set());
        setBrushMode(null);
        brushRef.current = { mode: null, workingSet: null };
    }, [activePath]);

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

    const videoCount = useMemo(
        () => files.filter((f) => f.mediaKind === 'video').length,
        [files],
    );
    const autoPlayVideo = videoCount <= AUTOPLAY_VIDEO_LIMIT;

    /* -------------------- DOM-рефы -------------------- */

    const registerRef = useCallback((id, el) => {
        if (el) fileRefs.current.set(id, el);
        else fileRefs.current.delete(id);
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
        if (onOpen) { onOpen(file); return; }
        const api = window.electron_desktop_API;
        if (file.isDir) {
            if (navigateSelf) {
                setInternalPath(file.id);
                onPathChange?.(file.id);
            } else {
                onPathChange?.(file.id);
            }
            return;
        }
        await api.openPath(file.id);
    }, [onOpen, navigateSelf, onPathChange]);

    /* -------------------- ПКМ / drag -------------------- */

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
            api.setContextPaths({ kind: 'background', paths: [activePath] });
        }
    }, [activePath]);

    /* -------------------- Drop-in -------------------- */

    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);

        const api = window.electron_desktop_API;
        if (!api?.dropPaths) return;

        const srcPaths = new Set();

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            for (const f of Array.from(e.dataTransfer.files)) {
                try {
                    const p = api.getPathForFile ? api.getPathForFile(f) : (f.path || '');
                    if (p && typeof p === 'string') srcPaths.add(p);
                } catch (_) { }
            }
        }

        if (srcPaths.size === 0) {
            let uriList = '';
            try { uriList = e.dataTransfer.getData('text/uri-list') || ''; } catch (_) { }
            if (uriList) {
                for (const line of uriList.split(/\r?\n/)) {
                    const s = line.trim();
                    if (!s.startsWith('file://')) continue;
                    try {
                        const u = new URL(s);
                        srcPaths.add(decodeURIComponent(u.pathname));
                    } catch (_) { }
                }
            }
        }

        if (srcPaths.size === 0) return;

        const isMove = !e.ctrlKey;
        const res = await api.dropPaths([...srcPaths], activePath, isMove);
        if (res?.success) reload();
    }, [activePath, reload]);

    /* -------------------- Ctrl+C/X/V/Delete/A -------------------- */

    useEffect(() => {
        const onKeyDown = (e) => {
            const t = e.target;
            if (t instanceof HTMLElement) {
                const tag = t.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable) return;
            }

            const api = window.electron_desktop_API;
            if (!api) return;
            const selected = selectedIdsRef.current;

            if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
                const key = e.key.toLowerCase();
                if (key === 'c' && selected.size > 0) {
                    e.preventDefault();
                    api.copyFiles([...selected]);
                    return;
                }
                if (key === 'x' && selected.size > 0) {
                    e.preventDefault();
                    api.cutFiles([...selected]);
                    return;
                }
                if (key === 'v') {
                    e.preventDefault();
                    api.pasteFiles(activePath).then((res) => {
                        if (res?.success) reload();
                    });
                    return;
                }
                if (key === 'a') {
                    e.preventDefault();
                    setSelectedIds(new Set(files.map((f) => f.id)));
                    return;
                }
            }

            if (e.key === 'Delete' && selected.size > 0) {
                e.preventDefault();
                const paths = [...selected];
                const hard = e.shiftKey;
                const run = async () => {
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
                    reload();
                };
                run();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [activePath, files, reload]);

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

    /* -------------------- Стили -------------------- */

    const containerStyle = useMemo(() => ({
        display: layout === 'list' ? 'flex' : 'grid',
        flexDirection: layout === 'list' ? 'column' : undefined,
        gridTemplateColumns: layout === 'grid' ? 'repeat(auto-fill, 90px)' : undefined,
        gap: layout === 'grid' ? 0.5 : 0,
        p: 1,
        alignContent: 'flex-start',
        width: '100%', height: '100%',
        boxSizing: 'border-box',
        overflowY: 'auto', overflowX: 'hidden',
        position: 'relative',
        userSelect: 'none',
        cursor: shiftHeld ? 'none' : 'default',
    }), [layout, shiftHeld]);

    return (
        <Box
            ref={containerRef}
            tabIndex={-1}
            onMouseDown={(e) => {
                if (e.button === 0) containerRef.current?.focus?.();
                handleContainerMouseDown(e);
            }}
            onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
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
                outline: 'none',
                boxShadow: dragOver
                    ? 'inset 0 0 0 2px rgba(168,85,247,0.65)'
                    : 'none',
                transition: 'box-shadow 0.15s',
                pointerEvents: 'auto',
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
                    {emptyText}
                </Typography>
            )}

            {layout === 'list'
                ? files.map((file) => (
                    <FileListRow
                        key={file.id} file={file}
                        selected={selectedIds.has(file.id)}
                        cut={cutPaths.has(file.id)}
                        onSelect={handleSelect} onOpen={handleOpen}
                        onContextRequest={handleItemContextRequest}
                        onDragRequest={handleItemDragRequest}
                        registerRef={registerRef}
                    />
                ))
                : files.map((file) => (
                    <FileItem
                        key={file.id} file={file}
                        selected={selectedIds.has(file.id)}
                        cut={cutPaths.has(file.id)}
                        onSelect={handleSelect} onOpen={handleOpen}
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
    );
}