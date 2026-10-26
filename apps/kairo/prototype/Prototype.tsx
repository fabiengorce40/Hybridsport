/**
 * REKKA V2 — prototype visuel isolé (lot V2-2) : Accueil, Planning (liste / grille), Séance Musculation (phases,
 * chronomètre global), Progression. Navigation Accueil / Planning / Séances / Progression / Profil. Données de
 * DÉMONSTRATION uniquement (demo-data.ts) : aucune lecture ni écriture de l'état de l'application, aucun moteur appelé.
 * L'état local (séries cochées, chronomètre) disparaît au rechargement : c'est une maquette, pas une fonctionnalité.
 */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { SportIcon, SPORT_NAMES } from '../src/design/SportIcon.js';
import type { SportKey } from '../src/design/SportIcon.js';
import { athlete, DEMO_NOTICE, progression, quests, STATE_LABELS, STATE_MARKS, todayLabel, week, workout } from './demo-data.js';
import type { DemoExercise, DemoSession, DemoSet } from './demo-data.js';

export type ProtoTab = 'home' | 'plan' | 'sessions' | 'progress' | 'profile';
const TABS: readonly { id: ProtoTab; label: string; icon: string }[] = [
  { id: 'home', label: 'Accueil', icon: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { id: 'plan', label: 'Planning', icon: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4' },
  { id: 'sessions', label: 'Séances', icon: 'M6 4h12v16H6zM9 8h6M9 12h6M9 16h4' },
  { id: 'progress', label: 'Progression', icon: 'M4 19V9M10 19V5M16 19v-7M22 19H2' },
  { id: 'profile', label: 'Profil', icon: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6' },
];

const two = (n: number) => String(n).padStart(2, '0');
const clock = (s: number) => `${String(Math.floor(s / 60))}:${two(s % 60)}`;
const kg = (n: number) => String(n).replace('.', ',');

function DemoBanner() {
  return <div className="r-demo-banner" role="note" data-demo-banner>{DEMO_NOTICE}</div>;
}

/** Logo REKKA provisoire (texte) : le logo final est une ressource graphique à fournir. */
function Wordmark() {
  return (
    <div className="p-brand" aria-label="REKKA, Nourris ta flamme">
      <span className="p-wordmark" aria-hidden="true">REKKA</span>
      <span className="p-kanji" aria-hidden="true">烈火</span>
      <span className="r-badge demo" data-placeholder="logo">Logo provisoire</span>
    </div>
  );
}

function TabBar({ tab, onChange }: { tab: ProtoTab; onChange: (t: ProtoTab) => void }) {
  return (
    <nav className="r-tabbar" aria-label="Navigation principale">
      {TABS.map((t) => (
        <button key={t.id} type="button" className="r-tab" aria-current={t.id === tab ? 'page' : undefined} onClick={() => onChange(t.id)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.icon} /></svg>
          {t.label}
        </button>
      ))}
    </nav>
  );
}

function StateTag({ s }: { s: DemoSession['state'] }) {
  return <span className={`p-state ${s}`} data-state={s}><span aria-hidden="true">{STATE_MARKS[s]}</span> {STATE_LABELS[s]}</span>;
}

// ——— Accueil

function Home({ onStart, onGo }: { onStart: () => void; onGo: (t: ProtoTab) => void }) {
  const done = week.flatMap((d) => d.sessions).filter((s) => s.state === 'done').length;
  const total = week.flatMap((d) => d.sessions).filter((s) => s.state !== 'cancelled').length;
  return (
    <main className="r-screen" aria-label="Accueil">
      <Wordmark />
      <section className="r-hero placeholder" aria-label="Bannière REKKA">
        <span className="r-badge demo r-placeholder-tag" data-placeholder="illustration">Illustration provisoire</span>
        <span className="r-eyebrow">{todayLabel}</span>
        <h1 className="r-h1">Salut {athlete.name},<br /><span className="p-neon">nourris ta flamme.</span></h1>
      </section>

      <section className="r-card accent" aria-label="Séance du jour" data-sport="strength">
        <div className="r-row between"><span className="r-eyebrow">Séance du jour</span><span className="r-badge" data-sport="strength">Musculation</span></div>
        <div className="r-row" style={{ gap: 12 }}>
          <SportIcon sport="strength" />
          <div className="r-stack" style={{ gap: 2 }}>
            <h2 className="r-h2">{workout.title}</h2>
            <span className="r-text-2 r-num">≈ {workout.plannedMin} min · 3 exercices · 14 séries</span>
          </div>
        </div>
        <button type="button" className="r-btn primary block" onClick={onStart}>Commencer la séance</button>
      </section>

      <section className="r-card" aria-label="Ma semaine">
        <div className="r-row between"><h3 className="r-h3">Ma semaine</h3><button type="button" className="r-btn ghost" onClick={() => onGo('plan')}>Planning</button></div>
        <div className="p-weekstrip">
          {week.map((d) => {
            const s = d.sessions[0];
            return (
              <div key={d.day} className={`p-daycell ${s?.state ?? 'rest'}`} {...(s ? { 'data-sport': s.sport } : {})} aria-label={`${d.day} ${d.date} : ${s ? `${SPORT_NAMES[s.sport]}, ${STATE_LABELS[s.state]}` : 'repos'}`}>
                <span className="p-dayname">{d.day}</span>
                <span className="p-daydot" aria-hidden="true">{s ? STATE_MARKS[s.state] : '–'}</span>
              </div>
            );
          })}
        </div>
        <div className="r-progress" role="progressbar" aria-label="Séances réalisées cette semaine" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}><i style={{ width: `${String(Math.round((done / total) * 100))}%` }} /></div>
        <span className="r-text-3 r-num">{done} / {total} séances réalisées</span>
      </section>

      <section aria-label="Disciplines" className="p-sports">
        {(['strength', 'running', 'hyrox', 'crosstraining'] as const).map((sp) => {
          const next = week.flatMap((d) => d.sessions.map((s) => ({ d, s }))).find(({ s }) => s.sport === sp && s.state !== 'done' && s.state !== 'cancelled');
          return (
            <button key={sp} type="button" className="r-card p-sport" data-sport={sp} onClick={() => onGo('plan')}>
              <SportIcon sport={sp} label={false} />
              <b>{SPORT_NAMES[sp]}</b>
              <span className="r-text-3">{next ? `${next.d.day} · ${next.s.title}` : 'Rien de prévu'}</span>
            </button>
          );
        })}
      </section>

      <section className="r-stack" aria-label="Objectifs en cours">
        <h3 className="r-h3">Quêtes en cours</h3>
        {quests.map((q) => <Quest key={q.id} q={q} />)}
      </section>
    </main>
  );
}

function Quest({ q }: { q: (typeof quests)[number] }) {
  return (
    <article className="r-card r-quest" data-sport={q.sport} aria-label={`Quête : ${q.title}`}>
      <SportIcon sport={q.sport} />
      <div className="r-stack" style={{ gap: 6 }}>
        <b>{q.title}</b>
        <span className="r-text-3">{q.detail}</span>
        <div className="r-milestones" aria-label={`Jalons atteints : ${String(q.reached)} sur ${String(q.milestones.length)}`}>
          {q.milestones.map((m, i) => <i key={m} className={i < q.reached ? 'on' : ''} title={m} />)}
        </div>
        <span className="r-text-3 r-num">{q.milestones.map((m, i) => `${i < q.reached ? '✓ ' : ''}${m}`).join(' · ')}</span>
      </div>
    </article>
  );
}

// ——— Planning

function Planning({ onOpen }: { onOpen: () => void }) {
  const [view, setView] = useState<'list' | 'grid'>('list');
  return (
    <main className="r-screen" aria-label="Planning">
      <div className="r-row between">
        <div className="r-stack" style={{ gap: 0 }}><span className="r-eyebrow">Semaine du 26 octobre</span><h1 className="r-h1">Planning</h1></div>
      </div>
      <div className="r-row" role="group" aria-label="Affichage du planning">
        <button type="button" className="r-chip" aria-pressed={view === 'list'} onClick={() => setView('list')}>Liste</button>
        <button type="button" className="r-chip" aria-pressed={view === 'grid'} onClick={() => setView('grid')}>Grille</button>
        <span className="r-text-3" style={{ marginLeft: 'auto' }}>‹ Semaine ›</span>
      </div>
      <Legend />
      {view === 'list' ? (
        <div className="r-stack" data-view="list">
          {week.map((d) => (
            <section key={d.day} className="r-stack" aria-label={`${d.day} ${d.date}`} style={{ gap: 6 }}>
              <span className="r-eyebrow">{d.day} {d.date}</span>
              {d.sessions.length === 0 && <div className="p-rest">Repos</div>}
              {d.sessions.map((s) => (
                <button key={s.id} type="button" className={`r-card p-mission ${s.state}`} data-sport={s.sport} onClick={s.sport === 'strength' ? onOpen : undefined} aria-label={`${SPORT_NAMES[s.sport]} : ${s.title}, ${STATE_LABELS[s.state]}`}>
                  <div className="r-row" style={{ gap: 12 }}>
                    <SportIcon sport={s.sport} label={false} />
                    <div className="r-stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                      <b className="p-mission-title">{s.title}</b>
                      <span className="r-text-3 r-num">{SPORT_NAMES[s.sport]} · ≈ {s.minutes} min{s.note ? ` · ${s.note}` : ''}</span>
                    </div>
                    <StateTag s={s.state} />
                  </div>
                </button>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="p-grid" data-view="grid" role="table" aria-label="Semaine en grille">
          {week.map((d) => (
            <div key={d.day} className="p-grid-row" role="row">
              <span className="p-grid-day" role="rowheader">{d.day}<small>{d.date}</small></span>
              <div className="p-grid-cells" role="cell">
                {d.sessions.length === 0 ? <span className="p-rest">Repos</span> : d.sessions.map((s) => (
                  <span key={s.id} className={`p-grid-cell ${s.state}`} data-sport={s.sport}>
                    <SportIcon sport={s.sport} label={false} />
                    <span className="p-grid-text"><b>{s.title}</b><small>{STATE_MARKS[s.state]} {STATE_LABELS[s.state]} · {s.minutes} min</small></span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function Legend() {
  return (
    <div className="p-legend" aria-label="Légende des états">
      {(['done', 'today', 'planned', 'moved', 'cancelled'] as const).map((s) => <StateTag key={s} s={s} />)}
    </div>
  );
}

// ——— Séance Musculation

const PHASE_TITLES: Readonly<Record<DemoSet['kind'], string>> = { warmup: 'Montée en charge', work: 'Séries de travail', backoff: 'Retour en charge (back-off)' };
const PHASE_NOTES: Readonly<Record<DemoSet['kind'], string>> = { warmup: 'approche · hors volume et progression', work: 'comptent pour la progression', backoff: 'charge réduite après le travail' };

function phases(sets: readonly DemoSet[]): { kind: DemoSet['kind']; idx: number[] }[] {
  const out: { kind: DemoSet['kind']; idx: number[] }[] = [];
  sets.forEach((s, i) => { const last = out.at(-1); if (last?.kind === s.kind) last.idx.push(i); else out.push({ kind: s.kind, idx: [i] }); });
  return out;
}

function Workout({ onBack }: { onBack: () => void }) {
  const [done, setDone] = useState<ReadonlySet<string>>(new Set(['squat.0', 'squat.1']));
  const [elapsed, setElapsed] = useState(12 * 60 + 4);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return undefined;
    const t = setInterval(() => setElapsed((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [paused]);
  const all = workout.exercises.flatMap((e) => e.sets.map((_, i) => `${e.id}.${String(i)}`));
  const toggle = (k: string) => setDone((d) => { const n = new Set(d); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const current = all.find((k) => !done.has(k));
  return (
    <main aria-label="Séance Musculation" className="p-workout">
      <header className="r-topbar">
        <button type="button" className="r-btn ghost" onClick={onBack} aria-label="Retour">←</button>
        <div className="r-clock" data-proto-clock aria-label={`Chronomètre de séance (simulation) ${clock(elapsed)}${paused ? ', en pause' : ''}`}>
          <span>{paused ? 'Séance en pause' : 'Séance'}</span><b>{clock(elapsed)}</b><span>/ ≈ {workout.plannedMin} min</span>
        </div>
        <button type="button" className="r-chip" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>{paused ? 'Reprendre' : 'Pause séance'}</button>
      </header>
      <div className="r-screen" style={{ minHeight: 0 }}>
        <div className="r-stack" style={{ gap: 4 }}>
          <span className="r-eyebrow">Musculation · {todayLabel}</span>
          <h1 className="r-h1">{workout.title}</h1>
          <span className="r-text-2 r-num">≈ {workout.plannedMin} min · {done.size}/{all.length} séries</span>
          <div className="r-progress" role="progressbar" aria-label="Séries validées" aria-valuemin={0} aria-valuemax={all.length} aria-valuenow={done.size}><i style={{ width: `${String(Math.round((done.size / all.length) * 100))}%` }} /></div>
        </div>
        {workout.exercises.map((e, n) => <ExerciseCard key={e.id} e={e} n={n + 1} done={done} current={current} onToggle={toggle} />)}
        <button type="button" className="r-btn secondary block">Terminer la séance</button>
      </div>
      <div className="p-rest-dock" role="timer" aria-label="Chrono de repos (simulation)">
        <span className="r-eyebrow" style={{ color: 'var(--r-cyan)' }}>Repos</span><b className="r-num">1:24</b><span className="r-text-3">Squat barre</span>
      </div>
    </main>
  );
}

function ExerciseCard({ e, n, done, current, onToggle }: { e: DemoExercise; n: number; done: ReadonlySet<string>; current: string | undefined; onToggle: (k: string) => void }) {
  let work = 0; let warm = 0; let back = 0;
  const labels = e.sets.map((s) => (s.kind === 'warmup' ? `Montée ${String(++warm)}` : s.kind === 'backoff' ? `Back-off ${String(++back)}` : `Série ${String(++work)}`));
  return (
    <section className="r-card" aria-label={`Exercice ${two(n)} : ${e.name}`}>
      <div className="r-row" style={{ alignItems: 'baseline', gap: 10 }}>
        <span className="p-exnum">{two(n)}</span>
        <div className="r-stack" style={{ gap: 2 }}><h2 className="r-h2">{e.name}</h2><span className="r-text-3">{work} séries de travail · repos {e.rest}</span></div>
      </div>
      {phases(e.sets).map((p) => (
        <div key={`${e.id}.${p.kind}`} className="r-phase" data-phase={p.kind} role="group" aria-label={`${PHASE_TITLES[p.kind]}, ${e.name}`}>
          <div className="r-phase-head">
            <b>{PHASE_TITLES[p.kind]}</b><span>{p.idx.length} série{p.idx.length > 1 ? 's' : ''} · {PHASE_NOTES[p.kind]}</span>
            {p.kind === 'work' && e.adapted && <span className="r-badge" data-adapted-tag>Adaptée</span>}
          </div>
          {p.kind === 'work' && e.adapted && <div className="p-adapt">{e.adapted}</div>}
          {p.kind === 'backoff' && e.illustrative && <div className="p-adapt" data-illustrative>{e.illustrative}</div>}
          {p.idx.map((i) => {
            const s = e.sets[i] as DemoSet;
            const k = `${e.id}.${String(i)}`;
            const state = done.has(k) ? 'done' : current === k ? 'current' : 'todo';
            return (
              <div key={k} className="r-set" data-state={state} data-kind={s.kind} {...(state === 'current' ? { 'aria-current': 'step' as const } : {})}>
                <div className="r-set-label"><b>{labels[i]}</b><span>{state === 'current' ? 'en cours' : state === 'done' ? 'validée' : `obj. ${String(s.reps)}`}</span></div>
                <div className="r-set-value"><b>{s.reps}</b><small>REPS</small></div>
                <div className="r-set-value"><b>{kg(s.kg)}</b><small>KG</small></div>
                <button type="button" className="r-set-check" aria-pressed={state === 'done'} aria-label={`${state === 'done' ? 'Décocher' : 'Cocher'} ${labels[i] ?? ''}, ${e.name}`} onClick={() => onToggle(k)}>✓</button>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}

// ——— Progression

function LineChart() {
  const { loads, weeks, label } = progression.squat;
  const W = 320; const H = 140; const pad = 28;
  const min = Math.min(...loads) - 5; const max = Math.max(...loads) + 5;
  const x = (i: number) => pad + (i * (W - pad - 8)) / (loads.length - 1);
  const y = (v: number) => H - pad - ((v - min) * (H - pad - 10)) / (max - min);
  const d = loads.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <figure className="p-chart" aria-label={`${label} : de ${kg(loads[0] ?? 0)} à ${kg(loads.at(-1) ?? 0)} kg en 8 semaines`}>
      <svg viewBox={`0 0 ${String(W)} ${String(H)}`} role="img" aria-hidden="true">
        {[0, 1, 2].map((g) => { const v = min + ((max - min) * g) / 2; return <g key={g}><line x1={pad} x2={W - 8} y1={y(v)} y2={y(v)} className="p-gridline" /><text x={4} y={y(v) + 4} className="p-axis">{Math.round(v)}</text></g>; })}
        <path d={`${d} L${x(loads.length - 1).toFixed(1)},${String(H - pad)} L${String(pad)},${String(H - pad)} Z`} className="p-area" />
        <path d={d} className="p-line" />
        {loads.map((v, i) => <circle key={weeks[i]} cx={x(i)} cy={y(v)} r={i === loads.length - 1 ? 5 : 3} className={i === loads.length - 1 ? 'p-dot last' : 'p-dot'} />)}
        {weeks.map((w, i) => <text key={w} x={x(i) - 8} y={H - 8} className="p-axis">{w}</text>)}
      </svg>
      <figcaption className="r-text-3">{label}</figcaption>
    </figure>
  );
}

function Progress() {
  const [sport, setSport] = useState<SportKey>('strength');
  return (
    <main className="r-screen" aria-label="Progression">
      <div className="r-stack" style={{ gap: 0 }}><span className="r-eyebrow">8 dernières semaines</span><h1 className="r-h1">Progression</h1></div>
      <div className="r-row p-scroll-x" role="group" aria-label="Discipline">
        {(['strength', 'running', 'hyrox', 'crosstraining'] as const).map((sp) => <button key={sp} type="button" className="r-chip" aria-pressed={sport === sp} onClick={() => setSport(sp)}>{SPORT_NAMES[sp]}</button>)}
      </div>
      {sport === 'strength' ? (
        <>
          <section className="p-stats" aria-label="Chiffres clés">
            <div className="r-card r-stat"><b>+12,5</b><span>kg au squat</span></div>
            <div className="r-card r-stat"><b>25</b><span>séances</span></div>
            <div className="r-card r-stat"><b>86 %</b><span>régularité</span></div>
          </section>
          <section className="r-card" aria-label="Évolution des charges"><LineChart /></section>
        </>
      ) : (
        <section className="r-card" aria-label="Indicateur indisponible" data-unavailable>
          <b>{SPORT_NAMES[sport]} : {sport === 'running' ? 'graphique des allures à venir' : 'aucun résultat enregistré'}</b>
          <span className="r-text-3">Indicateur non disponible dans le prototype. REKKA n’affiche jamais de chiffre sans séance réelle derrière.</span>
        </section>
      )}
      <section className="r-card" aria-label="Records confirmés">
        <h3 className="r-h3">Records confirmés</h3>
        {progression.records.map((r) => (
          <div key={r.label} className="r-row between p-record" data-sport={r.sport}>
            <span className="r-row"><SportIcon sport={r.sport} /><span className="r-stack" style={{ gap: 0 }}><b>{r.label}</b><span className="r-text-3">{r.when}</span></span></span>
            <span className="r-badge record r-num">{r.value}</span>
          </div>
        ))}
      </section>
      <section className="r-card" aria-label="Régularité">
        <h3 className="r-h3">Régularité</h3>
        <div className="p-reg" role="list">
          {progression.regularity.map(([d, p], i) => (
            <div key={`w${String(i)}`} role="listitem" className="p-reg-week" aria-label={`Semaine ${String(i + 1)} : ${String(d)} séances sur ${String(p)}`}>
              <i style={{ height: `${String(Math.round((d / p) * 100))}%` }} className={d === p ? 'full' : ''} />
              <small>S{i + 1}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="r-stack" aria-label="Jalons">
        <h3 className="r-h3">Jalons</h3>
        {progression.badges.map((b) => (
          <article key={b.id} className={`r-card p-badge ${b.earned ? 'earned' : 'locked'}`} aria-label={`${b.title} : ${b.earned ? 'obtenu' : 'à venir'}`}>
            <span className="p-badge-mark" aria-hidden="true">{b.earned ? '★' : '☆'}</span>
            <span className="r-stack" style={{ gap: 2 }}><b>{b.title}</b><span className="r-text-3">{b.detail}</span></span>
            <span className={`r-badge ${b.earned ? 'success' : ''}`}>{b.earned ? 'Obtenu' : 'À venir'}</span>
          </article>
        ))}
      </section>
    </main>
  );
}

// ——— Écrans hors prototype

function Sessions({ onOpen }: { onOpen: () => void }) {
  const all = week.flatMap((d) => d.sessions.map((s) => ({ d, s })));
  return (
    <main className="r-screen" aria-label="Séances">
      <h1 className="r-h1">Séances</h1>
      <p className="r-text-2" style={{ margin: 0 }}>Regroupera les séances à venir et l’historique (écran existant conservé, refonte dans un lot ultérieur).</p>
      {all.map(({ d, s }) => (
        <button key={s.id} type="button" className="r-card p-mission" data-sport={s.sport} onClick={s.sport === 'strength' ? onOpen : undefined}>
          <div className="r-row" style={{ gap: 12 }}><SportIcon sport={s.sport} label={false} /><span className="r-stack" style={{ gap: 2, flex: 1 }}><b>{s.title}</b><span className="r-text-3">{d.day} {d.date} · {SPORT_NAMES[s.sport]}</span></span><StateTag s={s.state} /></div>
        </button>
      ))}
    </main>
  );
}

function Profile() {
  return (
    <main className="r-screen" aria-label="Profil">
      <h1 className="r-h1">Profil</h1>
      <div className="r-card"><b>Hors prototype</b><span className="r-text-2">Regroupera profil, objectifs, disciplines, matériel, préférences, données et version. Les écrans existants (Programme, Réglages, Profil Course) sont conservés jusqu’à leur refonte.</span></div>
    </main>
  );
}

export function Prototype({ initial = 'home' }: { initial?: ProtoTab | 'workout' }) {
  const [tab, setTab] = useState<ProtoTab>(initial === 'workout' ? 'home' : initial);
  const [inWorkout, setInWorkout] = useState(initial === 'workout');
  useEffect(() => { window.scrollTo?.(0, 0); }, [tab, inWorkout]);
  let body: ReactNode;
  if (inWorkout) body = <Workout onBack={() => setInWorkout(false)} />;
  else if (tab === 'home') body = <Home onStart={() => setInWorkout(true)} onGo={setTab} />;
  else if (tab === 'plan') body = <Planning onOpen={() => setInWorkout(true)} />;
  else if (tab === 'progress') body = <Progress />;
  else if (tab === 'sessions') body = <Sessions onOpen={() => setInWorkout(true)} />;
  else body = <Profile />;
  return (
    <div className="p-app">
      <DemoBanner />
      {body}
      {!inWorkout && <TabBar tab={tab} onChange={setTab} />}
    </div>
  );
}
