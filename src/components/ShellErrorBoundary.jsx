import React from 'react';

function reportRenderFailure(error, info) {
  const message = [
    error?.stack || error?.message || String(error),
    info?.componentStack,
  ].filter(Boolean).join('\n');
  try {
    window.electron_topbar_API?.send('shell-session:renderer-error', { message });
  } catch (reportError) {
    console.error('[shell-session] failed to report renderer error:', reportError);
  }
}

export default class ShellErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[shell-session] React render failed:', error, info.componentStack);
    reportRenderFailure(error, info);
  }

  render() {
    if (this.state.hasError) {
      if (Object.prototype.hasOwnProperty.call(this.props, 'fallback')) {
        return this.props.fallback;
      }
      return (
        <div role="alert" style={{
          color: '#fff',
          background: '#7f1d1d',
          padding: 12,
          font: '12px sans-serif',
        }}>
          Ошибка панели. Запущено восстановление рабочего стола Explorer.
        </div>
      );
    }
    return this.props.children;
  }
}
