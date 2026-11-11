import { SOBER_V3 } from '../../sober/flag.js';
import { PLAYFIELD_V4 } from '../../playfield/flag.js';
import { REKKA_V2, RekkaBrand, SportLinks } from '../../rekka/visual.js';
import { confirmEquipment, equipmentLabel, equipmentNeedsConfirmation, EQUIPMENT_PRESETS, programmeStatusAt, selectProgrammeSession, weekdayIndex } from '@hybridsport/app-core';
import { useStore } from '../../store.js';
import { formatDate, Notice, weekdayShort } from '../../ui.js';
import { isDone, sessionName, sportName, STATUS_LABELS } from '../../present.js';
import { nextOf, placedOf, RunningTestFallbackNotice, SessionCard0, weekOf, WeekPlanningNotice } from './common.js';
import type { DayItemView } from './common.js';
import { SportIcon } from '../../design/SportIcon.js';

export function PainPause({ onGo }: { onGo: () => void }) {
  return (
    <Notice tone="danger">
      <div className="stack">
        <strong>La planification automatique est suspendue car une douleur a été signalée.</strong>
        <span>Consultez un professionnel de santé si elle persiste. Quand elle a disparu, levez la pause dans les réglages.</span>
        <button className="btn secondary" onClick={onGo}>Ouvrir les réglages</button>
      </div>
    </Notice>
  );
}

/**
 * P1 — profil antérieur dont le matériel n'a jamais été confirmé (ancienne présélection) : demande de confirmation,
 * rien n'est écrasé ni replanifié ; « Modifier » ouvre l'assistant de modification du programme.
 */
export function EquipmentConfirm({ onEdit }: { onEdit: () => void }) {
  const store = useStore();
  if (!equipmentNeedsConfirmation(store.state)) return null;
  const e = store.state.profile?.equipment;
  const name = EQUIPMENT_PRESETS.find((x) => x.id === e?.presetId)?.name ?? 'Matériel personnalisé';
  return (
    <Notice tone="warn">
      <div className="stack" data-equipment-confirm>
        <strong>Vérifiez votre matériel</strong>
        <span>Vos séances supposent : {name}. KAIRO ne doit jamais supposer qu’une machine est disponible.</span>
        <details className="k-details"><summary>Matériel déclaré ({String(e?.items.length ?? 0)})</summary><p className="small" style={{ margin: 0 }}>{(e?.items ?? []).map((id) => equipmentLabel(id)).sort((a, b) => a.localeCompare(b, 'fr')).join(' · ')}</p></details>
        <div className="row wrap">
          <button className="btn primary" onClick={() => store.apply((s, c) => confirmEquipment(s, c))}>C’est bien mon matériel</button>
          <button className="btn secondary" onClick={onEdit}>Modifier mon matériel</button>
        </div>
      </div>
    </Notice>
  );
}

/** Explication quand la semaine courante n'a pas de séance planifiée (programme pas commencé, terminé, pause). */
export function NoWeek({ today }: { today: string }) {
  const { state } = useStore();
  const ps = state.programmeState;
  if (!ps) return null;
  const situation = programmeStatusAt(state, today);
  const ended = situation === 'ended';
  const text = situation === 'not_started' ? `Votre programme commence le ${formatDate(ps.definition.startWeek)}.`
    : ended ? 'Votre objectif est atteint : le programme est terminé. Vous pouvez en créer un nouveau depuis l’onglet Programme.'
      : state.safety.activePain ? 'Aucune séance n’est planifiée cette semaine tant que la pause douleur est active.'
        : 'Aucune séance n’a pu être planifiée cette semaine.';
  return <div className="card"><h3>Pas de séance cette semaine</h3><p className="small muted" style={{ margin: 0 }}>{text}</p></div>;
}

/** Résumé textuel du mini-calendrier (les états ne sont jamais portés par la seule couleur). */
const stripSummary = (days: readonly DayItemView[]): string => {
  const marked = days.filter((d) => d.sessions.length > 0).map((d) => `${formatDate(d.date)} : ${d.sessions.map((x) => `${sportName(x.sport)}, ${STATUS_LABELS[x.display]}`).join(' ; ')}`);
  return marked.length > 0 ? marked.join('. ') : 'Aucune séance cette semaine.';
};

