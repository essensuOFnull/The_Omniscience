import React, { useState } from 'react';
import {
  Box, TextField, InputAdornment, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export default function App() {
  const [query, setQuery] = useState('');

  return (
    <Box sx={{ width: '100%', height: '100%', p: 2, boxSizing: 'border-box' }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Поиск в интернете..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
            </InputAdornment>
          ),
          sx: {
            color: 'white',
            bgcolor: 'rgba(255,255,255,0.05)',
            borderRadius: 2,
            '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
          },
        }}
        sx={{ mb: 3 }}
      />
      <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>
        {query ? `Результаты для «${query}» (скоро)` : 'Введите запрос…'}
      </Typography>
    </Box>
  );
}