import { useState } from 'react';
import { programmeWeekIndex, RUNNING_GOAL_LABELS, STRENGTH_GOAL_LABELS } from '@hybridsport/app-core';
import { useStore } from '../../store.js';
import { formatDate, Notice } from '../../ui.js';
import { sportName } from '../../present.js';
import { ExperimentalBadge } from './common.js';
import { Setup } from './Setup.js';

export function Programme0() {
  const { state, clock } = useStore();
  const [editing, setEditing] = useState(false);
  const ps = state.programmeState;
  const p = state.profile;
  if (!ps || !p) return null;
  if (editing) return <Setup initial={p} mode="recreate" onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />;
  const d = ps.definition;
  const i = programmeWeekIndex(state, clock().today) ?? -1;
  const goalText = (g: (typeof d.goals)[number]): string => (g.sport === 'strength' ? STRENGTH_GOAL_LABELS[g.goal] : g.sport === 'running' ? RUNNING_GOAL_LABELS[g.goal] : undefined) ?? '';
  return (
    <div className="screen">
      <div className="row between"><h1 className="screen-title">Programme</h1><ExperimentalBadge /></div>
      <Notice tone="sim">Certaines règles de planification sont encore en cours de validation. Les séances ne sont pas des recommandations établies.</Notice>
      <div className="card">
        <div className="row between"><strong>Semaine actuelle</strong><span className="num">{i >= 0 && i < d.horizonWeeks ? `${String(i + 1)} / ${String(d.horizonWeeks)}` : '—'}</span></div>
        <div className="small muted">Début : {formatDate(d.startWeek)} · {String(d.horizonWeeks)} semaines</div>
      </div>
      {d.priorities.map((sp, k) => {
        const plan = d.sports.find((x) => x.sport === sp);
        const goal = d.goals.find((g) => g.sport === sp);
        return (
          <div key={sp} className="card">
            <div className="row between"><h3>{sportName(sp)}</h3>{d.priorities.length > 1 && <span className="badge neutral">Priorité {String(k + 1)}</span>}</div>
            <div className="small muted">Objectif : {goal ? goalText(goal) : '—'}{goal && 'targetDate' in goal && goal.targetDate ? ` · le ${formatDate(goal.targetDate)}` : ''}</div>
            <div className="small muted">{String(plan?.sessionsPerWeek ?? 0)} séance{(plan?.sessionsPerWeek ?? 0) > 1 ? 's' : ''} par semaine{plan?.composition === 'engine' ? ' · composition de la semaine par le moteur Course' : ''}</div>
          </div>
        );
      })}
      <div className="section-title">Modifier</div>
      <p className="small muted" style={{ margin: 0 }}>Changer de sports, d’objectifs, de fréquence ou de disponibilités recrée le programme. Votre historique est conservé.</p>
      <button className="btn secondary" onClick={() => setEditing(true)}>Modifier et recréer le programme</button>
    </div>
  );
}