function PlayfieldKpiIcon({ kind }: { kind:'calendar'|'target'|'sports' }) {
  const common={width:23,height:23,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2.2,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true as const};
  if(kind==='calendar')return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/><path d="m8 15 2 2 4-4"/></svg>;
  if(kind==='target')return <svg {...common}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3"/><path d="M12 2v3M22 12h-3"/></svg>;
  return <svg {...common}><path d="M5 17v4M10 12v9M15 7v14M20 3v18"/><path d="M3 17h4M8 12h4M13 7h4M18 3h4"/></svg>;
}

export function Home0({ onOpen, onGo, onEditProgramme }: { onOpen: (id: string) => void; onGo: (t: 'plan' | 'settings' | 'programme') => void; onEditProgramme?: () => void }) {
  const { state, clock } = useStore();
  const today = clock().today;
  const week = weekOf(state, today);
  const planned = placedOf(week?.days ?? []);
  const next = nextOf(planned, today);
  const detail = next && PLAYFIELD_V4 ? selectProgrammeSession(state, next.requestId) : null;
  const plannedSets = detail?.sport === 'strength'
    ? detail.session.blocks.filter(b=>!['warmup','cooldown'].includes(b.kind))
        .flatMap(b=>b.items.flatMap(item=>item.prescription.type==='sets'
          ? item.prescription.sets.map((_,setIndex)=>({itemId:item.id,setIndex})) : []))
    : [];
  const heroProgress = plannedSets.length
    ? {total:plannedSets.length,done:plannedSets.filter(s=>detail?.log?.sets.some(log=>log.itemId===s.itemId&&log.setIndex===s.setIndex&&log.done)).length}
    : null;
  const done = planned.filter((x) => isDone(x.display)).length;
  const name = state.profile?.displayName;
  const sportStats = (['strength', 'running', 'hyrox', 'crosstraining'] as const).map(sport => {
    const sessions = planned.filter(s => s.sport === sport);
    return { sport, total: sessions.length, done: sessions.filter(s => isDone(s.display)).length };
  }).filter(s => s.total > 0);
  const weeklyPercent = planned.length > 0 ? Math.round((done / planned.length) * 100) : 0;
  // Pause douleur : aucune nouvelle séance (politique app-core) ; la reprise d'une séance commencée reste proposée.
  const paused = state.safety.activePain !== null;
  const extra = (week?.items ?? []).filter((x) => x.placement === 'composed_unplaced' && (x.display === 'not_planned' || x.display === 'in_progress'));
  return (
    <div className={`screen ${SOBER_V3 ? "v3-home" : ""}`}>
      <div className="hero">
        {REKKA_V2 ? <RekkaBrand /> : <div className="hero-brand">KAI<span>RO</span></div>}
        {PLAYFIELD_V4 && <div className="pf-greeting"><h1>Bonjour, {name?.trim() || 'sportif'} <span aria-hidden="true">👋</span></h1><p>Prêt pour ta séance ?</p></div>}
        {SOBER_V3 && <button className="v3-home-settings" aria-label="Paramètres" onClick={()=>onGo('settings')}>⚙</button>}
        <p className="small">{formatDate(today)}</p>
        {!SOBER_V3 && <h1>{name ? `${name}, ` : ''}{next ? (next.date === today ? 'c’est le moment.' : 'prochaine séance.') : 'rien de prévu.'}</h1>}
        <div className={SOBER_V3 ? "v3-today" : undefined}>{next && <SessionCard0 v={next} onOpen={onOpen} highlight hero={PLAYFIELD_V4} heroProgress={heroProgress} />}
        {next && (
          <button className="btn primary block" onClick={() => onOpen(next.requestId)}>
            {next.display === 'in_progress' ? 'Reprendre la séance' : next.date === today && !paused ? 'Commencer la séance' : `Voir la séance${next.date === today ? '' : ` de ${formatDate(next.date ?? today).split(' ')[0] ?? ''}`}`}
          </button>
        )}
      </div></div>

      {PLAYFIELD_V4 && planned.length > 0 && <section className="pf-home-metrics pf-board-metrics" aria-label="Statistiques réelles de la semaine">
        <div><span className="pf-metric-icon pf-metric-blue"><PlayfieldKpiIcon kind="calendar"/></span><strong>{done}<span>/{planned.length}</span></strong><small>séances réalisées</small></div>
        <div><span className="pf-metric-icon pf-metric-gold"><PlayfieldKpiIcon kind="target"/></span><strong>{weeklyPercent}<span> %</span></strong><small>objectif hebdo</small></div>
        <div><span className="pf-metric-icon pf-metric-coral"><PlayfieldKpiIcon kind="sports"/></span><strong>{sportStats.length}</strong><small>sports planifiés</small></div>
      </section>}
      {REKKA_V2 && !PLAYFIELD_V4 && <SportLinks onPlanning={() => onGo('plan')} />}
      {/* FIELD TEST — séances composées mais non placées : visibles sans remplacer la séance prévue. */}
      {extra.length > 0 && (
        <div className="card" aria-label="Séances supplémentaires disponibles" data-extra={extra.length}>
          <strong>{extra.length === 1 ? '1 séance supplémentaire disponible' : `${String(extra.length)} séances supplémentaires disponibles`}</strong>
          <span className="tiny muted">Non planifiée faute de créneau compatible. Consultez les contraintes et avertissements avant de choisir un autre jour.</span>
          {extra.map((x) => (
            <button key={x.requestId} className="btn secondary" onClick={() => onOpen(x.requestId)}>
              {x.display === 'in_progress' ? 'Reprendre' : 'Voir'} : {sportName(x.sport)} · {sessionName(x.sport, x.archetypeId, x.dataError)}
            </button>
          ))}
        </div>
      )}

      <EquipmentConfirm onEdit={() => onEditProgramme?.()} />
      {state.safety.activePain && <PainPause onGo={() => onGo('settings')} />}
      {week && <WeekPlanningNotice planning={week.planning} />}
      {week?.planning?.status === 'stale_replaceable' && <Notice><span role="status">Un nouveau planning est proposé pour cette semaine. Rien n’est modifié sans votre accord : ouvrez le Planning pour comparer.</span></Notice>}
      {week && <RunningTestFallbackNotice fallback={week.runningTestFallback} />}

      {week && planned.length > 0 && (
        <div className="card" aria-label="Progression de la semaine">
          <div className="row between"><strong>Cette semaine</strong><button type="button" className="pf-week-detail" onClick={() => onGo(PLAYFIELD_V4?'programme':'plan')}>Voir le détail ›</button><span className="num">{done} / {planned.length} séances</span></div>
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={planned.length} aria-valuenow={done} aria-label="Séances terminées"><div style={{ width: `${String(Math.round((done / planned.length) * 100))}%` }} /></div>
          {PLAYFIELD_V4 && <div className="pf-week-sports" aria-label="Répartition réelle des séances prévues">
             {sportStats.map(({ sport, total, done: doneSport }) => <div className="pf-week-sport" key={sport} data-sport={sport}>
               <span className="pf-week-name"><SportIcon sport={sport} label={false}/>{sportName(sport)}</span><strong>{doneSport}/{total}</strong>
               <div className="pf-week-sport-bar" aria-hidden="true"><span style={{ width: `${total ? Math.round(doneSport / total * 100) : 0}%` }} /></div>
             </div>)}
           </div>}
           <button className="weekstrip" style={{ background: 'none', border: 0, padding: 0 }} onClick={() => onGo('plan')} aria-label={`Ouvrir le planning. ${stripSummary(week.days)}`}>
            {week.days.map(({ date: d, sessions: s }) => (
              <div key={d} data-date={d} data-sessions={s.length} className={`c ${s.length > 0 ? 'has' : ''} ${d === today ? 'today' : ''}`} aria-hidden="true">
                <div className="tiny">{weekdayShort(weekdayIndex(d))}</div>
                <div className="num" style={{ fontWeight: 800 }}>{Number(d.slice(8))}</div>
                {s.length > 0
                  ? <div className="dots">{s.map((x) => <span key={x.requestId} className={`dot st-${x.display}`} title={STATUS_LABELS[x.display]} />)}</div>
                  : <div className="dot off" />}
              </div>
            ))}
          </button>
        </div>
      )}
      {!next && week && planned.length > 0 && <div className="card"><h3>Semaine bouclée</h3><p className="small muted" style={{ margin: 0 }}>Plus aucune séance prévue cette semaine. La suivante sera préparée lundi.</p></div>}
      {(!week || planned.length === 0) && <NoWeek today={today} />}
    </div>
  );
}
