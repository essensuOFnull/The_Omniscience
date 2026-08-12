const adjectives = [
  'Frozen', 'Crimson', 'Dark', 'Enchanted', 'Corrupted', 'Ancient',
  'Shimmering', 'Sunken', 'Obsidian', 'Living', 'Crystal', 'Hallowed',
  'Blighted', 'Astral', 'Desolate', 'Verdant', 'Molten', 'Spectral',
  'Sacred', 'Warped', 'Fungal', 'Mythril', 'Cursed', 'Iridescent'
];

const nouns = [
  'Forest', 'Cave', 'Desert', 'Temple', 'Meadow', 'Tundra',
  'Ocean', 'Jungle', 'Dungeon', 'Sanctuary', 'Labyrinth', 'Summit',
  'Abyss', 'Grotto', 'Ruins', 'Grove', 'Citadel', 'Hollow',
  'Ridge', 'Wastes', 'Expanse', 'Chasm', 'Marsh', 'Stronghold'
];

const connectors = ['', ' of ', '-', ' '];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const generateTerrariaName = () => {
  const adj = pick(adjectives);
  const noun = pick(nouns);
  const connector = pick(connectors);
  if (connector === ' of ') {
    return `${adj}${connector}${noun}`;
  } else if (connector === '-') {
    return `${adj}-${noun}`;
  }
  return `${adj} ${noun}`;
};