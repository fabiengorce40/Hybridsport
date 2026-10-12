/**
 * P0 — CONTRÔLE PRÉ-SÉANCE (interface) : avant CHAQUE nouveau démarrage (planning, séance, « Faire maintenant », séance
 * non placée), quelques questions fermées : douleur actuelle (zone, intensité), fatigue, récupération. « Passer » =
 * état inconnu. La question douleur exige une réponse EXPLICITE (« Non » / « Oui ») pour valider : sans réponse, rien n'est
 * lu comme « aucune douleur ». Les douleurs déjà connues sont rappelées ; « Passer » les conserve. La décision (inchangée, adaptée, reportée, pause) est prise par app-core (règles du CORE et du moteur) ;
 * cet écran l'affiche telle quelle. Aucun diagnostic, aucun texte libre. Une séance commencée est reprise sans contrôle.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { CHECKIN_BODY_AREAS, knownPainsOf, selectProgrammeSession, startProgrammeSession } from '@hybridsport/app-core';
import type { CheckIn, CheckInInput, KnownPain } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { Notice } from '../ui.js';
import { adaptationChangesText, AREA_LABELS, checkInReasonsText, knownPainText, FATIGUE_LABELS, PAIN_LEVEL_LABELS, READINESS_LABELS, RECOVERY_LABELS } from '../present.js';

type Area = (typeof CHECKIN_BODY_AREAS)[number];
type Level = 'P1' | 'P2' | 'P3';
type Fatigue = NonNullable<CheckInInput['fatigue']>;
type Recovery = NonNullable<CheckInInput['recovery']>;

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="stack" role="radiogroup" aria-label={label}>
      <div className="section-title" style={{ marginTop: 0 }}>{label}</div>
      <div className="row wrap">
        {options.map((o) => <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={`chip k-tap ${value === o.id ? 'on' : ''}`} onClick={() => onChange(o.id)}>{o.label}</button>)}
      </div>
    </div>
  );
}

/** Feuille du contrôle : réponses → `onSubmit(checkIn)` ; « Passer » → `onSubmit(undefined)` (état inconnu). */
export function PreSessionSheet({ result, known = [], onSubmit, onClose }: { result: CheckIn | null; known?: readonly KnownPain[]; onSubmit: (c: CheckInInput | undefined) => void; onClose: () => void }) {
  const [pain, setPain] = useState<'no' | 'yes' | null>(null);
  const [areas, setAreas] = useState<Partial<Record<Area, Level>>>({});
  const [general, setGeneral] = useState(false);
  const [fatigue, setFatigue] = useState<Fatigue>('unknown');
  const [recovery, setRecovery] = useState<Recovery>('unknown');
  const [tried, setTried] = useState(false);
  const chosen = Object.entries(areas) as [Area, Level][];
  const missingLevel = pain === 'yes' && chosen.length === 0 && !general;
  const missingPain = pain === null;
  const isArea = (a: string): a is Area => (CHECKIN_BODY_AREAS as readonly string[]).includes(a);
  const isLevel = (l: string): l is Level => l === 'P1' || l === 'P2' || l === 'P3';
  // « Oui » : zones déjà connues présélectionnées (modifiables) — une douleur connue n'est jamais oubliée par mégarde.
  const answerPain = (v: 'no' | 'yes') => {
    setPain(v);
    if (v === 'yes' && Object.keys(areas).length === 0) setAreas(Object.fromEntries(known.flatMap((k) => (isArea(k.area) && isLevel(k.level) ? [[k.area, k.level]] : []))));
  };
  if (result && (result.decision === 'postponed' || result.decision === 'paused')) {
    return (
      <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Avant de commencer">
        <div className="sheet" data-checkin-decision={result.decision}>
          <h2 style={{ margin: 0 }}>{result.decision === 'paused' ? 'Pause douleur activée' : 'Séance reportée'}</h2>
          <Notice tone="danger">{result.decision === 'paused'
            ? 'Selon les règles de sécurité de KAIRO, la séance ne démarre pas et la planification est suspendue. Consultez un professionnel de santé si la douleur persiste ou si le symptôme vous inquiète. Levez la pause dans les réglages quand la douleur a disparu.'
            : 'Cette séance ne peut pas être adaptée à l’état que vous avez déclaré. Elle n’est pas démarrée : vous pouvez la reporter ou choisir une autre séance.'}</Notice>
          <ul className="small" data-checkin-reasons>{checkInReasonsText(result.reasons).map((t) => <li key={t}>{t}</li>)}</ul>
          <button type="button" className="btn primary block" onClick={onClose}>Fermer</button>
        </div>
      </div>
    );
  }
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Avant de commencer">
      <div className="sheet" data-checkin-form>
        <h2 style={{ margin: 0 }}>Avant de commencer</h2>
        <p className="small muted" style={{ margin: 0 }}>Quelques secondes pour adapter la séance à votre état du jour. KAIRO ne pose aucun diagnostic.</p>
        {known.length > 0 && (
          <div className="k-block-note" role="note" data-checkin-known>
            <strong>Douleur déjà signalée</strong>
            <span>{knownPainText(known.map((k) => `${k.area}:${k.level}`))} — le {new Date(known[0]?.reportedAt ?? '').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}.</span>
            <span className="small">Elle reste prise en compte si vous passez ce contrôle. Répondez « Non » si elle a disparu.</span>
          </div>
        )}
        <Choice label="Avez-vous une douleur en ce moment ?" value={pain ?? ('' as 'no')} options={[{ id: 'no', label: 'Non' }, { id: 'yes', label: 'Oui' }]} onChange={answerPain} />
        {tried && missingPain && <div className="k-dur-error" role="alert">Répondez à la question douleur (« Non » ou « Oui »), ou touchez « Passer ».</div>}
        {pain === 'yes' && (
          <div className="stack" data-checkin-pain>
            <div className="small">Où ? Touchez chaque zone concernée, puis son intensité.</div>
            <div className="row wrap" role="group" aria-label="Zones douloureuses">
              {CHECKIN_BODY_AREAS.map((a) => (
                <button key={a} type="button" className={`chip k-tap ${areas[a] ? 'on' : ''}`} aria-pressed={areas[a] !== undefined}
                  onClick={() => setAreas((x) => (x[a] ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== a)) : { ...x, [a]: 'P1' }))}>{AREA_LABELS[a] ?? a}</button>
              ))}
            </div>
            {chosen.map(([a, l]) => (
              <Choice key={a} label={`Intensité · ${AREA_LABELS[a] ?? a}`} value={l} options={(['P1', 'P2', 'P3'] as const).map((id) => ({ id, label: PAIN_LEVEL_LABELS[id] ?? id }))} onChange={(v) => setAreas((x) => ({ ...x, [a]: v }))} />
            ))}
            <label className="check k-tap"><input type="checkbox" checked={general} onChange={(e) => setGeneral(e.target.checked)} />{PAIN_LEVEL_LABELS.P4}</label>
            {tried && missingLevel && <div className="k-dur-error" role="alert">Choisissez au moins une zone, ou le signal général.</div>}
          </div>
        )}
        <Choice label="Fatigue aujourd’hui" value={fatigue} options={(['low', 'moderate', 'high', 'unknown'] as const).map((id) => ({ id, label: FATIGUE_LABELS[id] ?? id }))} onChange={setFatigue} />
        <Choice label="Récupération depuis la dernière séance" value={recovery} options={(['good', 'average', 'poor', 'unknown'] as const).map((id) => ({ id, label: RECOVERY_LABELS[id] ?? id }))} onChange={setRecovery} />
        <div className="row">
          <button type="button" className="btn secondary" onClick={() => onSubmit(undefined)}>Passer</button>
          <button type="button" className="btn primary block" onClick={() => {
            setTried(true);
            if (missingPain || missingLevel) return;
            onSubmit({ painAnswer: pain, pains: pain === 'yes' ? chosen.map(([area, level]) => ({ area, level })) : [], generalSignal: pain === 'yes' && general, fatigue, recovery });
          }}>Valider et commencer</button>
        </div>
        <p className="tiny muted" style={{ margin: 0 }}>{known.length > 0
          ? '« Passer » : votre état reste inconnu ; la douleur déjà signalée reste prise en compte.'
          : '« Passer » : votre état reste inconnu ; la séance prévue est proposée telle quelle.'}</p>
        <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
      </div>
    </div>
  );
}

