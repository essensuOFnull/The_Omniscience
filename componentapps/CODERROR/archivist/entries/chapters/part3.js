// src/archivist/entries/chapters/part3.js

import { classes } from '../sections/classes.js';
import { mage } from '../classes/mage.js';
import { engineer } from '../classes/engineer.js';
import { looter } from '../classes/looter.js';
import { warrior } from '../classes/warrior.js';

import { synergies } from '../sections/synergies.js';
import { mageEngineer } from '../synergies/mage-engineer.js';
import { mageLooter } from '../synergies/mage-looter.js';
import { mageWarrior } from '../synergies/mage-warrior.js';
import { engineerWarrior } from '../synergies/engineer-warrior.js';
import { engineerLooter } from '../synergies/engineer-looter.js';
import { looterWarrior } from '../synergies/looter-warrior.js';

import { souls } from '../sections/souls.js';
import { soulKeeper } from '../supreme/soul-keeper.js';
import { dive } from '../records/dive.js';
import { shinjo } from '../items/shinjo.js';
import { essence } from '../supreme/essence.js';
import { sunGod } from '../supreme/sun-god.js';
import { kormilitsa } from '../gods/kormilitsa.js';
import { artifact } from '../gods/artifact.js';

export const part3 = [
  {
    id: 'part3',
    title: 'Часть III. АКТ 2: РАЗВИТИЕ',
    part: 'part3',
    act: 2,
    kind: 'chapter',
    parent: null,
    order: 40,
    tags: ['act2'],
    links: ['mage', 'engineer', 'looter', 'warrior', 'synergies',
            'souls', 'dive', 'shinjo', 'essence', 'kormilitsa', 'artifact'],
    hidden: false,
    blocks: [
      { t: 'em', text: 'Ты больше не безымянный файл. У тебя есть имя. У тебя есть тело. У тебя есть целый мир — и этот мир гораздо больше, чем корзина, из которой ты выбрался. Теперь начинается настоящее.' },
    ],
  },

  classes,
  mage,
  engineer,
  looter,
  warrior,

  synergies,
  mageEngineer,
  mageLooter,
  mageWarrior,
  engineerWarrior,
  engineerLooter,
  looterWarrior,

  souls,
  soulKeeper,
  dive,
  shinjo,
  essence,
  sunGod,
  kormilitsa,
  artifact,
];