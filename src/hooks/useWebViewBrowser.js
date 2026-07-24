import { useRef, useEffect } from 'react';
export default function useWebViewBrowser(url, navigateTo, onUrlChange, onFaviconChange, externalRef) {
  const webviewRef = externalRef || useRef(null);
  const currentUrlRef = useRef(url);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const handleDidNavigate = (e) => {
      if (e.url && e.url !== currentUrlRef.current) {
        currentUrlRef.current = e.url;
        onUrlChange?.(e.url);
      }
    };
    const handleDidNavigateInPage = (e) => {
      if (e.isMainFrame && e.url && e.url !== currentUrlRef.current) {
        currentUrlRef.current = e.url;
        onUrlChange?.(e.url);
      }
    };
    const handleFavicon = (e) => onFaviconChange?.(e.favicons?.[0] || null);

    wv.addEventListener('did-navigate', handleDidNavigate);
    wv.addEventListener('did-navigate-in-page', handleDidNavigateInPage);
    wv.addEventListener('page-favicon-updated', handleFavicon);

    return () => {
      wv.removeEventListener('did-navigate', handleDidNavigate);
      wv.removeEventListener('did-navigate-in-page', handleDidNavigateInPage);
      wv.removeEventListener('page-favicon-updated', handleFavicon);
    };
  }, [onUrlChange, onFaviconChange, webviewRef]);

  useEffect(() => {
    if (navigateTo && webviewRef.current) {
      webviewRef.current.loadURL(navigateTo);
    }
  }, [navigateTo]);

  return webviewRef;
}