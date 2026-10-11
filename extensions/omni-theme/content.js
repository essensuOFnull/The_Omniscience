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
    blurShadow: 8,
    shadowColor: '#ff00ff',
  };

  const SETTINGS_KEY = '__omni_settings__';

  let settings = { ...DEFAULTS };
  let started = false;
  let mutationObserver = null;

  function readSettingsSync() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  /* ================================================================== */
  /*  HEX → RGB                                                          */
  /* ================================================================== */

  function hexToRgb(hex) {
    const m = /^#?([a-fA-F0-9]{6})$/.exec(hex || '');
    if (!m) return { r: 0, g: 229, b: 255 }; // fallback cyan
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  /* ================================================================== */
  /*  ПЕРЕМЕННЫЕ НА :root                                                */
  /*                                                                     */
  /*  --TheOmniscience-blur-shadow собирается из ДВУХ настроек:           */
  /*  blurShadow (радиус) и shadowColor (цвет). Меняешь любой слайдер    */
  /*  в попапе — applyVariables пересобирает строку, все элементы         */
  /*  мгновенно подхватывают новую через var(...).                        */
  /* ================================================================== */

  function applyVariables() {
    const root = document.documentElement;
    if (!root) return;

    root.style.setProperty('--TheOmniscience-max-r', String(settings.maxR));
    root.style.setProperty('--TheOmniscience-max-g', String(settings.maxG));
    root.style.setProperty('--TheOmniscience-max-b', String(settings.maxB));
    root.style.setProperty('--TheOmniscience-target-alpha', String(settings.targetAlpha));
    root.style.setProperty('--TheOmniscience-text-brightness', String(settings.textBrightness));

    const b = settings.blurShadow;
    const { r, g, b: bb } = hexToRgb(settings.shadowColor);

    root.style.setProperty(
      '--TheOmniscience-blur-shadow',
      b > 0
        ? `inset 0 0 ${(b * 2).toFixed(2)}px 0 rgba(${r}, ${g}, ${bb}, 0.35), `
          + `inset 0 0 ${(b * 4).toFixed(2)}px 0 rgba(${r}, ${g}, ${bb}, 0.15)`
        : 'none'
    );
  }

  /* ================================================================== */
  /*  ЯДРО ФИЛЬТРА                                                        */
  /* ================================================================== */

  const colorCache = new Map();

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

  function parseColorToRGBCached(color) {
    if (colorCache.has(color)) return colorCache.get(color);
    const result = parseColorToRGB(color);
    colorCache.set(color, result);
    return result;
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

  function isFragileElement(el, cs) {
    if (el.namespaceURI && el.namespaceURI !== 'http://www.w3.org/1999/xhtml') return true;
    const bgClip = cs.webkitBackgroundClip || cs.backgroundClip;
    if (bgClip === 'text') return true;
    const mbm = cs.mixBlendMode;
    if (mbm && mbm !== 'normal') return true;
    return false;
  }

  /* ================================================================== */
  /*  ИЗМЕНИТ ЛИ ЧТО-ТО ФИЛЬТР?                                          */
  /* ================================================================== */

  function wouldFilterChange(rgba) {
    if (!rgba || rgba.a === 0) return false;
    const maxR = settings.maxR, maxG = settings.maxG, maxB = settings.maxB;
    const r = rgba.r, g = rgba.g, b = rgba.b, a = rgba.a;

    const minRr = Math.min(maxR, r);
    const minGg = Math.min(maxG, g);
    const minBb = Math.min(maxB, b);

    const newR = Math.min(maxR, minRr + (g - minGg) / 2 + (b - minBb) / 2);
    const newG = Math.min(maxG, minGg + (r - minRr) / 2 + (b - minBb) / 2);
    const newB = Math.min(maxB, minBb + (r - minRr) / 2 + (g - minGg) / 2);
    const newA = settings.targetAlpha;

    return Math.abs(newR - r) > 0.5
        || Math.abs(newG - g) > 0.5
        || Math.abs(newB - b) > 0.5
        || Math.abs(newA - a) > 0.01;
  }

  function gradientWouldChange(bgImage) {
    const layers = splitLayers(bgImage);
    const colorRegex = /(#[0-9a-fA-F]{3,8}\b|(rgb|hsl)a?\([^)]+\))/g;
    for (const layer of layers) {
      if (!layer.includes('-gradient(')) continue;
      const matches = layer.match(colorRegex);
      if (!matches) continue;
      for (const m of matches) {
        const rgb = parseColorToRGBCached(m);
        if (rgb && wouldFilterChange(rgb)) return true;
      }
    }
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

  /* ================================================================== */
  /*  BLUR-SHADOW (теперь в цвете темы)                                  */
  /* ================================================================== */

  function applyBlurShadow(el, cs) {
    if (el._TheOmniscienceBlurShadow) return;
    if (cs.boxShadow && cs.boxShadow !== 'none') return;
    el.style.setProperty('box-shadow', 'var(--TheOmniscience-blur-shadow)', 'important');
    el._TheOmniscienceBlurShadow = true;
  }

  function removeBlurShadow(el) {
    if (el._TheOmniscienceBlurShadow) {
      el.style.removeProperty('box-shadow');
      el._TheOmniscienceBlurShadow = false;
    }
  }

  /* ================================================================== */
  /*  СОСТОЯНИЕ                                                          */
  /* ================================================================== */

  const processed = new WeakSet();
  const textProcessed = new WeakSet();
  const lastWritten = new WeakMap();
  const pendingReprocess = new WeakMap();

  /* ================================================================== */
  /*  ЧТЕНИЕ "СЫРЫХ" ЦВЕТОВ                                              */
  /* ================================================================== */

  function removeOurInlineOverrides(el) {
    const bg = el.style.getPropertyValue('background-color');
    if (bg && bg.indexOf('--TheOmniscience') !== -1) el.style.removeProperty('background-color');
    const bi = el.style.getPropertyValue('background-image');
    if (bi && bi.indexOf('--TheOmniscience') !== -1) el.style.removeProperty('background-image');
    const c = el.style.getPropertyValue('color');
    if (c && c.indexOf('--TheOmniscience') !== -1) el.style.removeProperty('color');
    removeBlurShadow(el);
  }

  function readComputedColors(el) {
    void el.offsetWidth;
    const cs = getComputedStyle(el);
    return {
      bgColor:   cs.backgroundColor,
      bgImage:   cs.backgroundImage,
      color:     cs.color,
      boxShadow: cs.boxShadow,
    };
  }

  function recordWrite(el) {
    lastWritten.set(el, {
      bg: el.style.getPropertyValue('background-color'),
      bi: el.style.getPropertyValue('background-image'),
      c:  el.style.getPropertyValue('color'),
      bs: el.style.getPropertyValue('box-shadow'),
    });
  }

  function isOurOwnStyleMutation(el) {
    const last = lastWritten.get(el);
    if (!last) return false;
    return last.bg === el.style.getPropertyValue('background-color')
        && last.bi === el.style.getPropertyValue('background-image')
        && last.c  === el.style.getPropertyValue('color')
        && last.bs === el.style.getPropertyValue('box-shadow');
  }

  /* ================================================================== */
  /*  ОБРАБОТКА                                                          */
  /* ================================================================== */

  function processElement(el) {
    if (!el || processed.has(el)) return;
    if (isIgnored(el)) return;
    processed.add(el);

    const cs = readComputedColors(el);

    if (isFragileElement(el, cs)) {
      recordWrite(el);
      return;
    }

    const bgImage = cs.bgImage;
    const bgColor = cs.bgColor;
    const hasGradient = bgImage && bgImage !== 'none' && bgImage.includes('-gradient(');

    let bgModified = false;
    let modifiedWasGradient = false;

    if (hasGradient) {
      if (gradientWouldChange(bgImage)) {
        const layers = splitLayers(bgImage);
        const newLayers = [];
        const gradId = getGradId(el);
        let colorIdx = 0;
        const colorRegex = /(#[0-9a-fA-F]{3,8}\b|(rgb|hsl)a?\([^)]+\))/g;

        for (const layer of layers) {
          if (layer.includes('-gradient(')) {
            const newLayer = layer.replace(colorRegex, (match) => {
              const varName = `--TheOmniscience-fg-${gradId}-${colorIdx}`;
              const parsed = parseColorToRGBCached(match);
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
        bgModified = true;
        modifiedWasGradient = true;
      }
    } else if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
      const rgb = parseColorToRGBCached(bgColor);
      if (rgb && rgb.a > 0 && wouldFilterChange(rgb)) {
        el.style.setProperty('--TheOmniscience-orig-bg', colorToString(rgb));
        el.style.setProperty('background-color', colorExpression('--TheOmniscience-orig-bg'), 'important');
        bgModified = true;
      }
    }

    if (bgModified && !modifiedWasGradient) {
      applyBlurShadow(el, cs);
    } else {
      removeBlurShadow(el);
    }

    processTextColor(el, cs.color);
    recordWrite(el);
  }

  function processTextColor(el, myColorHint) {
    if (!el || textProcessed.has(el)) return;
    if (isIgnored(el)) return;

    const parent = el.parentElement;
    const parentColor = parent ? getComputedStyle(parent).color : null;
    const myColor = myColorHint || getComputedStyle(el).color;

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

  /* ================================================================== */
  /*  ПЕРЕОБРАБОТКА                                                      */
  /* ================================================================== */

  function scheduleReprocess(el) {
    if (isIgnored(el)) return;

    let state = pendingReprocess.get(el);

    if (state && state.running) {
      state.dirty = true;
      return;
    }

    if (!state) {
      state = { running: false, dirty: false, trans: null };
      pendingReprocess.set(el, state);
    } else {
      state.dirty = false;
    }

    if (state.trans === null) {
      state.trans = {
        v: el.style.getPropertyValue('transition'),
        p: el.style.getPropertyPriority('transition'),
      };
    }

    state.running = true;
    runPass(el, state);
  }

  function runPass(el, state) {
    requestAnimationFrame(() => {
      if (!el.isConnected) {
        pendingReprocess.delete(el);
        return;
      }

      el.style.setProperty('transition', 'none', 'important');
      removeOurInlineOverrides(el);
      processed.delete(el);
      textProcessed.delete(el);
      processElement(el);

      requestAnimationFrame(() => {
        if (!el.isConnected) {
          pendingReprocess.delete(el);
          return;
        }

        if (state.dirty) {
          state.dirty = false;
          runPass(el, state);
          return;
        }

        if (state.trans.v) el.style.setProperty('transition', state.trans.v, state.trans.p);
        else el.style.removeProperty('transition');

        state.running = false;
        state.trans = null;
        pendingReprocess.delete(el);
      });
    });
  }

  /* ================================================================== */
  /*  СТАРТ                                                              */
  /* ================================================================== */

  function startProcessing() {
    document.querySelectorAll('*').forEach(processElement);

    mutationObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              processElement(node);
              node.querySelectorAll('*').forEach(processElement);
            }
          });
        } else if (m.type === 'attributes' && m.target.nodeType === 1) {
          if (m.attributeName === 'style' && isOurOwnStyleMutation(m.target)) continue;
          scheduleReprocess(m.target);
        }
      }
    });

    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    const onStateChange = (e) => {
      const t = e.target;
      if (!t || t.nodeType !== 1) return;
      scheduleReprocess(t);
      let p = t.parentElement, i = 0;
      while (p && i < 3) { scheduleReprocess(p); p = p.parentElement; i++; }
    };

    document.addEventListener('pointerover', onStateChange, true);
    document.addEventListener('pointerout',  onStateChange, true);
    document.addEventListener('pointerdown', onStateChange, true);
    document.addEventListener('pointerup',   onStateChange, true);
    document.addEventListener('focusin',     onStateChange, true);
    document.addEventListener('focusout',    onStateChange, true);
  }

  function start() {
    if (started) return;
    if (!document.documentElement) return;
    started = true;

    applyVariables();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startProcessing, { once: true });
    } else {
      startProcessing();
    }
  }

  function boot() {
    const stored = readSettingsSync();
    settings = Object.assign({}, DEFAULTS, stored || {});

    if (settings.enabled === false) return;
    start();
  }

  window.addEventListener('__omni_settings_updated__', (e) => {
    const next = e && e.detail;
    if (!next) return;
    settings = Object.assign({}, DEFAULTS, next);
    if (settings.enabled === false) return;
    if (!started) start();
    else applyVariables();
  });

  if (document.documentElement) {
    boot();
  } else {
    const obs = new MutationObserver(() => {
      if (document.documentElement) {
        obs.disconnect();
        boot();
      }
    });
    obs.observe(document, { childList: true, subtree: true });
  }
})();