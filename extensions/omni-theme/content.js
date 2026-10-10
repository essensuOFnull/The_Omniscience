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
  let mutationObserver = null;

  /* ================================================================== */
  /*  @property                                                          */
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

  /* ================================================================== */
  /*  СОСТОЯНИЕ                                                          */
  /* ================================================================== */

  const processed = new WeakSet();
  const textProcessed = new WeakSet();
  const lastWritten = new WeakMap();

  /* Состояние отложенной переобработки на элемент.                       */
  /*   { running, dirty, trans, pending }                                */
  /*                                                                     */
  /*   running — идёт ли сейчас двухкадровый swap;                       */
  /*   dirty   — пришло ли новое изменение, пока swap шёл;               */
  /*   trans   — сохранённый inline-transition для восстановления;       */
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
  }

  function readComputedColors(el) {
    void el.offsetWidth;
    const cs = getComputedStyle(el);
    return {
      bgColor: cs.backgroundColor,
      bgImage: cs.backgroundImage,
      color:   cs.color,
    };
  }

  function recordWrite(el) {
    lastWritten.set(el, {
      bg: el.style.getPropertyValue('background-color'),
      bi: el.style.getPropertyValue('background-image'),
      c:  el.style.getPropertyValue('color'),
    });
  }

  function isOurOwnStyleMutation(el) {
    const last = lastWritten.get(el);
    if (!last) return false;
    return last.bg === el.style.getPropertyValue('background-color')
        && last.bi === el.style.getPropertyValue('background-image')
        && last.c  === el.style.getPropertyValue('color');
  }

  /* ================================================================== */
  /*  ОБРАБОТКА                                                          */
  /* ================================================================== */

  function processElement(el) {
    if (!el || processed.has(el)) return;
    if (isIgnored(el)) return;
    processed.add(el);

    const cs = readComputedColors(el);
    const bgImage = cs.bgImage;
    const bgColor = cs.bgColor;
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
  /*                                                                     */
  /*  Двухфазный swap с защитой от потери событий:                        */
  /*                                                                     */
  /*    Кадр N:                                                          */
  /*      • transition: none !important;                                 */
  /*      • снять свои inline-оверрайды;                                 */
  /*      • пересобрать фильтр;                                          */
  /*                                                                     */
  /*    Кадр N+1 (проверочный):                                          */
  /*      • если во время N прилетело ещё изменение (dirty) —             */
  /*        возвращаемся к кадру N и повторяем (transition по-прежнему    */
  /*        выключен);                                                   */
  /*      • если новых изменений нет — восстанавливаем transition.        */
  /*                                                                     */
  /*  Благодаря этому даже быстрая серия hover/click/ripple не теряется:  */
  /*  элемент "дозревает" до спокойного состояния, и только потом         */
  /*  транзишены возвращаются.                                           */
  /* ================================================================== */

  function scheduleReprocess(el) {
    if (isIgnored(el)) return;

    let state = pendingReprocess.get(el);

    if (state && state.running) {
      // Идёт swap — не теряем изменение, помечаем на доп.проход.
      state.dirty = true;
      return;
    }

    if (!state) {
      state = { running: false, dirty: false, trans: null };
      pendingReprocess.set(el, state);
    } else {
      state.dirty = false;
    }

    // Запоминаем исходный inline-transition один раз — чтобы восстановить
    // ровно то, что было.
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

      // Проверочный кадр — «перестраховка на 1 кадр».
      requestAnimationFrame(() => {
        if (!el.isConnected) {
          pendingReprocess.delete(el);
          return;
        }

        if (state.dirty) {
          // Пока мы работали, состояние снова поменялось —
          // повторяем цикл, transition всё ещё выключен.
          state.dirty = false;
          runPass(el, state);
          return;
        }

        // Состояние устоялось — возвращаем transition как было.
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

    injectBaseStyles();
    applyVariables();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startProcessing, { once: true });
    } else {
      startProcessing();
    }
  }

  /* ================================================================== */
  /*  ХРАНИЛИЩЕ                                                          */
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
      });
    });
  } catch (_) {
    start();
  }

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