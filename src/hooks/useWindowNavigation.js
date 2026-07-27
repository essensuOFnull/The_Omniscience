import { useState, useEffect, useCallback } from 'react';

export default function useWindowNavigation(windowId, initialUrl, appUrl) {
  const [currentUrl, setCurrentUrl] = useState(initialUrl || appUrl || '');
  const [pageTitle, setPageTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  useEffect(() => {
    let unsubscribe;
    window.electron_desktop_API.getWindowNavState(windowId).then(state => {
      if (state) {
        setCurrentUrl(state.url);
        setPageTitle(state.title);
        setCanGoBack(state.canGoBack);
        setCanGoForward(state.canGoForward);
        setLoading(state.loading);
      }
    });
    unsubscribe = window.electron_desktop_API.onWindowNavigationUpdate(data => {
      if (data.windowId === windowId) {
        setCurrentUrl(data.url);
        setPageTitle(data.title);
        setCanGoBack(data.canGoBack);
        setCanGoForward(data.canGoForward);
        setLoading(data.loading);
      }
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [windowId]);

  const navigateTo = useCallback((url) => {
    if (!url) return;
    let processedUrl = url.trim();
    if (!/^https?:\/\//i.test(processedUrl)) {
      if (processedUrl.includes('.') && !processedUrl.includes(' ')) {
        processedUrl = `http://${processedUrl}`;
      } else {
        processedUrl = `https://www.google.com/search?q=${encodeURIComponent(processedUrl)}`;
      }
    }
    window.electron_desktop_API.loadUrl(windowId, processedUrl);
  }, [windowId]);

  const goBack = useCallback(() => window.electron_desktop_API.goBack(windowId), [windowId]);
  const goForward = useCallback(() => window.electron_desktop_API.goForward(windowId), [windowId]);
  const reload = useCallback(() => window.electron_desktop_API.reload(windowId), [windowId]);

  return { currentUrl, pageTitle, loading, canGoBack, canGoForward, setCurrentUrl, navigateTo, goBack, goForward, reload };
}