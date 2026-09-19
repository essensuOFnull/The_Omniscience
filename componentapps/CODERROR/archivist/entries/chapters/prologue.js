// src/archivist/entries/chapters/prologue.js

import { seon } from '../supreme/seon.js';
import { firstVoice } from '../meta/first-voice.js';
import { archivist } from '../supreme/archivist.js';
import { arkhFile } from '../items/arkh-file.js';
import { acts } from '../meta/acts.js';
import { endings } from '../meta/endings.js';
import { goal } from '../meta/goal.js';
import { gods } from '../records/gods.js';
import { planetCore } from '../records/planet-core.js';
import { vesselSemiotics } from '../meta/vessel_semiotics.js';

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
    links: ['seon', 'first-voice', 'archivist', 'acts', 'endings', 'goal'],
    hidden: false,
    blocks: [],
  },

  archivist,
  arkhFile,
  gods,
  seon,
  firstVoice,
  acts,
  endings,
  goal,
  planetCore,
  vesselSemiotics,
];