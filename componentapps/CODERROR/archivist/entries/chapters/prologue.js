// src/archivist/entries/chapters/prologue.js

import { seon } from '../supreme/seon.js';
import { firstVoice } from '../meta/first-voice.js';
import { archivist } from '../supreme/archivist.js';
import { arkhFile } from '../items/arkh-file.js';
import { acts } from '../meta/acts.js';
import { endings } from '../meta/endings.js';

export const prologue = [
  {
    id: 'prologue',
    title: 'Пролог. Мета-слой',
    part: 'prologue',
    act: 0,
    kind: 'chapter',
    parent: null,
    order: 10,
    tags: ['meta'],
    links: ['seon', 'first-voice', 'archivist', 'acts', 'endings'],
    hidden: false,
    blocks: [],
  },

  archivist,
  arkhFile,
  seon,
  firstVoice,
  acts,
  endings,
];