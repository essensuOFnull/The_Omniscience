import React, { useRef, useState, useEffect } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import AnchorLeft from './AnchorLeft';
import WindowButtons from './WindowButtons';
import Cell from './Cell';

export default function SearchGrid({
  gridStyle,
  iconSize,
  textSize = 12,
  icon,
  title,
  maximized,
  currentUrl,
  canGoBack,
  canGoForward,
  onPanelDragStart,
  onPanelDoubleClick,
  onToggleMode,
  onOpenDevTools,
  onMaximize,
  onMinimize,
  onClose,
  onNavigateTo,
  onBack,
  onForward,
  onReload,
}) {
  const [value, setValue] = useState(currentUrl || '');
  const inputRef = useRef(null);
  const focusRef = useRef(false);

  useEffect(() => {
    if (!focusRef.current) setValue(currentUrl || '');
  }, [currentUrl]);

  const handleUrlKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onNavigateTo(value.trim());
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  return (
    <div style={gridStyle}>
      <AnchorLeft
        icon={icon}
        iconSize={iconSize}
        onPanelDragStart={onPanelDragStart}
        onPanelDoubleClick={onPanelDoubleClick}
        onToggleMode={onToggleMode}
        onOpenDevTools={onOpenDevTools}
      />

      <WindowButtons
        iconSize={iconSize}
        maximized={maximized}
        onMaximize={onMaximize}
        onMinimize={onMinimize}
        onClose={onClose}
        col={2}
      />

      {/* Столбец 3 — навигация */}
      <Cell
        row="1" col="3"
        cursor={canGoBack ? 'pointer' : 'default'}
        onClick={canGoBack ? onBack : undefined}
        title="Назад"
        style={{ opacity: canGoBack ? 1 : 0.3 }}
      >
        <ArrowBackIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell
        row="2" col="3"
        cursor="pointer"
        onClick={onReload}
        title="Перезагрузить"
      >
        <RefreshIcon style={{ fontSize: iconSize }} />
      </Cell>
      <Cell
        row="3" col="3"
        cursor={canGoForward ? 'pointer' : 'default'}
        onClick={canGoForward ? onForward : undefined}
        title="Вперёд"
        style={{ opacity: canGoForward ? 1 : 0.3 }}
      >
        <ArrowForwardIcon style={{ fontSize: iconSize }} />
      </Cell>

      {/* Столбец 4 — заголовок */}
      <Cell
        row="1" col="4"
        cursor="default"
        title={title}
        style={{
          justifyContent: 'flex-start',
          padding: '0 8px',
          overflow: 'hidden',
          fontSize: textSize,
          width: '100%',
        }}
      >
        <span style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%',
          textAlign: 'left',
        }}>
          {title || 'Окно'}
        </span>
      </Cell>

      {/* Столбец 4 — адрес */}
      <Cell
        row="2" col="4"
        cursor="text"
        style={{
          position: 'relative',
          padding: 0,
          overflow: 'hidden',
          background: 'rgba(0,0,0,0.25)',
        }}
      >
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => { focusRef.current = true; }}
          onBlur={() => { focusRef.current = false; }}
          onKeyDown={handleUrlKeyDown}
          rows={1}
          spellCheck={false}
          aria-label="Адресная строка"
          style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: textSize,
            fontFamily: 'monospace',
            lineHeight: 1.25,
            padding: '3px 8px 3px 8px',
            boxSizing: 'border-box',
            resize: 'none',
            overflow: 'auto',
          }}
        />
      </Cell>
    </div>
  );
}