(function () {
  'use strict';

  if (window.__omniscienceFilterInjected) return;
  window.__omniscienceFilterInjected = true;

  /* ================================================================== */
  /*  НАСТРОЙКИ                                                          */
  /* ================================================================== */

  const DEFAULTS = {
    enabled: true,
    maxR: 128,
    maxG: 0,
    maxB: 128,
    targetAlpha: 0.25,
    textBrightness: 255,
  };

  let settings = { ...DEFAULTS };
  let started = false;
  let baseStyleEl = null;

  /* ================================================================== */
  /*  ВСТАВКА @property                                                  */
  /*  Регистрируем кастомные свойства, чтобы var(--...) работали         */
  /*  в цветовых функциях с calc().                                      */
  /* ================================================================== */

  function injectBaseStyles() {
    if (baseStyleEl) return;
    baseStyleEl = document.createElement('style');
    baseStyleEl.id = '__omni_theme_base__';
    baseStyleEl.textContent = `
      @property --TheOmniscience-max-r          { syntax: '<number>'; inherits: true; initial-value: 255; }
      @property --TheOmniscience-max-g          { syntax: '<number>'; inherits: true; initial-value: 255; }
      @property --TheOmniscience-max-b          { syntax: '<number>'; inherits: true; initial-value: 255; }
      @property --TheOmniscience-target-alpha   { syntax: '<number>'; inherits: true; initial-value: 1;   }
      @property --TheOmniscience-text-brightness{ syntax: '<number>'; inherits: true; initial-value: 255; }
    `;
    const parent = document.head || document.documentElement;
    if (parent) parent.appendChild(baseStyleEl);
  }

  /* ================================================================== */
  /*  УСТАНОВКА ЗНАЧЕНИЙ ПЕРЕМЕННЫХ НА :root                             */
  /* ================================================================== */

  function applyVariables() {
    const root = document.documentElement;
    if (!root) return;
    root.style.setProperty('--TheOmniscience-max-r', String(settings.maxR));
    root.style.setProperty('--TheOmniscience-max-g', String(settings.maxG));
    root.style.setProperty('--TheOmniscience-max-b', String(settings.maxB));
    root.style.setProperty('--TheOmniscience-target-alpha', String(settings.targetAlpha));
    root.style.setProperty('--TheOmniscience-text-brightness', String(settings.textBrightness));
  }

  /* ================================================================== */
  /*  ЯДРО ФИЛЬТРА                                                        */
  /*  (без изменений из css_filter_core.js)                              */
  /* ================================================================== */

  function parseColorToRGB(color) {
    const parent = document.documentElement || document.body;
    if (!parent) return null;
    const temp = document.createElement('div');
    temp.style.backgroundColor = color;
    temp.style.display = 'none';
    parent.appendChild(temp);
    const computed = getComputedStyle(temp).backgroundColor;
    temp.remove();
    const m = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 } : null;
  }

  function colorToString(rgb) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`;
  }

  function splitLayers(bgImage) {
    const layers = [];
    let depth = 0, start = 0;
    for (let i = 0; i < bgImage.length; i++) {
      if (bgImage[i] === '(') depth++;
      else if (bgImage[i] === ')') depth--;
      else if (bgImage[i] === ',' && depth === 0) {
        layers.push(bgImage.substring(start, i).trim());
        start = i + 1;
      }
    }
    layers.push(bgImage.substring(start).trim());
    return layers;
  }

  let gradIdCounter = 0;
  function getGradId(el) {
    if (!el._TheOmniscienceGradId) el._TheOmniscienceGradId = ++gradIdCounter;
    return el._TheOmniscienceGradId;
  }

  let textIdCounter = 0;
  function getTextId(el) {
    if (!el._TheOmniscienceTextId) el._TheOmniscienceTextId = ++textIdCounter;
    return el._TheOmniscienceTextId;
  }

  function isIgnored(el) {
    if (!el || el.nodeType !== 1) return true;
    if (el.classList && el.classList.contains('ignore_The_Omniscience_Theme')) return true;
    if (el.closest && el.closest('.ignore_The_Omniscience_Theme_recursive')) return true;
    return false;
  }

  function colorExpression(varName) {
    return `rgba(from var(${varName}) `
      + `calc(min(var(--TheOmniscience-max-r), `
      + `min(var(--TheOmniscience-max-r), r) `
      + `+ (g - min(var(--TheOmniscience-max-g), g)) / 2 `
      + `+ (b - min(var(--TheOmniscience-max-b), b)) / 2`
      + `)) `
      + `calc(min(var(--TheOmniscience-max-g), `
      + `min(var(--TheOmniscience-max-g), g) `
      + `+ (r - min(var(--TheOmniscience-max-r), r)) / 2 `
      + `+ (b - min(var(--TheOmniscience-max-b), b)) / 2`
      + `)) `
      + `calc(min(var(--TheOmniscience-max-b), `
      + `min(var(--TheOmniscience-max-b), b) `
      + `+ (r - min(var(--TheOmniscience-max-r), r)) / 2 `
      + `+ (g - min(var(--TheOmniscience-max-g), g)) / 2`
      + `)) `
      + `/ var(--TheOmniscience-target-alpha)`;
  }

  function textColorExpression(origVar, targetBrightnessVar) {
    const newCh = `calc(min(255, max(0, CH + (${targetBrightnessVar} - max(r, g, b)))))`;
    return `rgba(from var(${origVar}) `
      + newCh.replace(/CH/g, 'r') + ' '
      + newCh.replace(/CH/g, 'g') + ' '
      + newCh.replace(/CH/g, 'b')
      + ' / alpha)';
  }

  let processed = new WeakSet();
  let textProcessed = new WeakSet();

  function processElement(el) {
    if (!el || processed.has(el)) return;
    if (isIgnored(el)) return;
    processed.add(el);

    const computed = getComputedStyle(el);
    const bgImage = computed.backgroundImage;
    const bgColor = computed.backgroundColor;
    const hasGradient = bgImage && bgImage !== 'none' && bgImage.includes('-gradient(');

    if (hasGradient) {
      const layers = splitLayers(bgImage);
      const newLayers = [];
      const gradId = getGradId(el);
      let colorIdx = 0;
      const colorRegex = /(#[0-9a-fA-F]{3,8}\b|(rgb|hsl)a?\([^)]+\))/g;

      for (const layer of layers) {
        if (layer.includes('-gradient(')) {
          const newLayer = layer.replace(colorRegex, (match) => {
            const varName = `--TheOmniscience-fg-${gradId}-${colorIdx}`;
            const parsed = parseColorToRGB(match);
            if (parsed) {
              el.style.setProperty(varName, colorToString(parsed));
            } else {
              el.style.setProperty(varName, match);
            }
            colorIdx++;
            return colorExpression(varName);
          });
          newLayers.push(newLayer);
        } else {
          newLayers.push(layer);
        }
      }
      el.style.setProperty('background-image', newLayers.join(', '), 'important');
    } else if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
      const rgb = parseColorToRGB(bgColor);
      if (rgb && rgb.a > 0) {
        el.style.setProperty('--TheOmniscience-orig-bg', colorToString(rgb));
        el.style.setProperty('background-color', colorExpression('--TheOmniscience-orig-bg'), 'important');
      }
    }

    processTextColor(el);
  }

  function processTextColor(el) {
    if (!el || textProcessed.has(el)) return;
    if (isIgnored(el)) return;
    const parent = el.parentElement;
    const parentColor = parent ? getComputedStyle(parent).color : null;
    const myColor = getComputedStyle(el).color;

    if (myColor === 'rgba(0, 0, 0, 0)' || myColor === 'transparent') {
      textProcessed.add(el);
      return;
    }

    if (!parent || myColor !== parentColor) {
      const id = getTextId(el);
      const origVar = `--TheOmniscience-text-${id}`;
      el.style.setProperty(origVar, myColor);
      el.style.setProperty(
        'color',
        textColorExpression(origVar, 'var(--TheOmniscience-text-brightness)'),
        'important'
      );
      textProcessed.add(el);
    } else {
      textProcessed.add(el);
    }
  }

  function reprocessElement(el) {
    processed.delete(el);
    textProcessed.delete(el);
    if (isIgnored(el)) return;
    processElement(el);
  }

  /* ================================================================== */
  /*  СТАРТ ОБРАБОТКИ                                                    */
  /* ================================================================== */

  function startProcessing() {
    document.querySelectorAll('*').forEach(processElement);

    new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              processElement(node);
              node.querySelectorAll('*').forEach(processElement);
            }
          });
        } else if (m.type === 'attributes' && m.target.nodeType === 1) {
          reprocessElement(m.target);
        }
      }
    }).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
  }

  /* ================================================================== */
  /*  ГЛАВНЫЙ ЗАПУСК                                                     */
  /* ================================================================== */

  function start() {
    if (started) return;
    if (!document.documentElement) return;
    started = true;

    injectBaseStyles();
    applyVariables();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startProcessing, { once: true });
    } else {
      startProcessing();
    }
  }

  /* ================================================================== */
  /*  ЧТЕНИЕ НАСТРОЕК                                                    */
  /* ================================================================== */

  try {
    chrome.storage.local.get(DEFAULTS, (s) => {
      settings = { ...DEFAULTS, ...s };
      if (settings.enabled === false) return;
      start();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      chrome.storage.local.get(DEFAULTS, (s) => {
        settings = { ...DEFAULTS, ...s };
        if (settings.enabled === false) return;
        if (!started) start();
        else applyVariables();
        // Значения переменных на :root меняются → CSS сам пересчитает
        // все уже установленные inline-выражения.
      });
    });
  } catch (_) {
    start();
  }

  /* Если documentElement ещё нет — ждём его появления */
  if (!document.documentElement) {
    const obs = new MutationObserver(() => {
      if (document.documentElement) {
        obs.disconnect();
        start();
      }
    });
    obs.observe(document, { childList: true, subtree: true });
  }
})();