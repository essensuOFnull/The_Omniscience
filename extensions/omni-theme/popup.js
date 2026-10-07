/* ------------------------------------------------------------------ */
/* Дефолты и поля                                                      */
/* ------------------------------------------------------------------ */

const DEFAULTS = {
  enabled: true,
  maxR: 128,
  maxG: 0,
  maxB: 128,
  targetAlpha: 0.25,
  textBrightness: 255,
};

const FIELDS = ['maxR', 'maxG', 'maxB', 'targetAlpha', 'textBrightness'];

// Соответствие наших полей и путей в state Omniscience
const FIELD_TO_OMNI_PATH = {
  enabled: 'themeEnabled',
  maxR: 'themeColors.maxR',
  maxG: 'themeColors.maxG',
  maxB: 'themeColors.maxB',
  targetAlpha: 'themeColors.targetAlpha',
  textBrightness: 'themeColors.textBrightness',
};

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */

function applySettings(s) {
  const enabledEl = document.getElementById('enabled');
  if (enabledEl) enabledEl.checked = s.enabled !== false;

  for (const f of FIELDS) {
    const slider = document.getElementById(f);
    const num = document.getElementById(`${f}-num`);
    if (slider) slider.value = s[f];
    if (num) num.value = s[f];
  }
}

/* ------------------------------------------------------------------ */
/* Chrome storage                                                      */
/* ------------------------------------------------------------------ */

function readFromChromeStorage() {
  return new Promise((resolve) => {
    try {
      if (!chrome?.storage?.local?.get) return resolve(null);
      const timer = setTimeout(() => resolve(null), 300);
      chrome.storage.local.get(DEFAULTS, (s) => {
        clearTimeout(timer);
        // В настоящем Chrome s — всегда объект. В нашем Electron — undefined.
        if (s && typeof s === 'object') {
          resolve(s);
        } else {
          resolve(null);
        }
      });
    } catch (_) {
      resolve(null);
    }
  });
}

function writeToChromeStorage(patch) {
  try {
    if (chrome?.storage?.local?.set) {
      chrome.storage.local.set(patch);
    }
  } catch (_) {}
}

/* ------------------------------------------------------------------ */
/* Omniscience bridge                                                  */
/* ------------------------------------------------------------------ */

function hasOmniBridge() {
  return typeof window !== 'undefined'
    && window.electron_view_API
    && typeof window.electron_view_API.dispatch === 'function';
}

function readFromOmni() {
  return new Promise((resolve) => {
    const viewApi = window.electron_view_API;
    if (!viewApi?.subscribe || !viewApi?.onStateUpdate) return resolve(null);

    // Обратное сопоставление path → field
    const pathToField = {};
    for (const [field, path] of Object.entries(FIELD_TO_OMNI_PATH)) {
      pathToField['settings.' + path] = field;
    }
    const paths = Object.keys(pathToField);

    const result = {};
    let timeoutId = null;

    const off = viewApi.onStateUpdate((data) => {
      if (!data?.path) return;
      const field = pathToField[data.path];
      if (!field) return;
      result[field] = data.value;
      if (Object.keys(result).length === paths.length) {
        if (timeoutId) clearTimeout(timeoutId);
        off?.();
        resolve(result);
      }
    });

    timeoutId = setTimeout(() => {
      off?.();
      resolve(Object.keys(result).length > 0 ? result : null);
    }, 400);

    viewApi.subscribe(paths);
  });
}

function writeToOmni(field, value) {
  const viewApi = window.electron_view_API;
  if (!viewApi?.dispatch) return;
  const path = FIELD_TO_OMNI_PATH[field];
  if (!path) return;
  viewApi.dispatch('updateSetting', { path, value });
}

/* ------------------------------------------------------------------ */
/* Универсальные load/save                                             */
/* ------------------------------------------------------------------ */

async function load() {
  // 1. Chrome storage — primary (реальный Chrome)
  const fromChrome = await readFromChromeStorage();
  if (fromChrome) {
    applySettings({ ...DEFAULTS, ...fromChrome });
    return;
  }

  // 2. Omni bridge — fallback (наш Electron)
  if (hasOmniBridge()) {
    const fromOmni = await readFromOmni();
    if (fromOmni) {
      applySettings({ ...DEFAULTS, ...fromOmni });
      return;
    }
  }

  // 3. Совсем ничего — дефолты
  applySettings(DEFAULTS);
}

function save(field, value) {
  // Пишем в оба места сразу — какое сработает, то и сработает.
  writeToChromeStorage({ [field]: value });
  writeToOmni(field, value);
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

document.getElementById('enabled').addEventListener('change', (e) => {
  save('enabled', e.target.checked);
});

for (const f of FIELDS) {
  const slider = document.getElementById(f);
  const num = document.getElementById(`${f}-num`);

  slider?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    if (num) num.value = v;
    save(f, v);
  });

  num?.addEventListener('input', (e) => {
    let v = parseFloat(e.target.value);
    if (isNaN(v)) return;
    v = Math.max(parseFloat(num.min), Math.min(parseFloat(num.max), v));
    if (slider) slider.value = v;
    save(f, v);
  });
}

load();