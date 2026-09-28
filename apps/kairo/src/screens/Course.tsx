import { useState } from 'react';
import { DIFFICULTY_LABELS, durationLabel, logFreeRun, RUNNING_ARCHETYPE_SHORT, RUNNING_GOAL_LABELS, RUNNING_LEVEL_LABELS } from '@hybridsport/app-core';
import type { Feedback } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { weekView } from '../derive.js';
import { Notice } from '../ui.js';
import { SessionCard } from './Home.js';

const COMPLETION: Record<string, string> = { COMPLETED: 'Complète', PARTIAL: 'Interrompue', SKIPPED: 'Annulée' };

export function Course({ onOpen, onEditProfile }: { onOpen: (key: string) => void; onEditProfile: () => void }) {
  const { state, clock, apply } = useStore();
  const today = clock().today;
  const p = state.profile;
  const [minutes, setMinutes] = useState('');
  const [difficulty, setDifficulty] = useState<Feedback['difficulty']>('AS_EXPECTED');
  const [pain, setPain] = useState(false);
  const [completion, setCompletion] = useState<'COMPLETED' | 'PARTIAL'>('COMPLETED');
  const [km, setKm] = useState('');
  const distanceM = km === '' ? undefined : Number(km) * 1000;
  const distanceOk = distanceM === undefined || (Number.isFinite(distanceM) && distanceM > 0);
  const tests = [...state.running.references].sort((a, b) => (a.date < b.date ? 1 : -1));
  const runs = weekView(state, today).days.filter((d) => d.entry?.sport === 'running');
  const realized = [...state.running.realized].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  const save = () => {
    if (apply((s, c) => logFreeRun(s, { realizedDurationS: Number(minutes) * 60, completion, difficulty, pain, ...(distanceM !== undefined ? { distanceM } : {}) }, c))) { setMinutes(''); setKm(''); setPain(false); }
  };
  return (
    <div className="screen">
      <h1 className="screen-title">Course</h1>
      <Notice tone="sim">
        <div className="stack">
          <strong>Course en SIMULATION</strong>
          <span>Footing, sortie longue, test chronométré, seuil, VO₂, intervalles courts : chaque séance reprend ce que vous avez réellement fait, ne progresse que d’un petit pas après deux séances bien tolérées, et une première séance de qualité n’arrive qu’après un test. Allure seulement pour le VO₂ et les intervalles courts, issue d’un 3 à 5 km récent. Valeurs candidates, non approuvées. Allure spécifique, lignes droites, côtes (première séance) : non disponibles.</span>
        </div>
      </Notice>
      {!p?.running.enabled ? (
        <div className="card">
          <h3>La course n’est pas activée</h3>
          <p className="small muted">Vous pouvez tout de même enregistrer vos courses ci-dessous.</p>
          <button className="btn secondary" onClick={onEditProfile}>Activer dans le profil</button>
        </div>
      ) : (
        <div className="card">
          <div className="small muted">{RUNNING_LEVEL_LABELS[p.running.population]?.title} · objectif {RUNNING_GOAL_LABELS[p.running.goal]?.toLowerCase()}</div>
          {runs.length === 0 ? <p className="small muted">Aucune séance de course planifiée cette semaine.</p> : runs.map((d) => <SessionCard key={d.date} day={d} onOpen={onOpen} />)}
        </div>
      )}

      <div className="section-title">Enregistrer une course réalisée</div>
      <div className="card">
        <p className="small muted" style={{ margin: 0 }}>C’est la seule base de la dose de course : sans course réalisée, aucune séance n’est proposée (la dose de départ n’est pas validée).</p>
        <label className="field">Durée (minutes)<input inputMode="numeric" value={minutes} placeholder="ex. 30" onChange={(e) => setMinutes(e.target.value.replace(/[^0-9]/g, ''))} /></label>
        <label className="field">Distance (km, facultatif — nécessaire avant un premier test)<input inputMode="decimal" value={km} placeholder="ex. 5" onChange={(e) => setKm(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} /></label>
        <div className="row wrap">
          {(['COMPLETED', 'PARTIAL'] as const).map((c) => <button type="button" key={c} className={`chip ${completion === c ? 'on' : ''}`} onClick={() => setCompletion(c)}>{COMPLETION[c]}</button>)}
        </div>
        <label className="field">Ressenti
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Feedback['difficulty'])}>
            {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="check"><input type="checkbox" checked={pain} onChange={(e) => setPain(e.target.checked)} />Douleur pendant ou après (suspend les séances)</label>
        <button className="btn primary" disabled={!(Number(minutes) > 0) || !distanceOk} onClick={save}>Enregistrer la course</button>
      </div>

      <div className="section-title">Courses réalisées</div>
      {realized.length === 0 ? <div className="empty small">Aucune course enregistrée.</div> : realized.map((r) => (
        <div key={r.sessionId} className="card" style={{ gap: 4 }}>
          <div className="row between"><strong className="num">{durationLabel(r.realizedDurationS)}</strong><span className="tiny">{new Date(r.completedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span></div>
          <div className="tiny">{RUNNING_ARCHETYPE_SHORT[r.archetype] ?? r.archetype}{r.distanceM !== undefined ? ` · ${(r.distanceM / 1000).toFixed(1)} km` : ''} · {COMPLETION[r.completion]} · {DIFFICULTY_LABELS[r.unexpectedDifficulty] ?? 'ressenti non renseigné'}{r.intoleranceOrPainSignal ? ' · douleur' : ''}</div>
        </div>
      ))}

      <div className="section-title">Tests enregistrés</div>
      {tests.length === 0 ? <div className="empty small">Aucun test : il sera proposé à la place d’une séance clé quand il est nécessaire.</div> : tests.map((t) => (
        <div key={t.referenceId} className="card" style={{ gap: 4 }}>
          <div className="row between"><strong className="num">{String((t.values.distanceM ?? 0) / 1000)} km · {durationLabel(t.values.durationS ?? 0)}</strong><span className="tiny">{new Date(t.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span></div>
          <div className="tiny">Contre-la-montre enregistré par KAIRO : référence d’intensité (jamais de volume).</div>
        </div>
      ))}
    </div>
  );
}
