/**
 * P1 — « Pourquoi cette séance » (Musculation) : variante, mouvements dominants, groupes sollicités (séries de travail),
 * allègements tracés, variation intra-semaine, signaux de récupération et volume de la semaine. Lecture seule des
 * décisions persistées (app-core) ; aucune valeur calculée ni augmentée ici.
 */
import { exerciseLabel, strengthInsightOf, strengthWeekInsights } from '@hybridsport/app-core';
import type { StrengthWeekInsights } from '@hybridsport/app-core';

type WeekVolumeAssessment = StrengthWeekInsights['volume'];
import { useStore } from '../store.js';
import { MUSCLE_GROUP_LABELS, recoveryText, reductionText } from '../present.js';

export function StrengthInsightPanel({ requestId }: { requestId: string }) {
  const { state } = useStore();
  const x = strengthInsightOf(state, requestId);
  if (!x) return null;
  const { insight, recovery } = x;
  return (
    <section className="k-block-note" aria-label="Pourquoi cette séance" data-strength-insight>
      <strong>{insight.variant ? `Variante ${insight.variant}` : 'Séance de la semaine'}{insight.variants > 1 ? ` · ${String(insight.variants)} variantes cette semaine` : ''}</strong>
      {insight.focus.length > 0 && <span className="small">Mouvements dominants : {insight.focus.map((e) => exerciseLabel(e)).join(' · ')}</span>}
      {insight.groups.length > 0 && <span className="small" data-strength-groups>Groupes sollicités (séries de travail) : {insight.groups.map((g) => `${MUSCLE_GROUP_LABELS[g.group] ?? g.group} ${String(g.sets)}`).join(' · ')}</span>}
      {insight.reductions.map((r) => <span key={`${r.structure}${String(r.hours)}${r.withSport}`} className="small" data-strength-reduction>{reductionText(r)}</span>)}
      {insight.variation === 'varied' && <span className="small" data-strength-variation>Exercices variés par rapport à la séance du même type plus tôt dans la semaine (variation prévue par les règles de Musculation, mouvements principaux maintenus pour la progression).</span>}
      {insight.variation === 'no_governed_variation' && <span className="small" data-strength-variation>Même contenu qu’une séance précédente de la semaine : aucune variation validée n’était possible.</span>}
      {recovery.map((r) => <span key={`${r.first.requestId}${r.second.requestId}`} className="small" data-strength-recovery>{recoveryText(r)}</span>)}
    </section>
  );
}

/** Volume de la semaine par groupe : prévu / repère expérimental. Jamais augmenté automatiquement pour l'atteindre. */
export function WeekVolumeCard({ volume }: { volume: WeekVolumeAssessment }) {
  if (!volume) return null;
  const rows = volume.groups.filter((g) => g.target !== null || g.planned > 0);
  return (
    <div className="card" aria-label="Volume de musculation de la semaine" data-week-volume>
      <h3>Volume de musculation de la semaine</h3>
      <p className="tiny muted" style={{ margin: 0 }}>Séries de travail prévues par groupe, comparées à un repère expérimental (non validé). KAIRO n’augmente pas le volume automatiquement pour atteindre ce repère.</p>
      <ul className="small" style={{ margin: 0 }}>
        {rows.map((g) => (
          <li key={g.group} data-volume-group={g.group}>{MUSCLE_GROUP_LABELS[g.group] ?? g.group} : {String(Math.round(g.planned * 10) / 10)} séries{g.target !== null ? ` · repère ${String(g.target)}` : ''}{g.target !== null && g.planned < g.target ? ' (en dessous)' : ''}</li>
        ))}
      </ul>
    </div>
  );
}

/** Semaine Musculation : volume et signaux de récupération (Programme). */
export function StrengthWeekCard({ weekStart }: { weekStart: string }) {
  const { state } = useStore();
  const w = strengthWeekInsights(state, weekStart);
  if (!w || w.sessions.length === 0) return null;
  return (
    <>
      <WeekVolumeCard volume={w.volume} />
      {w.recovery.length > 0 && (
        <div className="card" aria-label="Récupération entre séances de force" data-week-recovery>
          <h3>Récupération entre séances de force</h3>
          <ul className="small" style={{ margin: 0 }}>{w.recovery.map((r) => <li key={`${r.first.requestId}${r.second.requestId}`}>{recoveryText(r)}</li>)}</ul>
        </div>
      )}
    </>
  );
}
