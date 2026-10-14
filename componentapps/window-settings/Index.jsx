import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Нулевые стили по умолчанию для прозрачного окна
document.documentElement.style.margin = '0';
document.documentElement.style.padding = '0';
document.documentElement.style.background = 'transparent';
document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.background = 'transparent';
document.body.style.overflow = 'hidden';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);