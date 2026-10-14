import React from 'react';
import { Box, Button, Tooltip } from '@mui/material';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';

// ⓟ ⓥ ⓘ (U+24DF, U+24E5, U+24D8)
const GLYPH = { p: 'ⓟ', v: 'ⓥ', i: 'ⓘ' };

// Catppuccin Mocha
const COLOR = {
  p: '#f38ba8',
  v: '#a6e3a1',
  i: '#89b4fa',
};

// Цвета внутренних разделителей по уровню вложенности
const SEP_COLOR = [
  '#a855f7',                    // 0 — граница группы
  'rgba(255,255,255,0.2)',      // 1
  'rgba(137,180,250,0.55)',     // 2
  'rgba(166,227,161,0.55)',     // 3
  'rgba(249,226,175,0.55)',     // 4
];

function separatorColor(depth) {
  return SEP_COLOR[Math.min(depth, SEP_COLOR.length - 1)];
}

const ROLE_ORDER = { p: 0, v: 1, i: 2 };
function roleRank(role) {
  return ROLE_ORDER[role] ?? 9;
}

// Рекурсивный рендер ряда чипов внутри одной группы.
function NodeRow({ node, depth, onFocus, onClose }) {
  const all = [];

  const pKids = node.children.filter((c) => c.roles.has('p'));
  const vKids = node.children.filter((c) => c.roles.has('v') && !c.roles.has('i'));
  const iKids = node.children.filter((c) => c.roles.has('i'));

  // Левая сторона: процессы
  pKids.forEach((c, i) => {
    if (i > 0 || all.length > 0) all.push(<Sep key={`sp-${c.id}`} depth={depth} />);
    all.push(<WindowChip key={c.id} node={c} onFocus={onFocus} onClose={onClose} />);
  });

  // Центр: сам узел
  if (all.length > 0) all.push(<Sep key={`smain-${node.id}`} depth={depth} />);
  all.push(<WindowChip key={node.id} node={node} onFocus={onFocus} onClose={onClose} />);

  // Правая сторона: view-дети, потом inspect-дети
  for (const c of [...vKids, ...iKids]) {
    all.push(<Sep key={`sr-${c.id}`} depth={depth} />);
    all.push(<WindowChip key={c.id} node={c} onFocus={onFocus} onClose={onClose} />);
  }

  return <>{all}</>;
}

function Sep({ depth }) {
  return (
    <Box sx={{
      width: '1px',
      alignSelf: 'stretch',
      bgcolor: separatorColor(depth),
      flexShrink: 0,
    }} />
  );
}

function WindowChip({ node, onFocus, onClose }) {
  const w = node._window;
  const isActive = node.focused;
  const isHidden = node.isHidden;
  const rolesSorted = [...node.roles].sort((a, b) => roleRank(a) - roleRank(b));

  return (
    <Tooltip
      title={node.title}
      placement="top"
      enterDelay={500}
      slotProps={{
        popper: {
          modifiers: [
            { name: 'flip', enabled: false },
            { name: 'preventOverflow', options: { boundary: 'clippingParents' } },
          ],
        },
        tooltip: {
          sx: { whiteSpace: 'nowrap', maxWidth: 'none' },
        },
      }}
    >
      <Button
        size="small"
        onClick={() => onFocus?.(w)}
        onAuxClick={(e) => { if (e.button === 1) onClose?.(w); }}
        disableElevation
        sx={{
          // Ключевое: прижимаем контент влево, иначе MUI центрирует
          justifyContent: 'flex-start',
          textAlign: 'left',

          textTransform: 'none',
          height: 24,
          minWidth: 60,
          maxWidth: 220,
          fontSize: 11,
          fontWeight: 500,
          lineHeight: 1,
          padding: '0 8px',
          flexShrink: 0,
          userSelect: 'none',
          color: isActive ? '#fff' : '#ddd',
          bgcolor: isActive ? 'rgba(168,85,247,0.35)' : 'transparent',
          borderRadius: 0,
          transition: 'background-color 120ms ease, opacity 120ms ease',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
          ...(isHidden ? {
            opacity: 0.45,
            '&:hover': { opacity: 1 },
          } : {}),

          // Убираем внутренние отступы MUI, которые иногда мешают
          '& .MuiButton-startIcon': { display: 'none' },
          '& .MuiButton-endIcon':   { display: 'none' },
        }}
      >
        {/* Внутренний контейнер — растягиваем на 100% ширины кнопки */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          minWidth: 0,
          gap: 0.5,
        }}>
          {/* Символы ролей: идут вплотную к левому краю, потом заголовок */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            gap: '1px',
          }}>
            {rolesSorted.map((r) => (
              <Box
                key={r}
                component="span"
                sx={{
                  color: COLOR[r] || '#fff',
                  fontSize: 13,
                  lineHeight: 1,
                }}
              >
                {GLYPH[r]}
              </Box>
            ))}
          </Box>

          {/* Иконка окна */}
          {node.icon ? (
            <Box
              component="img"
              src={node.icon}
              alt=""
              draggable={false}
              sx={{ width: 12, height: 12, flexShrink: 0, ml: '2px' }}
            />
          ) : null}

          {/* Заголовок: занимает всё оставшееся место и обрезается */}
          <Box sx={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {node.title}
          </Box>
        </Box>
      </Button>
    </Tooltip>
  );
}

// Публичный компонент: принимает один корневой узел дерева.
export default function WindowGroup({ root, onFocus, onClose }) {
  if (!root) return null;

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'stretch',
      height: 24,
      border: '1px solid #a855f7',
      borderRadius: 0.75,
      overflow: 'hidden',
      flexShrink: 0,
      WebkitAppRegion: 'no-drag',
    }}>
      <NodeRow node={root} depth={0} onFocus={onFocus} onClose={onClose} />
    </Box>
  );
}