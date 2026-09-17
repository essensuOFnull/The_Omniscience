// src/archivist/useBookFlip.js
//
// Состояние перелистывания. Лист вращается через CSS-transform,
// drag — через pointer events. Когда лист долетает — вызываем
// onSettle, чтобы главный компонент мог ротировать текстуры.
//
// — Архивариус

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CLICK_THRESHOLD,
  COMPLETE_THRESHOLD,
  SETTLE_MS,
  clamp01,
} from './bookConstants.js';

export function useBookFlip(pages, ready, onSettle) {
  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(1);
  const [flip, setFlip] = useState(null);

  const dragRef = useRef(null);
  const settleTimerRef = useRef(null);
  const flipRef = useRef(null);
  const onSettleRef = useRef(onSettle);

  // Свежие ссылки — чтобы setTimeout и обработчики не читали
  // устаревшее состояние.
  flipRef.current = flip;
  onSettleRef.current = onSettle;

  useEffect(() => () => clearTimeout(settleTimerRef.current), []);

  // Сброс при пересчёте страниц (новый entries или сменился pageSize).
  useEffect(() => {
    setLeftIdx(0);
    setRightIdx(1);
    setFlip(null);
  }, [pages]);

  const totalSpreads = ready ? Math.ceil(pages.length / 2) : 0;
  const currentSpread = rightIdx >> 1;
  const canPrev = ready && leftIdx > 0;
  const canNext = ready && currentSpread + 1 < totalSpreads;

  const settleComplete = useCallback(() => {
    const f = flipRef.current;
    if (!f) return;
    if (f.direction === 'next') setLeftIdx(f.backIdx);
    else setRightIdx(f.backIdx);
    setFlip(null);
    onSettleRef.current?.(f.direction);
  }, []);

  const settleCancel = useCallback(() => {
    const f = flipRef.current;
    if (!f) return;
    if (f.direction === 'next') setRightIdx(f.frontIdx);
    else setLeftIdx(f.frontIdx);
    setFlip(null);
  }, []);

  const beginFlip = useCallback(
    (direction) => {
      if (direction === 'next') {
        if (!canNext) return;
        setRightIdx((r) => r + 2);
        setFlip({
          direction,
          frontIdx: rightIdx,
          backIdx: rightIdx + 1,
          angle: 0,
          dragging: false,
        });
      } else {
        if (!canPrev) return;
        setLeftIdx((l) => l - 2);
        setFlip({
          direction,
          frontIdx: leftIdx,
          backIdx: leftIdx - 1,
          angle: 0,
          dragging: false,
        });
      }
    },
    [canNext, canPrev, rightIdx, leftIdx]
  );

  const flyFlip = useCallback(
    (direction) => {
      const target = direction === 'next' ? -180 : 180;
      beginFlip(direction);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFlip((f) => (f ? { ...f, angle: target, dragging: false } : null));
          clearTimeout(settleTimerRef.current);
          settleTimerRef.current = setTimeout(settleComplete, SETTLE_MS);
        });
      });
    },
    [beginFlip, settleComplete]
  );

  const goNext = useCallback(() => {
    if (!canNext || flipRef.current) return;
    flyFlip('next');
  }, [canNext, flyFlip]);

  const goPrev = useCallback(() => {
    if (!canPrev || flipRef.current) return;
    flyFlip('prev');
  }, [canPrev, flyFlip]);

  // ── навигация по ссылкам ──────────────────────────────────
  const goToEntry = useCallback(
    (id) => {
      if (!ready) return;
      const idx = pages.findIndex(
        (p) => p.entry.id === id && p.columnIndex === 0
      );
      if (idx < 0) {
        console.warn('[archivist] ссылка ведёт в никуда:', id);
        return;
      }
      const spreadStart = idx % 2 === 0 ? idx : idx - 1;
      const right = Math.min(spreadStart + 1, pages.length - 1);
      setLeftIdx(spreadStart);
      setRightIdx(right);
      setFlip(null);
    },
    [pages, ready]
  );

  // ── указатель ─────────────────────────────────────────────
  const onPointerDown = useCallback(
    (e) => {
      if (flipRef.current || !ready) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const isRight = e.clientX - rect.left >= rect.width / 2;
      if (isRight && !canNext) return;
      if (!isRight && !canPrev) return;

      dragRef.current = {
        side: isRight ? 'next' : 'prev',
        startX: e.clientX,
        halfWidth: rect.width / 2,
        moved: false,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [ready, canNext, canPrev]
  );

  const onPointerMove = useCallback(
    (e) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;

      if (!d.moved) {
        if (Math.abs(dx) < CLICK_THRESHOLD) return;
        d.moved = true;
        beginFlip(d.side);
      }

      const progress =
        d.side === 'next'
          ? clamp01(-dx / d.halfWidth)
          : clamp01(dx / d.halfWidth);
      const angle = d.side === 'next' ? -180 * progress : 180 * progress;

      setFlip((f) => (f ? { ...f, angle, dragging: true } : f));
    },
    [beginFlip]
  );

  const onPointerUp = useCallback(
    (e) => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}

      if (!d.moved) {
        flyFlip(d.side);
        return;
      }

      const f = flipRef.current;
      if (!f) return;

      const progress = Math.abs(f.angle) / 180;
      const complete = progress > COMPLETE_THRESHOLD;
      const target = complete
        ? f.direction === 'next'
          ? -180
          : 180
        : 0;

      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(
        complete ? settleComplete : settleCancel,
        SETTLE_MS
      );

      setFlip({ ...f, angle: target, dragging: false });
    },
    [flyFlip, settleComplete, settleCancel]
  );

  return {
    leftIdx,
    rightIdx,
    flip,
    currentSpread,
    totalSpreads,
    canPrev,
    canNext,
    goPrev,
    goNext,
    goToEntry,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}