/**
 * Flux de démarrage UNIQUE : séance commencée ⇒ reprise directe ; sinon feuille de contrôle, puis démarrage par
 * app-core avec l'état déclaré. `onStarted` : après un démarrage effectif (ou une reprise).
 */
export function useStartFlow(onStarted?: (requestId: string) => void): { start: (requestId: string) => void; sheet: ReactElement | null } {
  const store = useStore();
  const [target, setTarget] = useState<string | null>(null);
  const [result, setResult] = useState<CheckIn | null>(null);
  const close = () => { setTarget(null); setResult(null); };
  const start = (requestId: string) => {
    if (selectProgrammeSession(store.state, requestId)?.log) { onStarted?.(requestId); return; }
    setResult(null);
    setTarget(requestId);
  };
  const sheet = target === null ? null : (
    <PreSessionSheet result={result} known={knownPainsOf(store.state.checkIns, store.state.safety.clearedAt)} onClose={close} onSubmit={(ci) => {
      let last: CheckIn | undefined;
      const ok = store.apply((s, c) => { const n = startProgrammeSession(s, c, target, undefined, ci); last = n.checkIns.at(-1); return n; });
      if (!ok) { close(); return; }
      if (last && (last.decision === 'postponed' || last.decision === 'paused')) { setResult(last); return; }
      const id = target;
      close();
      onStarted?.(id);
    }} />
  );
  return { start, sheet };
}

