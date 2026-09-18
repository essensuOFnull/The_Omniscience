// src/archivist/entries/chapters/part4.js

import { whatNext } from '../records/what-next.js';

import { sunGod } from '../supreme/sun-god.js';

export const part4 = [
  {
    id: 'part4',
    title: 'АКТ 3: БОЖЕСТВЕННОСТЬ',
    part: 'part4',
    act: 3,
    kind: 'chapter',
    parent: null,
    tags: ['act3'],
    links: ['lair-seon', 'moral-principles', 'scenes', 'battle-seon',
            'core', 'core-item', 'what-next', 'supreme-roll'],
    hidden: false,
    blocks: [
      { t: 'em', text: 'Ты прошёл путь. От выброшенного файла — до того, кто стоит перед лицом собственного создателя. Осталось последнее. Самое честное. Самое болезненное.' },
    ],
  },

  whatNext,

  sunGod,
];