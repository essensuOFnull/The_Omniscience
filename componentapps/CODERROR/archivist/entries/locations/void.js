// src/archivist/entries/locations/void.js

export const voidEntry = {
  id: 'void',
  title: 'Пустота',
  part: 'part1',
  act: 0,
  kind: 'record',
  parent: 'part1',
  order: 20,
  tags: ['world', 'void', 'ssd'],
  links: ['space-empty'],
  hidden: false,
  blocks: [
    { t: 'p', text: 'Буквально пустое пространство. Когда данные удаляются с SSD — они не удаляются на самом деле: заголовок файла сносится, и всё. Пустота — это вся область, не размеченная заголовками файлов и папок. Всё, что лишено имён, но существует. Там могут быть любые последовательности бит.' },
  ],
};