import { useState, useCallback } from 'react';
export default function useBrowser(initialUrl) {
  const [currentUrl, setCurrentUrl] = useState(initialUrl || '');
  const [favicon, setFavicon] = useState(null);
  const [navigateTo, setNavigateTo] = useState(null);

  const handleNavigate = useCallback((newUrl) => {
    setNavigateTo(newUrl);
    setCurrentUrl(newUrl);
    setFavicon(null);
  }, []);

  const handleUrlChange = useCallback((newUrl) => {
    setCurrentUrl(newUrl);
    setFavicon(null);
  }, []);

  return { currentUrl, favicon, navigateTo, handleNavigate, handleUrlChange, setFavicon };
}