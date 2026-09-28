import { useState } from 'react';
import { clearPain, emptyState, exportState, PAIN_AREAS, updateProfile } from '@hybridsport/app-core';
import type { ProfileInput } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { AvailabilitySection, EquipmentSection, GoalsSection, SportsSection } from '../ProfileForm.js';
import { Notice } from '../ui.js';

export function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function Profile() {
  const store = useStore();
  const { state } = store;
  const [draft, setDraft] = useState<ProfileInput | null>(state.profile);
  const [saved, setSaved] = useState(false);
  const [confirmPain, setConfirmPain] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  if (!draft || !state.profile) return null;
  const set = (f: (x: ProfileInput) => ProfileInput) => { setDraft(f(draft)); setSaved(false); };
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.profile);
  const pain = state.safety.activePain;
  return (
    <div className="screen">
      <h1 className="screen-title">Profil</h1>

      {pain && (
        <div className="card" style={{ borderColor: 'var(--danger)' }}>
          <h3>Pause douleur active</h3>
          <p className="small muted" style={{ margin: 0 }}>Signalée le {new Date(pain.reportedAt).toLocaleDateString('fr-FR')}{pain.areas.length > 0 ? ` (${pain.areas.map((a) => PAIN_AREAS[a] ?? a).join(', ')})` : ''}. Aucune séance n’est proposée : KAIRO ne dispose d’aucune règle de sécurité validée pour adapter l’entraînement à une douleur.</p>
          {!confirmPain
            ? <button className="btn secondary" onClick={() => setConfirmPain(true)}>La douleur a disparu</button>
            : (
              <div className="stack">
                <span className="small">Confirmez-vous que la douleur a disparu, ou qu’un professionnel de santé vous a autorisé à reprendre ?</span>
                <div className="row"><button className="btn ghost" onClick={() => setConfirmPain(false)}>Annuler</button><button className="btn primary" onClick={() => { store.apply((s, c) => clearPain(s, c)); setConfirmPain(false); }}>Je confirme</button></div>
              </div>
            )}
        </div>
      )}

      <div className="section-title">Sports</div>
      <SportsSection p={draft} set={set} />
      <div className="section-title">Objectifs et niveau</div>
      <GoalsSection p={draft} set={set} />
      <div className="section-title">Disponibilités</div>
      <AvailabilitySection p={draft} set={set} />
      <div className="section-title">Matériel</div>
      <EquipmentSection p={draft} set={set} />

      {dirty && <Notice>Enregistrer replanifie la semaine. Les séances commencées ou terminées sont conservées telles quelles.</Notice>}
      <button className="btn primary block" disabled={!dirty} onClick={() => { if (store.apply((s, c) => updateProfile(s, draft, c))) setSaved(true); }}>{saved ? 'Enregistré ✓' : 'Enregistrer et replanifier'}</button>

      <div className="section-title">Données</div>
      <Notice>
        <span>Vos données sont enregistrées uniquement sur cet appareil, dans ce navigateur{store.persistent ? '' : ' — STOCKAGE INDISPONIBLE : rien ne sera conservé à la fermeture'}. Aucune synchronisation entre appareils. Exportez-les pour les sauvegarder.</span>
      </Notice>
      <button className="btn secondary" onClick={() => download(`kairo-${store.clock().today}.json`, exportState(state))}>Exporter mes données</button>
      {!confirmReset
        ? <button className="btn danger" onClick={() => setConfirmReset(true)}>Effacer toutes les données</button>
        : (
          <div className="card">
            <span className="small">Tout effacer (profil, planning, historique) ? Exportez d’abord si besoin. Action irréversible.</span>
            <div className="row"><button className="btn ghost" onClick={() => setConfirmReset(false)}>Annuler</button><button className="btn danger" onClick={() => store.reset(emptyState())}>Tout effacer</button></div>
          </div>
        )}

      <div className="section-title">À propos de la V0</div>
      <div className="card small muted" style={{ gap: 6 }}>
        <span><b>Musculation</b> : moteur Strength, ruleset provisoire (non validé, règles de sécurité fictives).</span>
        <span><b>Course</b> : footing facile en simulation ; autres séances non disponibles ; refus en cas de multisport, débutant, reprise longue.</span>
        <span><b>Cross-training, HYROX</b> : aucun moteur, aucune séance.</span>
        <span><b>Planning</b> : règles structurelles seulement ; aucune règle de récupération validée.</span>
      </div>
    </div>
  );
}
