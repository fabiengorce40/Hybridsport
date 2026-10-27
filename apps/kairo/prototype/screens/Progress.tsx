/**
 * REKKA V2 — Progression du prototype (lot V2-2B) : filtres discipline et période, tuiles de mesures, évolution des
 * charges, records confirmés, jalons (RPG modéré, fondés sur des faits sportifs). En production, seuls les records
 * VÉRIFIÉS sont affichés ; sans donnée, l'indicateur est déclaré « non disponible ». Données de démonstration.
 */
import { useEffect, useRef, useState } from 'react';
import { SportIcon, SPORT_NAMES } from '../../src/design/SportIcon.js';
import type { SportKey } from '../../src/design/SportIcon.js';
import { MaskIcon, UI_ICONS } from '../../src/design/assets.js';
import { GoalProgress, MilestoneCard } from '../../src/design/Milestones.js';
import { Ambience } from '../art/Ambience.js';
import { progression, squatSeries } from '../demo-data.js';
import type { Period } from '../demo-data.js';

const PERIODS: readonly { id: Period; label: string }[] = [{ id: '4w', label: '4 semaines' }, { id: '3m', label: '3 mois' }, { id: '1y', label: '1 an' }];
const kg = (n: number) => String(n).replace('.', ',');

function Chart({ period }: { period: Period }) {
  const { labels, loads } = squatSeries[period];
  const W = 320; const H = 170; const L = 30; const B = 22; const T = 10; const R = 10;
  const min = 40; const max = 100;
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, loads.length - 1);
  const y = (v: number) => T + ((max - v) * (H - T - B)) / (max - min);
  const d = loads.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <figure className="p-chart2" aria-label={`Squat barre, charge de travail : de ${kg(loads[0] ?? 0)} à ${kg(loads.at(-1) ?? 0)} kg`}>
      <svg viewBox={`0 0 ${String(W)} ${String(H)}`} aria-hidden="true">
        <defs><linearGradient id="p-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dcff35" stopOpacity="0.32" /><stop offset="1" stopColor="#dcff35" stopOpacity="0" /></linearGradient></defs>
        {[40, 60, 80, 100].map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="p-gridline" /><text x={4} y={y(v) + 4} className="p-axis">{v}</text></g>)}
        <path d={`${d} L${x(loads.length - 1).toFixed(1)},${String(H - B)} L${String(L)},${String(H - B)} Z`} fill="url(#p-area)" />
        <path d={d} className="p-line" />
        {loads.map((v, i) => <circle key={labels[i]} cx={x(i)} cy={y(v)} r={i === loads.length - 1 ? 5 : 3.2} className={i === loads.length - 1 ? 'p-dot last' : 'p-dot'} />)}
        {labels.map((l, i) => <text key={l} x={x(i)} y={H - 6} textAnchor="middle" className="p-axis">{l}</text>)}
      </svg>
    </figure>
  );
}

const SPORTS = ['strength', 'running', 'hyrox', 'crosstraining'] as const;

/**
 * V2-2C — filtres de discipline défilables, défilement RENDU ÉVIDENT : puce suivante coupée, fondu, et bouton « › »
 * (44 px) tant qu'il reste des disciplines à droite ; « ‹ » pour revenir. Les boutons disparaissent sans débordement.
 */
const motion = (): ScrollBehavior => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

function SportChips({ sport, onChange }: { sport: SportKey; onChange: (s: SportKey) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const sync = () => setEdges({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => { el.removeEventListener('scroll', sync); window.removeEventListener('resize', sync); };
  }, []);
  const step = (dir: 1 | -1) => ref.current?.scrollBy?.({ left: dir * ref.current.clientWidth * 0.7, behavior: motion() });
  return (
    <div className="p-chips-wrap" data-start={edges.start} data-end={edges.end}>
      <div ref={ref} className="p-chips" role="group" aria-label="Discipline" data-scroll-x>
        {SPORTS.map((sp) => <button key={sp} type="button" className="r-chip" aria-pressed={sport === sp} onClick={(e) => { onChange(sp); e.currentTarget.scrollIntoView?.({ inline: 'nearest', block: 'nearest', behavior: motion() }); }}>{SPORT_NAMES[sp]}</button>)}
      </div>
      {!edges.start && <button type="button" className="p-chips-arrow prev" aria-label="Disciplines précédentes" onClick={() => step(-1)}>‹</button>}
      {!edges.end && <button type="button" className="p-chips-arrow next" aria-label="Disciplines suivantes" onClick={() => step(1)}>›</button>}
    </div>
  );
}

export function Progress() {
  const [sport, setSport] = useState<SportKey>('strength');
  const [period, setPeriod] = useState<Period>('3m');
  return (
    <main className="p-page" aria-label="Progression">
      <header className="p-page-head">
        <Ambience art="objectifs" />
        <h1 className="p-page-title">Progression</h1>
      </header>
      <div className="p-page-body">
        <SportChips sport={sport} onChange={setSport} />
        <div className="p-segment three" role="group" aria-label="Période">
          {PERIODS.map((p) => <button key={p.id} type="button" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>{p.label}</button>)}
        </div>
        {sport === 'strength' ? (
          <>
            <section className="p-metrics" aria-label="Chiffres clés">
              <div className="p-metric"><b className="r-num">{squatSeries[period].gain}</b><span>kg · squat</span><i aria-hidden="true" className="up">↗</i></div>
              <div className="p-metric"><b className="r-num">25</b><span>séances</span><i aria-hidden="true">▮▮▮</i></div>
              <div className="p-metric"><b className="r-num">86 %</b><span>régularité</span><i aria-hidden="true" className="ring" /></div>
            </section>
            <section className="p-card" aria-label="Évolution des charges">
              <h2 className="p-card-title">Évolution des charges</h2>
              <span className="r-text-3">Squat barre · charge de travail (kg)</span>
              <Chart period={period} />
            </section>
          </>
        ) : (
          <section className="p-card" aria-label="Indicateur indisponible" data-unavailable>
            <b>{SPORT_NAMES[sport]} : {sport === 'running' ? 'courbe des allures à venir' : 'aucun résultat enregistré'}</b>
            <span className="r-text-3">Indicateur non disponible. REKKA n’affiche jamais de chiffre sans séance réelle derrière.</span>
          </section>
        )}
        <section className="p-card" aria-label="Records confirmés">
          <div className="r-row between"><h2 className="p-card-title"><MaskIcon src={UI_ICONS.record} className="p-title-icon" />Records confirmés</h2><button type="button" className="r-btn ghost p-link" aria-label="Voir tous les records (simulation)">Voir tous</button></div>
          {progression.records.map((r) => (
            <div key={r.label} className="p-record2" data-sport={r.sport}>
              <SportIcon sport={r.sport} />
              <span className="p-record2-text"><b>{r.label}</b><span>{r.when}</span></span>
              <b className="p-record2-value r-num">{r.value}</b>
            </div>
          ))}
          <span className="r-text-3 p-fine">En production : seulement des records issus de séances réelles à effort saisi.</span>
        </section>
        <section className="p-card" aria-label="Objectifs vérifiés">
          <h2 className="p-card-title">Objectifs</h2>
          <div className="p-goals">{progression.goals.map((g) => <GoalProgress key={g.id} goal={g} />)}</div>
          <span className="r-text-3 p-fine">Une progression ne s’affiche que si des séances réelles la mesurent.</span>
        </section>
        <section className="p-card" aria-label="Jalons">
          <h2 className="p-card-title">Jalons</h2>
          {progression.badges.map((b) => <MilestoneCard key={b.id} m={b} />)}
        </section>
      </div>
    </main>
  );
}
