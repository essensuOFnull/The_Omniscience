// src/archivist/BookNav.jsx
import React from 'react';

export default function BookNav({
  currentSpread,
  totalSpreads,
  canPrev,
  canNext,
  onPrev,
  onNext,
  disabled,
  ready,
}) {
  return (
    <div className="book-nav">
      <button
        onClick={onPrev}
        disabled={!canPrev || disabled}
        aria-label="назад"
      >
        ←
      </button>
      <span className="book-nav-pager">
        {ready ? `${currentSpread + 1} / ${totalSpreads}` : '…'}
      </span>
      <button
        onClick={onNext}
        disabled={!canNext || disabled}
        aria-label="вперёд"
      >
        →
      </button>
    </div>
  );
}