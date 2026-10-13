import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#89b4fa' },
    secondary: { main: '#f5c2e7' },
    background: { default: '#1e1e2e', paper: '#313244' },
    text: { primary: '#cdd6f4', secondary: '#a6adc8' },
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  shape: { borderRadius: 8 },
});

export default theme;