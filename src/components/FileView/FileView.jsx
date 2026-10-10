import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import useDirectory from './useDirectory';
import { useFileIcon } from './useIcons';

/* ------------------------------------------------------------------ */
/* Параметры кисти                                                     */
/* ------------------------------------------------------------------ */

const DEFAULT_BRUSH_RADIUS = 55;
const MIN_BRUSH_RADIUS     = 15;
const WHEEL_SENSITIVITY    = 0.15;
const STORAGE_KEY          = 'fileview.brushRadius';
const RADIUS_SPRING = { stiffness: 260, damping: 26, mass: 0.5 };

const AUTOPLAY_VIDEO_LIMIT = 12;

/* ------------------------------------------------------------------ */
/* Превью медиафайла                                                    */
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
                    width: '100%', height: '100%',
                    objectFit: 'contain',
                    borderRadius: 4,
                    pointerEvents: 'none',
                    userSelect: 'none',
                }}
            />
        );
    }

    if (file.mediaKind === 'video') {
        return (
            <video
                src={file.fileUrl}
                autoPlay={autoPlayVideo}
                muted
                loop
                playsInline
                preload="metadata"
                draggable={false}
                onError={() => setFailed(true)}
                style={{
                    width: '100%', height: '100%',
                    objectFit: 'cover',
                    borderRadius: 4,
                    pointerEvents: 'none',
                    background: '#000',
                }}
            />
        );
    }

    return null;
}

/* ------------------------------------------------------------------ */
/* Одна иконка файла                                                    */
/* ------------------------------------------------------------------ */

function FileItem({ file, selected, onSelect, onOpen, onContextMenu, registerRef, autoPlayVideo }) {
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
    const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) return;
        onSelect(file.id, e);
        onContextMenu(e, file);
    };

    const hasMedia = file.mediaKind && !mediaFailed;

    return (
        <Box
            ref={setRef}
            data-file-item=""
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 0.5, p: 1, borderRadius: 1,
                cursor: 'pointer', userSelect: 'none',
                bgcolor: selected ? 'rgba(168,85,247,0.25)' : 'transparent',
                border: selected ? '1px solid rgba(168,85,247,0.6)' : '1px solid transparent',
                transition: 'background 0.1s',
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
                }}
            >
                {hasMedia ? (
                    <MediaThumb file={file} autoPlayVideo={autoPlayVideo} />
                ) : iconUrl && !iconFailed ? (
                    <img
                        src={iconUrl}
                        width="48"
                        height="48"
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
/* FileView                                                             */
/* ------------------------------------------------------------------ */

export default function FileView({
    path,
    layout = 'grid',
    onOpen,
    onContextMenu,
    onPathChange,
    navigateSelf = false,
    emptyText = 'Папка пуста',
}) {
    const [internalPath, setInternalPath] = useState(path);
    const [selectedIds, setSelectedIds] = useState(() => new Set());

    const [shiftHeld, setShiftHeld] = useState(false);
    const [brushMode, setBrushMode] = useState(null);

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
    const brushTop  = useTransform([brushY, radiusSpring], ([y, r]) => y - r);
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

    const videoCount = useMemo(
        () => files.filter((f) => f.mediaKind === 'video').length,
        [files],
    );
    const autoPlayVideo = videoCount <= AUTOPLAY_VIDEO_LIMIT;

    /* -------------------- Регистрация DOM-рефов -------------------- */

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

    /* -------------------- Контекстное меню -------------------- */

    const handleContextMenu = useCallback((e, file) => {
        e.preventDefault();
        e.stopPropagation();
        if (shiftHeld) return;
        if (file) {
            setSelectedIds((prev) => (prev.has(file.id) ? prev : new Set([file.id])));
        }
        onContextMenu?.(file, e, { reload, path: activePath });
    }, [shiftHeld, onContextMenu, reload, activePath]);

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
        const onKeyUp   = (e) => applyShift(e);
        const onBlur    = () => {
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
            try { localStorage.setItem(STORAGE_KEY, String(next)); } catch (_) {}
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
                const closestY = Math.max(rect.top,  Math.min(y, rect.bottom));
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

    /* -------------------- Стили контейнера -------------------- */

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
        pointerEvents: 'auto',
        cursor: shiftHeld ? 'none' : 'default',
    }), [layout, shiftHeld]);

    return (
        <Box
            ref={containerRef}
            onContextMenu={(e) => handleContextMenu(e, null)}
            sx={containerStyle}
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
                        onSelect={handleSelect} onOpen={handleOpen}
                        onContextMenu={handleContextMenu} registerRef={registerRef}
                    />
                ))
                : files.map((file) => (
                    <FileItem
                        key={file.id} file={file}
                        selected={selectedIds.has(file.id)}
                        onSelect={handleSelect} onOpen={handleOpen}
                        onContextMenu={handleContextMenu} registerRef={registerRef}
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

/* ------------------------------------------------------------------ */
/* Ряд для list-режима                                                  */
/* ------------------------------------------------------------------ */

function FileListRow({ file, selected, onSelect, onOpen, onContextMenu, registerRef }) {
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

    return (
        <Box
            ref={setRef}
            data-file-item=""
            onClick={handleClick}
            onDoubleClick={(e) => { e.stopPropagation(); if (!e.shiftKey) onOpen(file); }}
            onContextMenu={(e) => {
                e.preventDefault(); e.stopPropagation();
                if (e.shiftKey) return;
                onContextMenu(e, file);
            }}
            sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                px: 1, py: 0.5,
                cursor: 'pointer', userSelect: 'none', borderRadius: 0.5,
                bgcolor: selected ? 'rgba(168,85,247,0.25)' : 'transparent',
                '&:hover': {
                    bgcolor: selected ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.05)',
                },
            }}
        >
            <Box sx={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 0.5 }}>
                {hasMedia ? (
                    <img
                        src={file.fileUrl}
                        alt=""
                        draggable={false}
                        onError={() => setMediaFailed(true)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
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