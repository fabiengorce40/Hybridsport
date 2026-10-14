/**
 * RC3.5 — lecteur de séance Course. Affiche l'étape en cours (temps restant si elle est en durée, temps écoulé si elle
 * est en distance) et la suivante ; Lancer / Pause / Reprendre / Étape suivante (ou « Distance faite ») ; signal par
 * vibration et son au changement d'étape, quand le navigateur le permet. La position est DÉRIVÉE de l'état persisté
 * (app-core) et de l'heure : l'intervalle ne sert qu'à rafraîchir l'affichage. Le lecteur n'enregistre jamais la
 * séance : seule « Terminer la séance » le fait, avec la saisie de l'utilisateur.
 */
import { useEffect, useRef, useState } from 'react';
import { advanceRunPlayer, controlRunPlayer, durationLabel, exerciseLabel, runPlayerPosition } from '@hybridsport/app-core';
import type { ExecutionStep, ProgrammeSessionView, RunPlayerPosition } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { formatChrono } from './duration.js';
import { RECOVERY_MODES, targetLine } from '../screens/Session.js';

// technical-constant: rafraîchissement de l'affichage (ms), jamais une source de temps
const REFRESH_MS = 250;
// technical-constant: motif de vibration au changement d'étape (ms)
const VIBRATION = [300, 120, 300];
// technical-constant: bip au changement d'étape (fréquence Hz, durée s, volume)
const BEEP = { hz: 880, s: 0.25, gain: 0.2 };
// technical-constant: pourcentage (barre de progression)
const PERCENT = 100;
// technical-constant: mètres par kilomètre (affichage)
const M_PER_KM = 1000;
const SOUND_KEY = 'kairo.runPlayer.sound';

export function doseText(d: ExecutionStep['dose']): string {
  if ('durationS' in d) return durationLabel(d.durationS);
  return d.distanceM >= M_PER_KM ? `${String(d.distanceM / M_PER_KM)} km` : `${String(d.distanceM)} m`;
}

/** Libellé d'une étape (structure du CORE seulement : aucune valeur sportive ajoutée). */
export function stepTitle(s: ExecutionStep, steps: readonly ExecutionStep[], test: boolean): string {
  const { phase, rep, set } = s.address;
  if (phase === 'recovery') return `Récupération ${RECOVERY_MODES[s.recoveryMode ?? ''] ?? ''}`.trim();
  if (phase === 'between_sets') return `Récupération entre séries ${RECOVERY_MODES[s.recoveryMode ?? ''] ?? ''}`.trim();
  if (phase === 'work') {
    const reps = steps.filter((x) => x.segmentId === s.segmentId && x.address.set === set && x.address.phase === 'work').length;
    const sets = new Set(steps.filter((x) => x.segmentId === s.segmentId).map((x) => x.address.set)).size;
    const label = s.segmentKind === 'preparation' ? 'Préparation' : 'Répétition';
    return `${label} ${String(rep)} / ${String(reps)}${sets > 1 ? ` · série ${String(set)} / ${String(sets)}` : ''}`;
  }
  if (s.segmentKind === 'warmup') return 'Échauffement';
  if (s.segmentKind === 'cooldown') return 'Retour au calme';
  return test ? 'Test' : 'Course continue';
}

function readSound(): boolean {
  try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; }
}

type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } };

/** Garde l'écran allumé pendant que le lecteur tourne, si le navigateur le permet (sinon : rien, et on le dit). */
function useWakeLock(active: boolean): 'on' | 'unsupported' | 'off' {
  const supported = typeof navigator !== 'undefined' && (navigator as WakeLockNavigator).wakeLock !== undefined;
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!active || !supported) return undefined;
    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;
    const acquire = () => {
      if (document.visibilityState !== 'visible') return;
      (navigator as WakeLockNavigator).wakeLock?.request('screen').then((s) => {
        if (cancelled) { void s.release(); return; }
        sentinel = s;
        setHeld(true);
      }).catch(() => setHeld(false));
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      if (sentinel) void sentinel.release();
      setHeld(false);
    };
  }, [active, supported]);
  if (!supported) return 'unsupported';
  return held ? 'on' : 'off';
}

type AudioWindow = Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };

