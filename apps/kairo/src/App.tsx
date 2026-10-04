import { useEffect, useState } from 'react';
import { useStore } from './store.js';
import { AuthorityBanner, BETA0_TABS, Notice, TabBar } from './ui.js';
import type { Tab } from './ui.js';
import { Setup } from './screens/beta0/Setup.js';
import { Home0 } from './screens/beta0/Home0.js';
import { Planning0 } from './screens/beta0/Planning0.js';
import { Session0 } from './screens/beta0/Session0.js';
import { History0 } from './screens/beta0/History0.js';
import { Programme0 } from './screens/beta0/Programme0.js';
import { Settings0 } from './screens/beta0/Settings0.js';
import { Home } from './screens/Home.js';
import { Planning } from './screens/Planning.js';
import { SessionScreen } from './screens/Session.js';
import { Course } from './screens/Course.js';
import { History } from './screens/History.js';
import { download, Profile } from './screens/Profile.js';
import { emptyState, isBeta0 } from '@hybridsport/app-core';

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
      {import.meta.env.VITE_TARGET !== 'single' && <button className="btn secondary" onClick={() => { const k = /« (.+) »/.exec(store.loadInfo ?? '')?.[1]; const raw = k ? window.localStorage.getItem(k) : null; if (raw) download('kairo-donnees-illisibles.json', raw); }}>Exporter la copie</button>}
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

  const [setup, setSetup] = useState(false);
  const beta0 = isBeta0(store.state);
  let body;
  if (store.load === 'unreadable' || store.load === 'newer_version') body = <LoadProblem />;
  else if (!store.state.profile) body = <Setup />;
  else if (setup && !beta0) body = <Setup initial={store.state.profile} onDone={() => { setSetup(false); setTab('home'); }} onCancel={() => setSetup(false)} />;
  else if (beta0) body = (
    <div className="app">
      <div aria-hidden={open ? true : undefined} inert={open ? true : undefined}>
        {tab === 'home' && <Home0 onOpen={setOpen} onGo={setTab} />}
        {tab === 'plan' && <Planning0 onOpen={setOpen} onGo={setTab} />}
        {tab === 'history' && <History0 onOpen={setOpen} />}
        {tab === 'programme' && <Programme0 />}
        {(tab === 'settings' || tab === 'profile' || tab === 'run') && <Settings0 />}
        <TabBar tabs={BETA0_TABS} tab={tab} onChange={(t) => { setOpen(null); setTab(t); }} />
      </div>
      {open && (
        <div className="overlay">
          <div className="overlay-inner">
            <Session0 requestId={open} onBack={() => setOpen(null)} />
          </div>
        </div>
      )}
    </div>
  );
  else body = (
    <div className="app">
      {/* Séance ouverte : l'écran sous-jacent est inerte et masqué aux lecteurs d'écran. */}
      <div aria-hidden={open ? true : undefined} inert={open ? true : undefined}>
        {tab === 'home' && (
          <>
            <div style={{ padding: '16px 16px 0' }}>
              <Notice><div className="stack"><strong>Nouveau : KAIRO Beta 0</strong><span>Créez votre programme Musculation, Course ou les deux, semaine après semaine.</span><button className="btn primary" onClick={() => setSetup(true)}>Créer mon programme</button></div></Notice>
            </div>
            <Home onOpen={setOpen} onGo={setTab} />
          </>
        )}
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
      <AuthorityBanner beta0={beta0 || !store.state.profile || setup} />
      {store.saveError && <div className="notice danger" role="alert" style={{ margin: 12 }}>Enregistrement impossible : {store.saveError}. Exportez vos données depuis le profil.</div>}
      {!store.persistent && <div className="notice warn" role="alert" style={{ margin: 12 }}>Stockage du navigateur indisponible : vos données ne seront pas conservées après fermeture.</div>}
      {store.toast && <div className="toast" role="alert" onClick={store.dismissToast}>{store.toast}</div>}
      {body}
    </>
  );
}
