import React from 'react';
import { createRoot } from 'react-dom/client';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import FrameRoot from './FrameRoot.jsx';

const HOST_ID = '__omniscience_frame_host__';
const GLOBAL_STYLE_ID = '__omniscience_global_style__';

export function mountFrame(ctx) {
  if (document.getElementById(HOST_ID)) return;

  function ensureGlobalStyle() {
    let s = document.getElementById(GLOBAL_STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = GLOBAL_STYLE_ID;
      document.head.appendChild(s);
    }
    const css = `
      html > #${HOST_ID} {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        pointer-events: none !important;
        z-index: 2147483647 !important;
      }
    `;
    if (s.textContent !== css) s.textContent = css;
  }

  const ensure = () => {
    if (!document.documentElement || !document.head || !document.body) return false;
    if (document.getElementById(HOST_ID)) return true;

    ensureGlobalStyle();

    new MutationObserver(() => {
      if (!document.getElementById(GLOBAL_STYLE_ID)) ensureGlobalStyle();
    }).observe(document.head, { childList: true });

    const host = document.createElement('div');
    host.id = HOST_ID;
    document.documentElement.appendChild(host);

    new MutationObserver(() => {
      const h = document.getElementById(HOST_ID);
      if (!h) return ensure();
      if (h.parentNode !== document.documentElement) {
        document.documentElement.appendChild(h);
      }
    }).observe(document.documentElement, { childList: true });

    const shadow = host.attachShadow({ mode: 'closed' });
    const styleContainer = document.createElement('div');
    shadow.appendChild(styleContainer);
    const reactRoot = document.createElement('div');
    reactRoot.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    shadow.appendChild(reactRoot);

    const cache = createCache({ key: 'omni-frame', container: styleContainer, prepend: true });

    createRoot(reactRoot).render(
      <CacheProvider value={cache}>
        <FrameRoot ctx={ctx} />
      </CacheProvider>
    );

    return true;
  };

  if (!ensure()) {
    const obs = new MutationObserver(() => { if (ensure()) obs.disconnect(); });
    obs.observe(document, { childList: true, subtree: true });
  }
}

if (typeof window !== 'undefined') {
  window.OmniFrame = { mountFrame };
}