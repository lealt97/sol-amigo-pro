import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './collapsed-logo.css';

if (typeof window !== 'undefined' && (window as any).__bootFallbackTimeout) {
  clearTimeout((window as any).__bootFallbackTimeout);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
