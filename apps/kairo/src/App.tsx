import { useEffect, useState } from 'react';
import { useStore } from './store.js';
import { AuthorityBanner, TabBar } from './ui.js';
import type { Tab } from './ui.js';
import { Onboarding } from './screens/Onboarding.js';
import { Home } from './screens/Home.js';
import { Planning } from './screens/Planning.js';
import { SessionScreen } from './screens/Session.js';
import { Course } from './screens/Course.js';
import { History } from './screens/History.js';
import { download, Profile } from './screens/Profile.js';
import { emptyState } from '@hybridsport/app-core';

function LoadProblem() {
  const store = useStore();
  const [confirm, setConfirm] = useState(false);
  if (store.load === 'newer_version') {
    return <div className="screen"><h1 className="screen-title">Mise à jour requise</h1><p className="muted">Vos données ont été enregistrées par une version plus récente de KAIRO ({store.loadInfo}). Elles ne seront pas modifiées. Rechargez l’application pour obtenir la dernière version.</p></div>;
  }
  return (
    <div className="screen">
      <h1 className="screen-title">Données illisibles</h1>
      <p className="muted">Les données enregistrées n’ont pas pu être relues ({store.loadInfo}). Elles n’ont pas été effacées : une copie est conservée sur l’appareil.</p>
      <button className="btn secondary" onClick={() => { const k = /« (.+) »/.exec(store.loadInfo ?? '')?.[1]; const raw = k ? window.localStorage.getItem(k) : null; if (raw) download('kairo-donnees-illisibles.json', raw); }}>Exporter la copie</button>
      {!confirm ? <button className="btn danger" onClick={() => setConfirm(true)}>Recommencer à zéro</button>
        : <button className="btn danger" onClick={() => store.reset(emptyState())}>Confirmer : recommencer (la copie reste conservée)</button>}
    </div>
  );
}

export function App() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { window.scrollTo(0, 0); }, [tab, open]);
  useEffect(() => {
    if (!store.toast) return undefined;
    const t = setTimeout(store.dismissToast, 3500);
    return () => clearTimeout(t);
  }, [store.toast, store.dismissToast]);

  let body;
  if (store.load === 'unreadable' || store.load === 'newer_version') body = <LoadProblem />;
  else if (!store.state.profile) body = <Onboarding />;
  else body = (
    <div className="app">
      {/* Séance ouverte : l'écran sous-jacent est inerte et masqué aux lecteurs d'écran. */}
      <div aria-hidden={open ? true : undefined} inert={open ? true : undefined}>
        {tab === 'home' && <Home onOpen={setOpen} onGo={setTab} />}
        {tab === 'plan' && <Planning onOpen={setOpen} onEditProfile={() => setTab('profile')} />}
        {tab === 'run' && <Course onOpen={setOpen} onEditProfile={() => setTab('profile')} />}
        {tab === 'history' && <History onOpen={setOpen} />}
        {tab === 'profile' && <Profile />}
        <TabBar tab={tab} onChange={(t) => { setOpen(null); setTab(t); }} />
      </div>
      {open && (
        <div className="overlay">
          <div className="overlay-inner">
            <AuthorityBanner />
            <SessionScreen sessionKey={open} onBack={() => setOpen(null)} onEditProfile={() => { setOpen(null); setTab('profile'); }} />
          </div>
        </div>
      )}
    </div>
  );
  return (
    <>
      <AuthorityBanner />
      {store.saveError && <div className="notice danger" role="alert" style={{ margin: 12 }}>Enregistrement impossible : {store.saveError}. Exportez vos données depuis le profil.</div>}
      {!store.persistent && <div className="notice warn" role="alert" style={{ margin: 12 }}>Stockage du navigateur indisponible : vos données ne seront pas conservées après fermeture.</div>}
      {store.toast && <div className="toast" role="alert" onClick={store.dismissToast}>{store.toast}</div>}
      {body}
    </>
  );
}
