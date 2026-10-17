export function useProjectRoot() {
  return window.__PROJECT_ROOT__ ?? null;
}

export function resolveForDisplay(source, projectRoot) {
  if (!source) return '';
  if (/^(https?|file|data|blob):/i.test(source)) return source;
  if (source.startsWith('/')) return `file://${source}`;
  // Нет projectRoot — оставляем как есть. Браузер сам разрешит
  // относительный путь относительно текущей страницы.
  if (!projectRoot) return source;
  const base = String(projectRoot).replace(/\/+$/, '');
  return `file://${base}/${source.replace(/^\/+/, '')}`;
}