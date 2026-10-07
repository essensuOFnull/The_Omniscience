import React, { useState, useMemo, useCallback } from 'react';
import {
  Box, Tabs, Tab, Paper, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Alert,
} from '@mui/material';

const IMG_BASE = '../../../componentapps/crossout-calc/images/';

const DEFAULT_RESOURCES = [
  { id: 'scrap',       name: 'Лом',         img: 'scrap_metal.png', price: 0, packSize: 100 },
  { id: 'copper',      name: 'Медь',        img: 'copper.png',      price: 0, packSize: 100 },
  { id: 'wires',       name: 'Провода',     img: 'wires.png',       price: 0, packSize: 100 },
  { id: 'plastic',     name: 'Пластик',     img: 'plastic.png',     price: 0, packSize: 100 },
  { id: 'batteries',   name: 'Батареи',     img: 'batteries.png',   price: 0, packSize: 10 },
  { id: 'electronics', name: 'Электроника', img: 'electronics.png', price: 0, packSize: 10 },
];

const RARITIES = [
  { name: 'Редкая',      color: '#379BFE' },
  { name: 'Особая',      color: '#48C2CE' },
  { name: 'Эпическая',   color: '#CA40FF' },
  { name: 'Легендарная', color: '#FFA217' },
];

const DEFAULT_DROPS = [
  [150, 50,  0,   0,   0,   0  ],
  [40,  100, 60,  30,  0,   0  ],
  [80,  150, 170, 80,  0,   0  ],
  [50,  250, 0,   0,   250, 250],
];

export default function App() {
  const [tab, setTab] = useState(0);
  const [resources, setResources] = useState(DEFAULT_RESOURCES);
  const [drops, setDrops] = useState(DEFAULT_DROPS);

  // Пересчёт — только когда меняются ресурсы или дропы
  const results = useMemo(() => {
    return RARITIES.map((_, rIdx) => {
      let total = 0;
      for (let i = 0; i < resources.length; i++) {
        const count = drops[rIdx][i];
        if (count <= 0) continue;
        const { price, packSize } = resources[i];
        if (packSize > 0 && price > 0) {
          total += (count / packSize) * price;
        }
      }
      return { gross: total, net: total * 0.9 };
    });
  }, [resources, drops]);

  const setResource = useCallback((idx, field, value) => {
    setResources((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }, []);

  const setDrop = useCallback((rIdx, cIdx, value) => {
    setDrops((prev) => {
      const next = prev.map((row) => [...row]);
      next[rIdx][cIdx] = value;
      return next;
    });
  }, []);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        p: 2,
        boxSizing: 'border-box',
        bgcolor: 'rgba(0,0,0,0.35)',
      }}
    >
      <Typography variant="h5" sx={{ color: '#fff', mb: 1 }}>
        Crossout — Калькулятор разбора декора
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        textColor="inherit"
        variant="scrollable"
        sx={{
          mb: 2,
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          '& .MuiTabs-indicator': { backgroundColor: '#a855f7' },
        }}
      >
        <Tab
          label="Исходные данные"
          sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-selected': { color: '#fff' } }}
        />
        <Tab
          label="Результат"
          sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-selected': { color: '#fff' } }}
        />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* --- Цены на ресурсы --- */}
          <Paper
            elevation={0}
            sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell colSpan={3} sx={{ color: '#fff', fontWeight: 600 }}>
                      Цены на ресурсы (без учёта комиссии)
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: '#ccc' }}>Цена, монет (за пакет)</TableCell>
                    <TableCell sx={{ color: '#ccc' }}>Кол-во в пакете</TableCell>
                    <TableCell sx={{ color: '#ccc' }}>Ресурс</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resources.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={r.price}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setResource(i, 'price', isNaN(v) ? 0 : v);
                          }}
                          inputProps={{ step: '0.01', min: 0, style: { color: '#fff' } }}
                          sx={{
                            width: 120,
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={r.packSize}
                          onChange={(e) => {
                            const v = parseInt(e.target.value);
                            setResource(i, 'packSize', isNaN(v) ? 0 : v);
                          }}
                          inputProps={{ step: '1', min: 1, style: { color: '#fff' } }}
                          sx={{
                            width: 100,
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <img
                            src={IMG_BASE + r.img}
                            alt={r.name}
                            style={{ width: 40, height: 40, objectFit: 'contain' }}
                          />
                          <Typography sx={{ color: '#fff' }}>{r.name}</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* --- Выпадение ресурсов --- */}
          <Paper
            elevation={0}
            sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell colSpan={resources.length + 1} sx={{ color: '#fff', fontWeight: 600 }}>
                      Сколько выдаётся ресурсов за разбор декора разной редкости
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: '#ccc', minWidth: 110 }}>Редкость</TableCell>
                    {resources.map((r) => (
                      <TableCell key={r.id} align="center">
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                          <img
                            src={IMG_BASE + r.img}
                            alt={r.name}
                            style={{ width: 32, height: 32, objectFit: 'contain' }}
                          />
                          <Typography variant="caption" sx={{ color: '#ccc' }}>
                            {r.name}
                          </Typography>
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {RARITIES.map((rar, rIdx) => (
                    <TableRow key={rar.name}>
                      <TableCell sx={{ bgcolor: rar.color, color: '#fff', fontWeight: 600 }} className='ignore_The_Omniscience_Theme_recursive'>
                        {rar.name}
                      </TableCell>
                      {resources.map((r, cIdx) => (
                        <TableCell key={r.id} align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={drops[rIdx][cIdx]}
                            onChange={(e) => {
                              const v = parseInt(e.target.value);
                              setDrop(rIdx, cIdx, isNaN(v) ? 0 : v);
                            }}
                            inputProps={{
                              step: '1',
                              min: 0,
                              style: { color: '#fff', textAlign: 'center', padding: '4px 6px' },
                            }}
                            sx={{
                              width: 70,
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                            }}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* --- Итоговая таблица --- */}
          <Paper
            elevation={0}
            sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell colSpan={3} sx={{ color: '#fff', fontWeight: 600 }}>
                      Стоимость разбора одного декора каждой редкости
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: '#ccc' }}>Редкость</TableCell>
                    <TableCell sx={{ color: '#ccc' }}>Без комиссии (крафты)</TableCell>
                    <TableCell sx={{ color: '#ccc' }}>С комиссией 10%</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {RARITIES.map((rar, rIdx) => (
                    <TableRow key={rar.name}>
                      <TableCell sx={{ bgcolor: rar.color, color: '#fff', fontWeight: 600 }} className='ignore_The_Omniscience_Theme_recursive'>
                        {rar.name}
                      </TableCell>
                      <TableCell sx={{ color: '#fff' }}>
                        {results[rIdx].gross.toFixed(2)} монет
                      </TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
                        {results[rIdx].net.toFixed(2)} монет
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* --- Пояснение --- */}
          <Paper
            elevation={0}
            sx={{
              bgcolor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              p: 2,
            }}
          >
            <Typography variant="subtitle1" sx={{ color: '#fff', mb: 1 }}>
              📊 Как работает расчёт:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#ccc' }}>
              <li>
                <strong>(количество ресурса ÷ размер пакета) × цена за пакет</strong> = стоимость ресурса
              </li>
              <li>Суммируем все ресурсы для каждой редкости → стоимость без комиссии</li>
              <li>Вычитаем 10% комиссии рынка → чистая прибыль</li>
            </Box>
          </Paper>
        </Box>
      )}

      <Typography
        variant="caption"
        sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mt: 2, textAlign: 'center' }}
      >
        📝 Все изменения применяются сразу.
      </Typography>
    </Box>
  );
}