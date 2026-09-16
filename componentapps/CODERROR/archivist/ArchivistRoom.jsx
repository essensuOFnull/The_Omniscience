// src/archivist/ArchivistRoom.jsx
import React, { useEffect, useRef, useState } from 'react';

export default function ArchivistRoom({
  lines,
  variant = 'idle',     // 'greeting' | 'idle' | 'moment'
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

  // Сброс при смене сцены (родитель меняет `lines` только на новое открытие).
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
    if (bookOpen) return;                  // книга сверху — клики туда
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

      <img
        className="archivist-portrait"
        src={'../../../componentapps/CODERROR/archivist/archivist.png'}
        alt=""
        draggable={false}
      />

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