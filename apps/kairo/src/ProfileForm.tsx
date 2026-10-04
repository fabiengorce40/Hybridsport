/**
 * Formulaire de profil (onboarding et édition) : sports, objectifs, niveau, disponibilités, matériel.
 * Les listes proposées proviennent des données (niveaux CORE, populations et objectifs Running, préréglages
 * et matériel du catalogue) ; les minutes proposées sont de simples choix de saisie.
 */
import { useState } from 'react';
import {
  EQUIPMENT_PRESETS, equipmentLabel, LEVEL_LABELS, RETURN_STATE_LABELS, RUNNING_GOAL_LABELS, RUNNING_LEVEL_LABELS, SPORT_LABELS, STRENGTH_GOAL_LABELS,
} from '@hybridsport/app-core';
import type { ProfileInput, Sport } from '@hybridsport/app-core';
import { Notice, WEEKDAY_NAMES } from './ui.js';

const MINUTE_CHOICES = [0, 30, 45, 60, 75, 90, 120];
const ALL_EQUIPMENT = [...new Set(EQUIPMENT_PRESETS.flatMap((p) => p.equipment))].sort((a, b) => equipmentLabel(a).localeCompare(equipmentLabel(b), 'fr'));
const SESSION_CHOICES = [1, 2, 3, 4, 5, 6];

