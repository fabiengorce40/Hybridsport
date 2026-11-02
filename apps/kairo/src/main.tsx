import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { StoreProvider } from './store.js';
import { BETA_LABEL, IS_BETA } from './channel.js';
import { BUILD_ID } from './version.js';
import './styles.css';
import './design/kairo-ds.css';
import './design/rekka-v2.css';
import './design/rekka-components.css';
import { applyTheme } from './design/theme.js';
import './rekka/visual.css';
import { REKKA_V2 } from './rekka/visual.js';
if (REKKA_V2) document.documentElement.dataset.rekka = 'v2';

// REKKA V2 (lot V2-1) : thème V2 seulement si la build le demande ; sinon interface actuelle inchangée.
applyTheme(document.documentElement);
// BÊTA : identité, version et commit déployés toujours visibles (bandeau fixe).
if (IS_BETA) { document.title = BETA_LABEL; document.documentElement.classList.add('k-test'); }
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <StoreProvider>
        {IS_BETA && <div className="k-test-ribbon" role="status" aria-label={`${BETA_LABEL} · version ${BUILD_ID}`} data-beta-build={BUILD_ID}>{BETA_LABEL} · {BUILD_ID} · données séparées</div>}
        <App />
      </StoreProvider>
    </StrictMode>,
  );
}

// Hors ligne : service worker uniquement en production, sur http(s).
// Désactivé pour l'aperçu autonome (page unique hébergée sans service worker possible).
if (import.meta.env.PROD && import.meta.env.VITE_TARGET !== 'single' && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  // `updateViaCache: 'none'` : le script du service worker n'est jamais lu depuis le cache HTTP (mises à jour détectées).
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => undefined); });
}
