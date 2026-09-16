// src/archivist/entries.js
//
// Свод. Собирается из частей. Хелперы — здесь же.
//
// — Архивариус

import { front } from './entries/front.js';
import { prologue } from './entries/prologue.js';
import { part1 } from './entries/part1.js';
import { part2 } from './entries/part2.js';
import { part3 } from './entries/part3.js';
import { part4 } from './entries/part4.js';

export const entries = [
  ...front,
  ...prologue,
  ...part1,
  ...part2,
  ...part3,
  ...part4,
];

export const entriesById = Object.fromEntries(
  entries.map((e) => [e.id, e])
);

export function getEntry(id) {
  return entriesById[id] || null;
}

export function getChildren(id) {
  return entries
    .filter((e) => e.parent === id)
    .sort((a, b) => a.order - b.order);
}

export function getRoots() {
  return entries
    .filter((e) => e.parent === null)
    .sort((a, b) => a.order - b.order);
}

export function getSiblings(id) {
  const entry = getEntry(id);
  if (!entry) return [];
  return entries
    .filter((e) => e.parent === entry.parent && e.id !== id)
    .sort((a, b) => a.order - b.order);
}

export function resolveLinks(id) {
  const entry = getEntry(id);
  if (!entry) return [];
  return entry.links.map((lid) => entriesById[lid]).filter(Boolean);
}

export const parts = {
  front:    { title: 'Титул',              order: 0 },
  prologue: { title: 'Пролог. Мета-слой',  order: 10 },
  part1:    { title: 'Часть I. До начала', order: 20 },
  part2:    { title: 'Часть II. Акт 1',    order: 30 },
  part3:    { title: 'Часть III. Акт 2',   order: 40 },
  part4:    { title: 'Часть IV. Акт 3',    order: 50 },
};

export const allTags = Array.from(
  new Set(entries.flatMap((e) => e.tags || []))
).sort();

export const spoilerIds = entries
  .filter((e) => e.hidden === 'spoiler')
  .map((e) => e.id);