// src/archivist/ArchivistRoom.jsx
import React, { useEffect, useRef, useState } from 'react';
import ArchivistFigure from './ArchivistFigure.jsx';

export default function ArchivistRoom({
  lines,
  variant = 'idle',
  onDone,
  bookOpen,
  onToggleBook,
}) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);
  const [sceneDone, setSceneDone] = useState(false);
  const timerRef = useRef(null);
  const text = lines[index] || '';

  // ── рамка сцены: соотношение сторон берём из натуральных
  //    размеров картинки стула. Если картинки ещё не загружены —
  //    работает дефолт 1, потом пересчитается.
  const frameRef = useRef(null);
  const chairRef = useRef(null);

  useEffect(() => {
    const img = chairRef.current;
    if (!img) return;
    const apply = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0 && frameRef.current) {
        frameRef.current.style.setProperty(
          '--workspace-aspect',
          String(img.naturalWidth / img.naturalHeight)
        );
      }
    };
    if (img.complete) apply();
    else img.addEventListener('load', apply, { once: true });
    return () => img.removeEventListener('load', apply);
  }, []);

  // Сброс при смене сцены.
  useEffect(() => {
    setIndex(0);
    setSceneDone(false);
  }, [lines]);

  // Печатающая машинка.
  useEffect(() => {
    setTyped('');
    setDone(false);
    clearTimeout(timerRef.current);
    let i = 0;
    const tick = () => {
      if (i >= text.length) { setDone(true); return; }
      setTyped(text.slice(0, i + 1));
      i++;
      timerRef.current = setTimeout(tick, 26 + Math.random() * 46);
    };
    timerRef.current = setTimeout(tick, 220);
    return () => clearTimeout(timerRef.current);
  }, [index, text]);

  const handleClick = () => {
    if (bookOpen) return;
    if (!done) {
      clearTimeout(timerRef.current);
      setTyped(text);
      setDone(true);
      return;
    }
    if (index + 1 >= lines.length) {
      if (!sceneDone) {
        setSceneDone(true);
        onDone?.();
      }
      return;
    }
    setIndex((i) => i + 1);
  };

  return (
    <div
      className={`archivist-room archivist-room--${variant}`}
      onClick={handleClick}
    >
      <div className="archivist-flicker" />

      {/* Сцена. Рамка держит пропорции стула/стола; фигура внутри
          позиционируется процентами от рамки, а не от окна. */}
      <div ref={frameRef} className="archivist-workspace-frame">
        <img
          ref={chairRef}
          className="archivist-layer"
          src={'../../../componentapps/CODERROR/archivist/archivist_chair.png'}
          alt=""
          draggable={false}
        />
        <ArchivistFigure className="archivist-figure" />
        <img
          className="archivist-layer"
          src={'../../../componentapps/CODERROR/archivist/archivist_table.png'}
          alt=""
          draggable={false}
        />
      </div>

      <div className="archivist-text">
        <span>{typed}</span>
        {!done && <span className="archivist-caret">▌</span>}
      </div>

      <div className="archivist-hint">
        {done && !bookOpen ? 'нажми, чтобы продолжить' : ''}
      </div>

      <button
        className={`archivist-book-toggle ${bookOpen ? 'is-open' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleBook?.();
        }}
      >
        {bookOpen ? 'закрыть книгу' : 'открыть книгу'}
      </button>
    </div>
  );
}