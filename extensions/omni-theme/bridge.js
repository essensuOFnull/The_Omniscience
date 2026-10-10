(function () {
  'use strict';

  const DEFAULTS = {
    enabled: true,
    maxR: 128,
    maxG: 0,
    maxB: 128,
    targetAlpha: 0.25,
    textBrightness: 255,
  };

  const KEY = '__omni_settings__';

  function publish(s) {
    const merged = Object.assign({}, DEFAULTS, s || {});
    try {
      localStorage.setItem(KEY, JSON.stringify(merged));
    } catch (_) {}
    // DOM-событие долетает и в MAIN-мир.
    window.dispatchEvent(new CustomEvent('__omni_settings_updated__', { detail: merged }));
  }

  try {
    chrome.storage.local.get(DEFAULTS, publish);
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      chrome.storage.local.get(DEFAULTS, publish);
    });
  } catch (_) {
    // Реального chrome.storage нет (наш Electron) — молча выходим,
    // popup.js сам разберётся через electron_view_API.
  }
})();