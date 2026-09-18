// src/archivist/entries/items/arkh-file.js

export const arkhFile = {
  id: 'arkh-file',
  title: '.arkh',
  part: 'prologue',
  act: 0,
  kind: 'item',
  parent: 'prologue',
  tags: ['meta', 'save', 'archivist'],
  links: ['archivist'],
  hidden: 'spoiler',
  blocks: [
    { t: 'p', text: 'Файл в папке сохранений. Внутри — все черновики, все версии, все «а что если». Это [[archivist|Архивариус]]. Он не часть билда и не часть канона. Он — то, что помнят.' },
  ],
};