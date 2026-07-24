import { useReducer, useCallback, useRef, useEffect } from 'react';

const initialState = (url) => ({
  history: [url || ''],
  index: 0,
});

function reducer(state, action) {
  switch (action.type) {
    case 'PUSH_URL': {
      // Добавить новый URL в историю (переход по ссылке или ручной ввод)
      const trimmed = action.url.trim();
      if (trimmed === state.history[state.index]) return state;
      const newHistory = [...state.history.slice(0, state.index + 1), trimmed];
      return { ...state, history: newHistory, index: newHistory.length - 1 };
    }
    case 'GO_BACK': {
      if (state.index > 0) {
        return { ...state, index: state.index - 1 };
      }
      return state;
    }
    case 'GO_FORWARD': {
      if (state.index < state.history.length - 1) {
        return { ...state, index: state.index + 1 };
      }
      return state;
    }
    default:
      return state;
  }
}

export default function useAddressBar(url, onNavigate) {
  const [state, dispatch] = useReducer(reducer, url, initialState);
  const prevUrlRef = useRef(url);

  // Когда внешний URL меняется (например, пользователь кликнул по ссылке в webview),
  // добавляем его в историю, если он действительно новый.
  useEffect(() => {
    if (url && url !== prevUrlRef.current) {
      dispatch({ type: 'PUSH_URL', url });
      prevUrlRef.current = url;
    }
  }, [url]);

  const goBack = useCallback(() => {
    if (state.index > 0) {
      dispatch({ type: 'GO_BACK' });
      const prevUrl = state.history[state.index - 1];
      onNavigate?.(prevUrl);
    }
  }, [state, onNavigate]);

  const goForward = useCallback(() => {
    if (state.index < state.history.length - 1) {
      dispatch({ type: 'GO_FORWARD' });
      const nextUrl = state.history[state.index + 1];
      onNavigate?.(nextUrl);
    }
  }, [state, onNavigate]);

  return { state, goBack, goForward };
}