export function RunPlayer({ v, steps, test, onFinish }: { v: ProgrammeSessionView; steps: readonly ExecutionStep[]; test: boolean; onFinish: () => void }) {
  const store = useStore();
  const [, setTick] = useState(0);
  const [sound, setSound] = useState(readSound);
  const audio = useRef<AudioContext | null>(null);
  const shown = useRef<number | null>(null);
  const manual = useRef(false);
  const rp = v.log?.runPlayer;
  const pos: RunPlayerPosition = runPlayerPosition(rp, steps, store.clock().now);
  const wake = useWakeLock(pos.running && !pos.allStepsPassed);
  useEffect(() => {
    if (!pos.running) return undefined;
    const t = setInterval(() => setTick((x) => x + 1), REFRESH_MS);
    return () => clearInterval(t);
  }, [pos.running]);

  // Signal au changement d'étape par l'échéance (jamais au premier affichage ni après un appui de l'utilisateur).
  useEffect(() => {
    const prev = shown.current;
    shown.current = pos.index;
    if (prev === null || prev === pos.index) return;
    if (manual.current) { manual.current = false; return; }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(VIBRATION);
    const ctx = audio.current;
    if (sound && ctx) {
      try {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = BEEP.hz;
        g.gain.value = BEEP.gain;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + BEEP.s);
      } catch { /* son indisponible : la vibration et l'affichage restent */ }
    }
  }, [pos.index, sound]);

  // Le son exige un geste de l'utilisateur : le contexte audio est créé au lancement ou à la reprise.
  const unlockAudio = () => {
    const w = window as AudioWindow;
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor || audio.current) return;
    try { audio.current = new Ctor(); } catch { audio.current = null; }
  };
  const control = (a: 'start' | 'pause' | 'resume') => {
    if (a !== 'pause') unlockAudio();
    store.apply((s, c) => controlRunPlayer(s, c, v.requestId, a));
  };
  const advance = (key: string) => {
    manual.current = true;
    if (!store.apply((s, c) => advanceRunPlayer(s, c, v.requestId, key))) manual.current = false;
  };
  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    try { localStorage.setItem(SOUND_KEY, next ? 'on' : 'off'); } catch { /* préférence non conservée */ }
  };

  const step = pos.step;
  const distance = step !== null && 'distanceM' in step.dose;
  const replaced = v.adaptation?.changes.find((c) => c.startsWith('added:'))?.slice('added:'.length);
  const exercise = v.session.blocks.flatMap((b) => b.items).find((i) => i.prescription.type === 'run_structure')?.exerciseId;
  const done = pos.allStepsPassed;
  const label = !pos.started ? 'PRÊT' : !pos.running ? 'EN PAUSE' : distance ? 'TEMPS ÉCOULÉ' : 'TEMPS RESTANT';
  const big = step === null ? formatChrono(pos.activeS) : distance ? formatChrono(pos.elapsedInStepS) : formatChrono(pos.remainingS ?? 0);
  return (
    <section className="k-hr k-run-player stack-3" aria-label="Lecteur de séance" data-run-player>
      <div className="stack" style={{ gap: 6 }}>
        <div className="k-hr-count num" aria-live="polite" data-run-step-count>{done ? `Toutes les étapes sont passées · ${String(steps.length)} / ${String(steps.length)}` : `Étape ${String(pos.index + 1)} / ${String(steps.length)}`}</div>
        <div className="k-progress" aria-hidden="true"><i style={{ width: `${String(Math.round((pos.index / steps.length) * PERCENT))}%` }} /></div>
      </div>
      {replaced !== undefined && exercise !== undefined && <div className="tiny" data-run-exercise>Séance adaptée au contrôle avant séance : {exerciseLabel(exercise)}, même structure.</div>}
      {step !== null ? (
        <div className={`k-hr-now ${step.address.phase === 'recovery' || step.address.phase === 'between_sets' ? 'run' : ''}`} aria-label="Étape en cours" data-run-step={step.key}>
          <div className="k-hr-now-kind">Maintenant</div>
          <div className="k-hr-now-name">{stepTitle(step, steps, test)}</div>
          <div className="k-hr-now-dose num">{doseText(step.dose)}</div>
          {step.target && <div className="k-hr-now-note">{targetLine(step.target, test && step.segmentKind === 'steady')}</div>}
          {distance && <div className="k-hr-now-note" data-run-distance-note>Distance non mesurée par l’application : appuyez sur « Distance faite » à l’arrivée{test ? ' (le temps affiché vous servira de repère pour le temps du test)' : ''}.</div>}
        </div>
      ) : (
        <div className="k-hr-now done" aria-label="Étape en cours">
          <div className="k-hr-now-kind">Fin du déroulé</div>
          <div className="k-hr-now-name">Toutes les étapes sont passées</div>
          <div className="k-hr-now-note">La séance n’est pas encore enregistrée : terminez-la pour indiquer ce que vous avez réellement fait.</div>
        </div>
      )}
      <div className="k-ct-clock" role="timer" aria-live="off" aria-label="Chrono de l’étape">
        <div className="k-ct-clock-label">{done ? 'TEMPS ACTIF' : label}</div>
        <div className="k-ct-clock-big num" data-run-clock>{big}</div>
        <div className="k-ct-clock-sub num">Temps actif {formatChrono(pos.activeS)} · hors pauses</div>
      </div>
      {pos.next && <div className="small muted" data-run-next>Ensuite : {stepTitle(pos.next, steps, test)} · {doseText(pos.next.dose)}</div>}
      {!pos.started ? (
        <button className="k-cta" onClick={() => control('start')}>Lancer le minuteur</button>
      ) : (
        <div className="row">
          {!done && <button className="k-cta ghost k-hr-back" onClick={() => control(pos.running ? 'pause' : 'resume')}>{pos.running ? 'Pause' : 'Reprendre'}</button>}
          {step !== null && <button className="k-cta" onClick={() => advance(step.key)}>{distance ? 'Distance faite' : 'Étape suivante'}</button>}
        </div>
      )}
      <button className={`k-cta ${done ? '' : 'ghost'}`} onClick={onFinish}>Terminer la séance</button>
      <div className="row wrap" style={{ gap: 8, alignItems: 'center' }}>
        <button type="button" className={`chip ${sound ? 'on' : ''}`} style={{ minHeight: 44 }} aria-pressed={sound} onClick={toggleSound}>Son {sound ? 'activé' : 'coupé'}</button>
        <span className="tiny muted" data-run-wake>{wake === 'on' ? 'Écran maintenu allumé pendant la séance.' : wake === 'unsupported' ? 'Ce navigateur ne peut pas garder l’écran allumé : si l’écran se verrouille, signaux retardés ; le chrono, lui, reste juste.' : 'Si l’écran se verrouille, les signaux peuvent être retardés ; le chrono reste juste.'}</span>
      </div>
    </section>
  );
}
