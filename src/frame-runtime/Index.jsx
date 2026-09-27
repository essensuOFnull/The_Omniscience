import React from 'react';
import { createRoot } from 'react-dom/client';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import FrameRoot from './FrameRoot.jsx';

const HOST_ID = '__omniscience_frame_host__';
const TITLEBAR_H = 36;

export function mountFrame(ctx) {
  if (document.getElementById(HOST_ID)) return;

  const ensure = () => {
    if (!document.documentElement) return false;
    if (document.getElementById(HOST_ID)) return true;

    // 1. Хост-элемент
    const host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = [
      'position: fixed',
      'top: 0',
      'left: 0',
      'right: 0',
      'z-index: 2147483647',
      'pointer-events: auto',
    ].join(';') + ';';
    document.documentElement.appendChild(host);

    // 2. Закрытый Shadow Root
    const shadow = host.attachShadow({ mode: 'closed' });

    // 3. Свой container для стилей — внутри shadow
    const styleContainer = document.createElement('div');
    shadow.appendChild(styleContainer);

    // 4. Padding через style внутри shadow (не трогает html)
    const paddingStyle = document.createElement('style');
    paddingStyle.textContent = `
      :host { all: initial; }
    `;
    shadow.appendChild(paddingStyle);

    // 5. React-контейнер
    const reactRoot = document.createElement('div');
    shadow.appendChild(reactRoot);

    // 6. Emotion cache — container это shadow root
    const cache = createCache({
      key: 'omni-frame',
      container: styleContainer,
      prepend: true,
    });

    // 7. React
    createRoot(reactRoot).render(
      <CacheProvider value={cache}>
        <FrameRoot ctx={ctx} />
      </CacheProvider>
    );

    return true;
  };

  if (!ensure()) {
    const obs = new MutationObserver(() => {
      if (ensure()) obs.disconnect();
    });
    obs.observe(document, { childList: true, subtree: true });
  }
}

if (typeof window !== 'undefined') {
  window.OmniFrame = { mountFrame };//критически важно)
}