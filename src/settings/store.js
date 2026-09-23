const STORAGE_KEY = 'theOmniscienceSettings';

const defaultSettings = {
  themeEnabled: true,
  themeColors: {
    maxR: 128,
    maxG: 0,
    maxB: 128,
    targetAlpha: 0.25,
    textBrightness: 255,
  },
  background: {
    type: 'image',
    source: '../images/background.jpg',
    color: '#000000',
    opacity: 1,
    componentName: 'Background',
  },
  animationsEnabled: true,
  customAnimations: null,
};

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
  } catch (e) {
    console.error('[settings] load failed', e);
  }
  return defaultSettings;
}

let currentSettings = loadSettings();
const listeners = new Set();

function emit() {
  for (const fn of listeners) fn();
}

export const settingsStore = {
  getState: () => currentSettings,

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  update(path, value) {
    const keys = path.split('.');
    const next = { ...currentSettings };
    let cur = next;
    for (let i = 0; i < keys.length - 1; i++) {
      cur[keys[i]] = { ...cur[keys[i]] };
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
    currentSettings = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
    } catch (e) {
      console.error('[settings] save failed', e);
    }
    emit();
  },

  reset() {
    currentSettings = defaultSettings;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    emit();
  },
};