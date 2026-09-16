// src/archivist/entries/chapters/part4.js

import { lairSeon } from '../records/lair-seon.js';
import { moralPrinciples } from '../items/moral-principles.js';
import { scenes } from '../sections/scenes.js';
import { scenePulseUp } from '../scenes/pulse-up.js';
import { sceneQuetiapine } from '../scenes/quetiapine.js';
import { battleSeon } from '../bosses/battle-seon.js';
import { core } from '../bosses/core.js';
import { coreItem } from '../items/core-item.js';
import { whatNext } from '../records/what-next.js';
import { supremeRoll } from '../records/supreme-roll.js';

export const part4 = [
  {
    id: 'part4',
    title: 'Часть IV. АКТ 3: БОЖЕСТВЕННОСТЬ',
    part: 'part4',
    act: 3,
    kind: 'chapter',
    parent: null,
    order: 50,
    tags: ['act3'],
    links: ['lair-seon', 'moral-principles', 'scenes', 'battle-seon',
            'core', 'core-item', 'what-next', 'supreme-roll'],
    hidden: false,
    blocks: [
      { t: 'em', text: 'Ты прошёл путь. От выброшенного файла — до того, кто стоит перед лицом собственного создателя. Осталось последнее. Самое честное. Самое болезненное.' },
    ],
  },

  lairSeon,
  moralPrinciples,
  scenes,
  scenePulseUp,
  sceneQuetiapine,
  battleSeon,
  core,
  coreItem,
  whatNext,
  supremeRoll,
];