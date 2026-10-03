const DEFAULTS = {
  enabled: true,
  maxR: 128,
  maxG: 0,
  maxB: 128,
  targetAlpha: 0.25,
  textBrightness: 255,
};

const FIELDS = ['maxR', 'maxG', 'maxB', 'targetAlpha', 'textBrightness'];

function load() {
  chrome.storage.local.get(DEFAULTS, (s) => {
    document.getElementById('enabled').checked = s.enabled !== false;
    for (const f of FIELDS) {
      document.getElementById(f).value = s[f];
      document.getElementById(`${f}-num`).value = s[f];
    }
  });
}

function save(field, value) {
  chrome.storage.local.set({ [field]: value });
}

document.getElementById('enabled').addEventListener('change', (e) => {
  save('enabled', e.target.checked);
});

for (const f of FIELDS) {
  const slider = document.getElementById(f);
  const num = document.getElementById(`${f}-num`);

  slider.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    num.value = v;
    save(f, v);
  });

  num.addEventListener('input', (e) => {
    let v = parseFloat(e.target.value);
    if (isNaN(v)) return;
    v = Math.max(parseFloat(num.min), Math.min(parseFloat(num.max), v));
    slider.value = v;
    save(f, v);
  });
}

load();