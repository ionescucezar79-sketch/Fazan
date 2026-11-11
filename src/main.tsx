import React from 'react';
import ReactDOM from 'react-dom/client';
// Doar subseturile latin + latin-ext (diacriticele românești), ca PWA-ul să rămână mic.
import '@fontsource/alegreya/latin-500.css';
import '@fontsource/alegreya/latin-ext-500.css';
import '@fontsource/alegreya/latin-700.css';
import '@fontsource/alegreya/latin-ext-700.css';
import '@fontsource/alegreya-sans/latin-400.css';
import '@fontsource/alegreya-sans/latin-ext-400.css';
import '@fontsource/alegreya-sans/latin-500.css';
import '@fontsource/alegreya-sans/latin-ext-500.css';
import '@fontsource/alegreya-sans/latin-700.css';
import '@fontsource/alegreya-sans/latin-ext-700.css';
import './styles.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
