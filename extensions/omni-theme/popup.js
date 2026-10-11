const DEFAULTS = {
  enabled: true,
  maxR: 128,
  maxG: 0,
  maxB: 128,
  targetAlpha: 0.25,
  textBrightness: 255,
  blurShadow: 8,
  shadowColor: '#ff00ff',
};

const FIELDS = ['maxR', 'maxG', 'maxB', 'targetAlpha', 'textBrightness', 'blurShadow'];

const FIELD_TO_OMNI_PATH = {
  enabled: 'themeEnabled',
  maxR: 'themeColors.maxR',
  maxG: 'themeColors.maxG',
  maxB: 'themeColors.maxB',
  targetAlpha: 'themeColors.targetAlpha',
  textBrightness: 'themeColors.textBrightness',
  blurShadow: 'themeColors.blurShadow',
  shadowColor: 'themeColors.shadowColor',
};

function normalizeHex(v) {
  if (typeof v !== 'string') return null;
  let s = v.trim().toLowerCase();
  if (s && s[0] !== '#') s = '#' + s;
  return /^#[a-f0-9]{6}$/.test(s) ? s : null;
}

function applySettings(s) {
  const enabledEl = document.getElementById('enabled');
  if (enabledEl) enabledEl.checked = s.enabled !== false;

  for (const f of FIELDS) {
    const slider = document.getElementById(f);
    const num = document.getElementById(`${f}-num`);
    if (slider) slider.value = s[f];
    if (num) num.value = s[f];
  }

  const color = normalizeHex(s.shadowColor) || DEFAULTS.shadowColor;
  const colorPicker = document.getElementById('shadowColor');
  const colorHex = document.getElementById('shadowColor-hex');
  if (colorPicker) colorPicker.value = color;
  if (colorHex) colorHex.value = color;
}

function readFromChromeStorage() {
  return new Promise((resolve) => {
    try {
      if (!chrome?.storage?.local?.get) return resolve(null);
      const timer = setTimeout(() => resolve(null), 300);
      chrome.storage.local.get(DEFAULTS, (s) => {
        clearTimeout(timer);
        if (s && typeof s === 'object') resolve(s);
        else resolve(null);
      });
    } catch (_) {
      resolve(null);
    }
  });
}

function writeToChromeStorage(patch) {
  try {
    if (chrome?.storage?.local?.set) chrome.storage.local.set(patch);
  } catch (_) {}
}

function hasOmniBridge() {
  return typeof window !== 'undefined'
    && window.electron_view_API
    && typeof window.electron_view_API.dispatch === 'function';
}

function readFromOmni() {
  return new Promise((resolve) => {
    const viewApi = window.electron_view_API;
    if (!viewApi?.subscribe || !viewApi?.onStateUpdate) return resolve(null);

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

async function load() {
  const fromChrome = await readFromChromeStorage();
  if (fromChrome) {
    applySettings({ ...DEFAULTS, ...fromChrome });
    return;
  }

  if (hasOmniBridge()) {
    const fromOmni = await readFromOmni();
    if (fromOmni) {
      applySettings({ ...DEFAULTS, ...fromOmni });
      return;
    }
  }

  applySettings(DEFAULTS);
}

function save(field, value) {
  writeToChromeStorage({ [field]: value });
  writeToOmni(field, value);
}

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

/* ---- Shadow Color ---- */

const colorPicker = document.getElementById('shadowColor');
const colorHex = document.getElementById('shadowColor-hex');

colorPicker?.addEventListener('input', (e) => {
  const v = normalizeHex(e.target.value);
  if (!v) return;
  if (colorHex) colorHex.value = v;
  save('shadowColor', v);
});

colorHex?.addEventListener('input', (e) => {
  const v = normalizeHex(e.target.value);
  if (!v) return;
  if (colorPicker) colorPicker.value = v;
  save('shadowColor', v);
});

// Если юзер ввёл что-то кривое в hex и ушёл с поля — сбросим к последнему валидному.
colorHex?.addEventListener('blur', (e) => {
  const v = normalizeHex(e.target.value);
  if (!v) {
    e.target.value = colorPicker?.value || DEFAULTS.shadowColor;
  } else {
    e.target.value = v;
  }
});

load();