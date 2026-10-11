(function () {
  'use strict';

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

  const KEY = '__omni_settings__';

  function publish(s) {
    const merged = Object.assign({}, DEFAULTS, s || {});
    try {
      localStorage.setItem(KEY, JSON.stringify(merged));
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('__omni_settings_updated__', { detail: merged }));
  }

  try {
    chrome.storage.local.get(DEFAULTS, publish);
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      chrome.storage.local.get(DEFAULTS, publish);
    });
  } catch (_) {}
})();