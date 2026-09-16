// src/archivist/entries/chapters/part1.js

import { worldFirst } from '../records/world-first.js';
import { voidEntry } from '../locations/void.js';
import { cleanup } from '../records/cleanup.js';
import { spaceEmpty } from '../locations/space-empty.js';
import { podmirye } from '../locations/underworld.js';
import { bogMachine } from '../gods/bog-machine.js';
import { gods } from '../records/gods.js';
import { planetCore } from '../records/planet-core.js';

export const part1 = [
  {
    id: 'part1',
    title: 'Часть I. До начала',
    part: 'part1',
    act: 0,
    kind: 'chapter',
    parent: null,
    order: 20,
    tags: ['world', 'before'],
    links: ['world-first', 'void', 'cleanup', 'space-empty', 'podmirye', 'bog-machine', 'gods', 'planet-core'],
    hidden: false,
    blocks: [],
  },

  worldFirst,
  voidEntry,
  cleanup,
  spaceEmpty,
  podmirye,
  bogMachine,
  gods,
  planetCore,
];