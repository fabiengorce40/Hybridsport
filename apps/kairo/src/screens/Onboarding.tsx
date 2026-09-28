import { useState } from 'react';
import { completeOnboarding, normalizeInstant, SPORT_LABELS } from '@hybridsport/app-core';
import type { ProfileInput } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { AvailabilitySection, defaultProfile, EquipmentSection, GoalsSection, SportsSection } from '../ProfileForm.js';
import { Notice } from '../ui.js';

const STEPS = ['Bienvenue', 'Sports', 'Objectifs', 'Disponibilités', 'Matériel'];

export function Onboarding() {
  const store = useStore();
  const [step, setStep] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [p, setP] = useState<ProfileInput>(() => defaultProfile(normalizeInstant(store.clock().now)));
  const set = (f: (x: ProfileInput) => ProfileInput) => setP(f);
  const anySport = p.strength.enabled || p.running.enabled || p.crosstraining.enabled || p.hyrox.enabled;
  const canNext = step === 0 ? accepted : step === 1 ? anySport : step === 3 ? p.availability.some((m) => m > 0) : true;
  const finish = () => store.apply((s, c) => completeOnboarding(s, { ...p, acceptedProvisionalAt: normalizeInstant(c.now) }, c));

  return (
    <div className="screen" style={{ paddingBottom: 120 }}>
      {step === 0 ? (
        <div className="hero" style={{ minHeight: 300 }}>
          <div className="hero-brand">KAI<span>RO</span></div>
          <h1>Entraîne-toi.<br />Sans rien inventer.</h1>
          <p>Musculation, course, cross-training, HYROX : un planning construit par des moteurs d’entraînement, pas par des formules improvisées.</p>
        </div>
      ) : (
        <>
          <div className="steps" aria-hidden="true">{STEPS.slice(1).map((s, i) => <span key={s} className={i < step ? 'on' : ''} />)}</div>
          <h1 className="screen-title">{STEPS[step]}</h1>
        </>
      )}

      {step === 0 && (
        <div className="stack-3">
          <Notice tone="warn">
            <div className="stack">
              <strong>Version V0 — contenu provisoire</strong>
              <span>Les séances de musculation viennent d’un moteur testé, mais ses valeurs (séries, répétitions, repos, charges) et ses règles de sécurité sont <b>provisoires et non validées par des experts</b>.</span>
              <span>Les séances de course sont une <b>simulation</b> (valeurs candidates non approuvées). Cross-training et HYROX ne sont pas encore disponibles.</span>
              <span>KAIRO ne remplace pas un avis médical. En cas de douleur, arrêtez et consultez.</span>
              <span>Vos données restent sur cet appareil (pas de compte, pas de synchronisation).</span>
            </div>
          </Notice>
          <label className="check"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />J’ai compris que les séances sont provisoires ou simulées, et je m’entraîne sous ma responsabilité.</label>
        </div>
      )}
      {step === 1 && <SportsSection p={p} set={set} />}
      {step === 2 && (
        <>
          <label className="field">Prénom (facultatif)<input type="text" value={p.displayName} maxLength={40} onChange={(e) => setP({ ...p, displayName: e.target.value })} /></label>
          <GoalsSection p={p} set={set} />
          {!p.strength.enabled && !p.running.enabled && <Notice tone="warn">Les sports choisis n’ont pas encore de moteur : aucun planning ne pourra être généré. Ajoutez la musculation ou la course pour démarrer.</Notice>}
        </>
      )}
      {step === 3 && (
        <>
          <p className="muted small">Temps disponible par jour. Une séance au plus par jour ; jamais plus longue que ce temps.</p>
          <AvailabilitySection p={p} set={set} />
        </>
      )}
      {step === 4 && (
        <>
          <EquipmentSection p={p} set={set} />
          <div className="card">
            <h3>Récapitulatif</h3>
            <div className="small muted">{(['strength', 'running', 'crosstraining', 'hyrox'] as const).filter((s) => p[s].enabled).map((s) => SPORT_LABELS[s]).join(' · ')}</div>
            <div className="small muted">{String(p.availability.filter((m) => m > 0).length)} jours disponibles · {String(p.availability.reduce((a, b) => a + b, 0))} min par semaine</div>
          </div>
        </>
      )}

      <div className="row" style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 'min(520px, 100%)', padding: '12px 16px calc(12px + env(safe-area-inset-bottom))', background: 'rgba(11,11,13,0.95)', borderTop: '1px solid var(--border)' }}>
        {step > 0 && <button className="btn secondary" onClick={() => setStep(step - 1)}>Retour</button>}
        {step < STEPS.length - 1
          ? <button className="btn primary block" disabled={!canNext} onClick={() => setStep(step + 1)}>{step === 0 ? 'Commencer' : 'Continuer'}</button>
          : <button className="btn primary block" onClick={finish}>Générer mon planning</button>}
      </div>
    </div>
  );
}
