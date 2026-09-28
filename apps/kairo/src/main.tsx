import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { StoreProvider } from './store.js';
import './styles.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <StoreProvider>
        <App />
      </StoreProvider>
    </StrictMode>,
  );
}

// Hors ligne : service worker uniquement en production, sur http(s).
// Désactivé pour l'aperçu autonome (page unique hébergée sans service worker possible).
if (import.meta.env.PROD && import.meta.env.VITE_TARGET !== 'single' && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => undefined); });
}
