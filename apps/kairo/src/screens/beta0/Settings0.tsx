import { useRef, useState } from 'react';
import { clearPain, decodeState, emptyState, exportState } from '@hybridsport/app-core';
import { openWeek, useStore } from '../../store.js';
import { download } from '../Profile.js';
import { Notice } from '../../ui.js';
import { RunningProfileScreen } from '../../running/RunningProfile.js';

const readText = (f: Blob): Promise<string> => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result));
  r.onerror = () => reject(r.error ?? new Error('lecture impossible'));
  r.readAsText(f);
});

/** Export / import : contrat app-core uniquement (format versionné, migrations dans app-core). */
export function DataSection() {
  const store = useStore();
  const file = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const single = import.meta.env.VITE_TARGET === 'single';
  const onImport = async (f: File | undefined) => {
    if (!f) return;
    const d = decodeState(await readText(f));
    if (!d.ok) { setMessage(`Import impossible : fichier illisible ou d’une version plus récente. Rien n’a été modifié.`); return; }
    let next = d.state;
    try { next = openWeek(d.state, store.clock()); } catch { /* état importé conservé tel quel */ }
    store.reset(next);
    setMessage('Données importées.');
  };
  return (
    <>
      <div className="section-title">Données</div>
      <Notice><span>Vos données sont enregistrées uniquement sur cet appareil{store.persistent ? '' : ' — stockage indisponible : rien ne sera conservé à la fermeture'}. Exportez-les pour les sauvegarder.</span></Notice>
      {single
        ? <Notice tone="warn">Aperçu : export et import indisponibles dans cette page d’aperçu.</Notice>
        : (
          <>
            <button className="btn secondary" onClick={() => download(`kairo-${store.clock().today}.json`, exportState(store.state))}>Exporter mes données</button>
            <button className="btn secondary" onClick={() => file.current?.click()}>Importer mes données</button>
            <input ref={file} type="file" accept="application/json,.json" aria-label="Fichier de données à importer" style={{ display: 'none' }} onChange={(e) => { void onImport(e.target.files?.[0]); e.target.value = ''; }} />
          </>
        )}
      {message && <div className="small" role="status">{message}</div>}
      {!confirmReset
        ? <button className="btn danger" onClick={() => setConfirmReset(true)}>Effacer toutes les données</button>
        : (
          <div className="card">
            <span className="small">Tout effacer (profil, programme, historique) ? Exportez d’abord si besoin. Action irréversible.</span>
            <div className="row"><button className="btn ghost" onClick={() => setConfirmReset(false)}>Annuler</button><button className="btn danger" onClick={() => store.reset(emptyState())}>Tout effacer</button></div>
          </div>
        )}
    </>
  );
}

export function PainCard() {
  const store = useStore();
  const [confirm, setConfirm] = useState(false);
  const pain = store.state.safety.activePain;
  if (!pain) return null;
  return (
    <div className="card" style={{ borderColor: 'var(--danger)' }}>
      <h3>Pause douleur active</h3>
      <p className="small muted" style={{ margin: 0 }}>Signalée le {new Date(pain.reportedAt).toLocaleDateString('fr-FR')}. La planification automatique est suspendue. KAIRO ne pose aucun diagnostic.</p>
      {!confirm
        ? <button className="btn secondary" onClick={() => setConfirm(true)}>La douleur a disparu</button>
        : (
          <div className="stack">
            <span className="small">Confirmez-vous que la douleur a disparu, ou qu’un professionnel de santé vous a autorisé à reprendre ?</span>
            <div className="row">
              <button className="btn ghost" onClick={() => setConfirm(false)}>Annuler</button>
              <button className="btn primary" onClick={() => { store.apply((s, c) => openWeek(clearPain(s, c), c)); setConfirm(false); }}>Je confirme</button>
            </div>
          </div>
        )}
    </div>
  );
}

export function Settings0() {
  const store = useStore();
  const [runningProfile, setRunningProfile] = useState(false);
  if (runningProfile) return <RunningProfileScreen onBack={() => setRunningProfile(false)} />;
  return (
    <div className="screen">
      <h1 className="screen-title">Réglages</h1>
      <PainCard />
      {store.state.profile?.running.enabled && (
        <button className="card button-card" onClick={() => setRunningProfile(true)}>
          <h3>Profil Course</h3>
          <div className="small muted">Vos performances récentes et ce que KAIRO en déduit</div>
        </button>
      )}
      <DataSection />
      <div className="section-title">À propos de la Beta</div>
      <div className="card small muted" style={{ gap: 6 }}>
        <span><b>Beta expérimentale</b> : les séances viennent des moteurs Musculation et Course ; certaines valeurs et règles de planification sont encore en cours de validation.</span>
        <span>Une séance par jour au plus ; aucune règle de récupération universelle n’est appliquée.</span>
        <span>KAIRO ne remplace pas un avis médical.</span>
      </div>
    </div>
  );
}