export function defaultProfile(acceptedAt: string): ProfileInput {
  const gym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym') ?? EQUIPMENT_PRESETS[0];
  return {
    displayName: '', level: 'beginner', priorities: [],
    strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
    running: { enabled: false, population: 'P_R1', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
    crosstraining: { enabled: false }, hyrox: { enabled: false },
    equipment: { presetId: gym?.id ?? '', items: [...(gym?.equipment ?? [])] },
    availability: [60, 0, 60, 0, 60, 90, 0], excludedExercises: [], acceptedProvisionalAt: acceptedAt,
  };
}

type Setter = (f: (p: ProfileInput) => ProfileInput) => void;

export function SportsSection({ p, set }: { p: ProfileInput; set: Setter }) {
  const toggle = (s: Sport) => set((x) => {
    const enabled = !x[s].enabled;
    return { ...x, [s]: { ...x[s], enabled }, priorities: enabled ? [...x.priorities.filter((y) => y !== s), s] : x.priorities.filter((y) => y !== s) };
  });
  const status: Record<Sport, string> = {
    strength: 'Séances complètes — contenu provisoire',
    running: 'Simulation : footing, test, séances de qualité — après une course enregistrée',
    crosstraining: 'Indisponible : aucune règle validée',
    hyrox: 'Indisponible : aucune règle validée',
  };
  return (
    <div className="stack">
      {(['strength', 'running', 'crosstraining', 'hyrox'] as const).map((s) => (
        <button key={s} type="button" className={`option ${p[s].enabled ? 'on' : ''}`} onClick={() => toggle(s)} aria-pressed={p[s].enabled}>
          <div>
            <div className="t">{SPORT_LABELS[s]}{p[s].enabled && p.priorities.length > 1 ? ` · priorité ${String(p.priorities.indexOf(s) + 1)}` : ''}</div>
            <div className="tiny">{status[s]}</div>
          </div>
        </button>
      ))}
      {p.priorities.length > 1 && <div className="tiny">L’ordre de sélection fixe la priorité quand les jours manquent.</div>}
    </div>
  );
}

export function GoalsSection({ p, set, beta0 = false }: { p: ProfileInput; set: Setter; beta0?: boolean }) {
  return (
    <div className="stack-3">
      <label className="field">Niveau d’entraînement général
        <select value={p.level} onChange={(e) => set((x) => ({ ...x, level: e.target.value as ProfileInput['level'] }))}>
          {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      {p.strength.enabled && (
        <div className="card">
          <h3>Musculation</h3>
          <div className="row wrap">
            {Object.entries(STRENGTH_GOAL_LABELS).map(([k, v]) => (
              <button type="button" key={k} className={`chip ${p.strength.goal === k ? 'on' : ''}`} onClick={() => set((x) => ({ ...x, strength: { ...x.strength, goal: k as ProfileInput['strength']['goal'] } }))}>{v}</button>
            ))}
          </div>
          <label className="field">Séances par semaine
            <select value={p.strength.sessionsPerWeek} onChange={(e) => set((x) => ({ ...x, strength: { ...x.strength, sessionsPerWeek: Number(e.target.value) } }))}>
              {SESSION_CHOICES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
      )}
      {p.running.enabled && (
        <div className="card">
          <h3>Course à pied</h3>
          <div className="stack">
            {Object.entries(RUNNING_LEVEL_LABELS).map(([k, v]) => (
              <button type="button" key={k} className={`option ${p.running.population === k ? 'on' : ''}`} onClick={() => set((x) => ({ ...x, running: { ...x.running, population: k as ProfileInput['running']['population'] } }))}>
                <div><div className="t">{v.title}</div><div className="tiny">{v.detail}</div></div>
              </button>
            ))}
          </div>
          <label className="field">Objectif
            <select value={p.running.goal} onChange={(e) => set((x) => ({ ...x, running: { ...x.running, goal: e.target.value as ProfileInput['running']['goal'] } }))}>
              {Object.entries(RUNNING_GOAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="field">Séances par semaine
            <select value={p.running.sessionsPerWeek} onChange={(e) => set((x) => ({ ...x, running: { ...x.running, sessionsPerWeek: Number(e.target.value) } }))}>
              {SESSION_CHOICES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="field">Coupure récente de la course
            <select value={p.running.returnState} onChange={(e) => set((x) => ({ ...x, running: { ...x.running, returnState: e.target.value as ProfileInput['running']['returnState'] } }))}>
              {Object.entries(RETURN_STATE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          {p.running.returnState !== 'NONE' && (
            <label className="field">Date de reprise
              <input type="text" inputMode="numeric" placeholder="AAAA-MM-JJ" value={p.running.returnStartedAt ?? ''}
                onChange={(e) => set((x) => { const v = e.target.value.trim(); const { returnStartedAt: _, ...rest } = x.running; return { ...x, running: v ? { ...rest, returnStartedAt: v } : rest }; })} />
            </label>
          )}
          <label className="check"><input type="checkbox" checked={p.running.wearable} onChange={(e) => set((x) => ({ ...x, running: { ...x.running, wearable: e.target.checked } }))} />Je cours avec une montre GPS</label>
          <label className="check"><input type="checkbox" checked={p.running.hills === true} onChange={(e) => set((x) => ({ ...x, running: { ...x.running, hills: e.target.checked } }))} />J’ai accès à une côte praticable</label>
          {!beta0 && (p.strength.enabled || p.crosstraining.enabled || p.hyrox.enabled) && (
            <Notice tone="warn">Course + autre sport : le moteur course refuse pour l’instant de programmer (planificateur multisport non validé). Les refus seront affichés tels quels.</Notice>
          )}
          {p.running.population === 'P_R0' && <Notice tone="warn">Débutant en course : la dose de départ n’est pas encore validée ; aucune séance de course ne sera proposée.</Notice>}
        </div>
      )}
    </div>
  );
}

export function AvailabilitySection({ p, set }: { p: ProfileInput; set: Setter }) {
  return (
    <div className="days-grid">
      {WEEKDAY_NAMES.map((name, i) => (
        <div key={name} style={{ display: 'contents' }}>
          <div>{name}</div>
          <select aria-label={`Temps disponible le ${name}`} value={p.availability[i] ?? 0} onChange={(e) => set((x) => ({ ...x, availability: x.availability.map((m, j) => (j === i ? Number(e.target.value) : m)) }))} style={{ width: 130 }}>
            {MINUTE_CHOICES.map((m) => <option key={m} value={m}>{m === 0 ? 'Repos' : `${String(m)} min`}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

export function EquipmentSection({ p, set }: { p: ProfileInput; set: Setter }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="stack-3">
      <label className="field">Lieu d’entraînement
        <select value={p.equipment.presetId} onChange={(e) => {
          const preset = EQUIPMENT_PRESETS.find((x) => x.id === e.target.value);
          if (preset) set((x) => ({ ...x, equipment: { presetId: preset.id, items: [...preset.equipment] } }));
        }}>
          {EQUIPMENT_PRESETS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </label>
      <button type="button" className="btn secondary" onClick={() => setOpen(!open)}>{open ? 'Masquer le détail' : `Ajuster le matériel (${String(p.equipment.items.length)})`}</button>
      {open && (
        <div className="stack">
          {ALL_EQUIPMENT.map((id) => (
            <label className="check" key={id}>
              <input type="checkbox" checked={p.equipment.items.includes(id)} onChange={(e) => set((x) => ({ ...x, equipment: { ...x.equipment, items: e.target.checked ? [...x.equipment.items, id].sort() : x.equipment.items.filter((y) => y !== id) } }))} />
              {equipmentLabel(id)}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
