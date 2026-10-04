import React from 'react';
import { useSetting } from '../settings/useSettings';
import { useProjectRoot, resolveForDisplay } from '../viewRuntime/paths';

const CUSTOM_BACKGROUNDS = {
  // 'MyCustom': React.lazy(() => import('./backgrounds/MyCustom')),
};

// Внешний контейнер: растянут на весь экран, поверх всего,
// принимает pointerEvents, без border/margin/padding.
function OuterLayer({ opacity, scrollable, children }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 'var(--frame-size)', left: 'var(--frame-size)', right: 'var(--frame-size)', bottom: 'var(--frame-size)',
        width: 'calc(100vw - calc(var(--frame-size)) * 2)',
        height: 'calc(100vh - calc(var(--frame-size)) * 2)',
        margin: 0,
        padding: 0,
        border: 'none',
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
  );
}

// Внутренний контейнер для webview: flex + явные размеры.
// webview внутри использует display:flex, поэтому родитель
// должен быть flex-контейнером с определённой высотой.
function WebviewContainer({ src }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minHeight: '100%',
        margin: 0,
        padding: 0,
        overflow: 'auto',
      }}
    >
      <webview
        src={src}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          minHeight: '100%',
          border: 'none',
          display: 'inline-flex',
          margin: 0,
          padding: 0,
          backgroundColor: '#00000000',
        }}
      />
    </div>
  );
}

export default function BackgroundRenderer() {
  const bg = useSetting('background');
  const projectRoot = useProjectRoot();
  const { type, source, color, opacity, componentName } = bg;

  const src = projectRoot == null ? null : resolveForDisplay(source, projectRoot);

  // Заглушка — сплошной цвет.
  const fallback = () => (
    <OuterLayer opacity={opacity} scrollable={false}>
      <div style={{ width: '100%', height: '100%', backgroundColor: color }} />
    </OuterLayer>
  );

  // Пусто — показываем цвет как базу.
  if (type === 'color' || (!source && type !== 'component')) {
    return fallback();
  }

  // Изображение — без прокрутки, cover.
  if (type === 'image') {
    if (!src) return fallback();
    return (
      <OuterLayer opacity={opacity} scrollable={false}>
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url('${src}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      </OuterLayer>
    );
  }

  // Видео — без прокрутки, cover.
  if (type === 'video') {
    if (!src) return fallback();
    return (
      <OuterLayer opacity={opacity} scrollable={false}>
        <video
          autoPlay
          loop
          muted
          playsInline
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            border: 'none',
            display: 'block',
            margin: 0,
            padding: 0,
          }}
        />
      </OuterLayer>
    );
  }

  // iframe — с прокруткой (если сайту нужно).
  if (type === 'iframe') {
    if (!src) return fallback();
    return (
      <OuterLayer opacity={opacity} scrollable={true}>
        <iframe
          src={src}
          title="bg"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          style={{
            width: '100%',
            height: '100%',
            minHeight: '100%',
            border: 'none',
            display: 'block',
            margin: 0,
            padding: 0,
          }}
        />
      </OuterLayer>
    );
  }

  // webview — своя структура контейнеров.
  if (type === 'webview') {
    if (!src) return fallback();
    return (
      <OuterLayer opacity={opacity} scrollable={true}>
        <WebviewContainer src={src} />
      </OuterLayer>
    );
  }

  // React-компонент — с прокруткой (если контенту нужно).
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