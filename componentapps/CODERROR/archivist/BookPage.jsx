// src/archivist/BookPage.jsx
//
// Одна страница Свода. Может быть обычной записью (с колонками
// и horizontal-scroll через columnIndex) или скрытой записью,
// которая раскрывается по клику.

import React, { useEffect, useMemo, useState } from 'react';
import { entryTextLength } from './links.js';
import EntryFlow from './EntryFlow.jsx';
import {
  SPOIL_TOTAL_MS,
  SPOIL_MIN_PER_CHAR_MS,
  SPOIL_NOTE,
} from './bookConstants.js';

// ─────────────────────────────────────────────────────────────
//  Скрытая запись. Один раз раскрылась — запомнили.
// ─────────────────────────────────────────────────────────────
function SpoilerEntry({ entry, alreadySpoiled, onSpoil, onNavigate }) {
  const [open, setOpen] = useState(!!alreadySpoiled);
  const [revealed, setRevealed] = useState(alreadySpoiled ? Infinity : 0);

  const totalChars = useMemo(() => entryTextLength(entry), [entry]);

  useEffect(() => {
    if (!open || alreadySpoiled) {
      setRevealed(Infinity);
      return;
    }
    const perChar = SPOIL_TOTAL_MS / Math.max(1, totalChars);
    if (perChar < SPOIL_MIN_PER_CHAR_MS) {
      setRevealed(totalChars);
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      i++;
      setRevealed(i);
      if (i >= totalChars) clearInterval(t);
    }, perChar);
    return () => clearInterval(t);
  }, [open, alreadySpoiled, totalChars]);

  if (!open) {
    return (
      <div
        className="book-page-content book-page-spoiler"
        role="button"
        tabIndex={0}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
          onSpoil?.(entry.id);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
            onSpoil?.(entry.id);
          }
        }}
      >
        <div className="book-spoiler-rect" aria-label="запись" />
      </div>
    );
  }

  const done = revealed >= totalChars;

  return (
    <div className="book-page-content book-page-spoiler-open">
      <EntryFlow entry={entry} revealed={revealed} onNavigate={onNavigate} />
      {done && <div className="book-spoiler-note">{SPOIL_NOTE}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Обычная страница.
// ─────────────────────────────────────────────────────────────
export default function BookPage({
  page,
  pageSize,
  spoiledAt,
  fullySpoiled,
  onSpoil,
  onNavigate,
}) {
  if (!page) {
    return <div className="book-page-content book-page-empty">·</div>;
  }
  const { entry, columnIndex } = page;

  if (entry.hidden === 'spoiler') {
    return (
      <SpoilerEntry
        entry={entry}
        alreadySpoiled={!!fullySpoiled || !!spoiledAt?.[entry.id]}
        onSpoil={onSpoil}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="book-page-content">
      <div className="book-page-columns-outer">
        <div
          className="book-page-columns-inner"
          style={{
            columnWidth: `${pageSize.width}px`,
            columnGap: 0,
            columnFill: 'auto',
            transform: `translateX(${-columnIndex * pageSize.width}px)`,
          }}
        >
          <EntryFlow entry={entry} onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
}