/** Séance ADAPTÉE au démarrage : ce qui a changé et pourquoi (décision d'app-core, affichée telle quelle). */
export function AdaptationNotice({ v }: { v: { readonly adaptation: { readonly changes: readonly string[]; readonly reasons: readonly { readonly code: string; readonly params: Readonly<Record<string, unknown>> }[] } | null; readonly checkIn: CheckIn | null } }) {
  if (!v.adaptation) return null;
  const changes = adaptationChangesText(v.adaptation.changes);
  const why = checkInReasonsText([...(v.checkIn?.reasons ?? []), ...v.adaptation.reasons]);
  return (
    <div className="k-block-note" role="note" data-adaptation>
      <strong>Séance adaptée à votre état du jour</strong>
      <span>{v.checkIn ? READINESS_LABELS[v.checkIn.readiness] : ''}{v.checkIn && v.checkIn.pains.length > 0 ? ` · douleur : ${v.checkIn.pains.map((p) => `${(AREA_LABELS[p.area] ?? p.area).toLowerCase()} (${(PAIN_LEVEL_LABELS[p.level] ?? p.level).toLowerCase()})`).join(', ')}` : ''}{v.checkIn && v.checkIn.knownPains.length > 0 ? ` · douleur déjà signalée : ${knownPainText(v.checkIn.knownPains.map((k) => `${k.area}:${k.level}`))}` : ''}</span>
      {changes.length > 0 && <ul className="small" style={{ margin: 0 }}>{changes.map((t) => <li key={t}>{t}</li>)}</ul>}
      {why.length > 0 && <details className="k-details"><summary>Pourquoi</summary><ul className="small">{why.map((t) => <li key={t}>{t}</li>)}</ul></details>}
    </div>
  );
}
