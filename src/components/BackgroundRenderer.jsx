import React from 'react';
import { useSetting } from '../settings/useSettings';
import { useProjectRoot, resolveForDisplay } from '../settings/paths';
import { BootConsole } from './BootConsole';

const CUSTOM_BACKGROUNDS = {
  // 'MyCustom': React.lazy(() => import('./backgrounds/MyCustom')),
};

function OuterLayer({ opacity, scrollable, children }) {
  return (
    <>
      <BootConsole />
      <div
        style={{
          position: 'fixed',
          inset: 'var(--frame-size, 0px)',
          margin: 0, padding: 0, border: 'none',
          backgroundColor: 'transparent',
          opacity,
          overflow: scrollable ? 'auto' : 'hidden',
          pointerEvents: 'auto',
          lineHeight: 0,
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
    </>
  );
}

function WebviewContainer({ src }) {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        width: '100%', height: '100%', minHeight: '100%',
        margin: 0, padding: 0, overflow: 'auto',
      }}
    >
      <webview
        src={src}
        style={{
          flex: 1, width: '100%', height: '100%', minHeight: '100%',
          border: 'none', display: 'inline-flex',
          margin: 0, padding: 0,
          backgroundColor: '#00000000',
        }}
      />
    </div>
  );
}

export default function BackgroundRenderer() {
  const bg = useSetting('background') || {};
  const projectRoot = useProjectRoot();
  const { type, source, color, opacity = 1, componentName } = bg;

  const src = resolveForDisplay(source, projectRoot); // без `|| null`

  const fallback = () => (
    <OuterLayer opacity={opacity} scrollable={false}>
      <div style={{ width: '100%', height: '100%', backgroundColor: color }} />
    </OuterLayer>
  );

  if (type === 'color' || (!source && type !== 'component')) {
    return fallback();
  }

  if (type === 'image') {
    if (!src) return fallback();
    return (
      <OuterLayer opacity={opacity} scrollable={false}>
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url(${JSON.stringify(src)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      </OuterLayer>
    );
  }

  if (type === 'video') {
    if (!src) return fallback();
    return (
      <OuterLayer opacity={opacity} scrollable={false}>
        <video
          autoPlay loop muted playsInline src={src}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            border: 'none', display: 'block', margin: 0, padding: 0,
          }}
        />
      </OuterLayer>
    );
  }

  if (type === 'iframe') {
    if (!src) return fallback();
    return (
      <OuterLayer opacity={opacity} scrollable={true}>
        <iframe
          src={src}
          title="bg"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          style={{
            width: '100%', height: '100%', minHeight: '100%',
            border: 'none', display: 'block', margin: 0, padding: 0,
          }}
        />
      </OuterLayer>
    );
  }

  if (type === 'webview') {
    if (!src) return fallback();
    return (
      <OuterLayer opacity={opacity} scrollable={true}>
        <WebviewContainer src={src} />
      </OuterLayer>
    );
  }

  if (type === 'component') {
    const Comp = CUSTOM_BACKGROUNDS[componentName];
    if (!Comp) return fallback();
    return (
      <OuterLayer opacity={opacity} scrollable={true}>
        <React.Suspense fallback={null}>
          <Comp />
        </React.Suspense>
      </OuterLayer>
    );
  }

  return null;
}