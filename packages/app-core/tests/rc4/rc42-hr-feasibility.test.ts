/**
 * RC4.2 — faisabilité des types de séance HYROX, LUE DU MOTEUR RÉEL (sonde `hyroxRoleFeasibility`) : niveaux ×
 * préréglages de matériel × types. Rapport régénéré à chaque exécution ; aucune table n'est écrite, aucune règle du
 * moteur HYROX n'est modifiée.
 */
import { describe, expect, it } from 'vitest';
import { createBeta0Programme, emptyState, ensureBeta0Week, EQUIPMENT_PRESETS, HR_ROLE_LABELS, hyroxRoleFeasibility, selectBeta0Week } from '../../src/index.js';
import type { HrRoleFeasibility, ProfileInput } from '../../src/index.js';
import { clock, profile } from '../fixtures.js';

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
// technical-constant: TEST_ONLY — disponibilités des profils RC4 (minutes, lundi → dimanche)
const AVAIL = [75, 60, 75, 60, 75, 90, 60];
const SC = 'hybrid_race.h2.station_capacity';
const MSC = 'hybrid_race.h2.mixed_station_conditioning';
const CR = 'hybrid_race.h2.compromised_running';
const hrProfile = (presetId: string, level: (typeof LEVELS)[number], hyrox: Partial<ProfileInput['hyrox']> = {}): ProfileInput => {
  const pr = EQUIPMENT_PRESETS.find((x) => x.id === presetId);
  return profile({
    level, priorities: ['hyrox'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 }, running: { ...profile().running, enabled: false },
    hyrox: { enabled: true, sessionsPerWeek: 1, focus: 'balanced', goal: 'RACE_PREPARATION', returnState: 'NONE', ...hyrox } as ProfileInput['hyrox'],
    equipment: { presetId, items: [...(pr?.equipment ?? [])] }, availability: AVAIL,
  });
};
const MATRIX = LEVELS.flatMap((level) => EQUIPMENT_PRESETS.map((pr) => ({ level, preset: pr.id, cells: hyroxRoleFeasibility(hrProfile(pr.id, level), clock('2026-10-07')) })));
const at = (level: string, preset: string, role: string) => MATRIX.find((r) => r.level === level && r.preset === preset)?.cells.find((c) => c.role === role);
const cell = (c: HrRoleFeasibility) => (c.status === 'feasible' ? '✅' : c.status === 'unknown' ? '?' : `❌ ${c.factors.join('+') || 'non attribuable'}`);

describe('RC4.2 — faisabilité HYROX lue du moteur', () => {
  it('matrice niveaux × matériel × types (rapport régénéré)', async () => {
    const roles = Object.keys(HR_ROLE_LABELS);
    const lines = [
      '# RC4.2 — Faisabilité des types de séance HYROX (sonde du moteur réel)', '',
      'Profil HYROX seul, 1 séance/semaine, type imposé, objectif « Préparer une course », disponibilités des profils RC4, sans coupure.',
      'Chaque case = planification réelle (programme → planificateur → moteur HYROX). ❌ : facteurs lus dans la trace du moteur.', '',
      `| niveau | matériel | ${roles.map((i) => HR_ROLE_LABELS[i]?.title ?? i).join(' | ')} |`,
      `|---|---|${roles.map(() => '---').join('|')}|`,
      ...MATRIX.map((r) => `| ${r.level} | ${r.preset.replace('preset.', '')} | ${r.cells.map(cell).join(' | ')} |`), '',
    ];
    await expect(lines.join('\n')).toMatchFileSnapshot('./__reports__/hr-feasibility.md');
  });

  it('aucun « inconnu » sur un profil complet ; chaque refus porte la cause décisive du moteur', () => {
    for (const r of MATRIX) for (const c of r.cells) {
      expect(c.status, `${r.level} ${r.preset} ${c.role}`).not.toBe('unknown');
      if (c.status === 'infeasible') expect(c.cause?.code).toMatch(/HYROX|PLANNER|FEASIBILITY/);
    }
  });

  it('constats RC4 (F12) : débutant ⇒ aucun type (niveau, jamais « coupure ») ; intermédiaire équipé ⇒ tous ; avancé ⇒ restrictions stations et temps', () => {
    for (const pr of EQUIPMENT_PRESETS) for (const role of Object.keys(HR_ROLE_LABELS)) {
      const c = at('beginner', pr.id, role);
      expect(c?.status).toBe('infeasible');
      expect(c?.cause?.code).toBe('SAFETY.HYROX.LEVEL_NOT_ELIGIBLE');
      expect(c?.factors).toEqual(['level']);
    }
    for (const role of Object.keys(HR_ROLE_LABELS)) expect(at('intermediate', 'preset.hybrid_race_gym', role)?.status).toBe('feasible');
    expect(at('intermediate', 'preset.bodyweight', SC)?.status).toBe('feasible');
    expect(at('intermediate', 'preset.bodyweight', MSC)?.factors).toEqual(['equipment']);
    expect(at('advanced', 'preset.hybrid_race_gym', SC)?.status).toBe('feasible');
    expect(at('advanced', 'preset.hybrid_race_gym', MSC)?.factors).toEqual(['equipment']);
    expect(at('advanced', 'preset.hybrid_race_gym', CR)?.factors).toEqual(['time']);
  });

  it('cohérence avec la planification réelle : type irréalisable ⇒ séance bloquée ; réalisable ⇒ composée', () => {
    for (const [preset, level] of [['preset.hybrid_race_gym', 'advanced'], ['preset.bodyweight', 'intermediate'], ['preset.full_gym', 'beginner']] as const) {
      for (const c of MATRIX.find((r) => r.level === level && r.preset === preset)?.cells ?? []) {
        const s = createBeta0Programme(emptyState(), hrProfile(preset, level, { sessionsPerWeek: 2, focus: 'specialized', role: c.role }), clock('2026-10-05'), {});
        const hx = (selectBeta0Week(s, '2026-10-05')?.sessions ?? []).filter((x) => x.sport === 'hyrox');
        expect(hx.some((x) => x.placement !== 'blocked'), `${preset} ${level} ${c.role}`).toBe(c.status === 'feasible');
      }
    }
  });

  it('mode Équilibré (avancé, 3/sem., 4 semaines) : chaque séance non composée correspond à un type annoncé impossible', () => {
    const p = hrProfile('preset.hybrid_race_gym', 'advanced', { sessionsPerWeek: 3 });
    const ko = new Set(hyroxRoleFeasibility(p, clock('2026-10-05')).filter((c) => c.status === 'infeasible').map((c) => c.role));
    let s = createBeta0Programme(emptyState(), p, clock('2026-10-05'), {});
    const blockedRoles: string[] = [];
    for (const mon of ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']) {
      s = ensureBeta0Week(s, clock(mon));
      for (const x of (selectBeta0Week(s, mon)?.sessions ?? []).filter((v) => v.sport === 'hyrox' && v.placement === 'blocked')) blockedRoles.push(String(x.notPlanned?.reason?.params.role ?? '?'));
    }
    expect(blockedRoles.length).toBeGreaterThan(0);
    for (const r of blockedRoles) expect(ko.has(`hybrid_race.h2.${r}`) || ko.has(r), r).toBe(true);
  });

  it('coupure déclarée : refus attribué à la coupure ; sonde pure et indépendante du jour', () => {
    const cut = hyroxRoleFeasibility(hrProfile('preset.hybrid_race_gym', 'intermediate', { returnState: 'LONG' }), clock('2026-10-07'));
    for (const c of cut) { expect(c.status).toBe('infeasible'); expect(c.factors).toContain('safety'); }
    const p = hrProfile('preset.bodyweight', 'advanced');
    const before = JSON.stringify(p);
    expect(hyroxRoleFeasibility(p, clock('2026-10-11'))).toEqual(hyroxRoleFeasibility(p, clock('2026-10-05')));
    expect(JSON.stringify(p)).toBe(before);
  });
});
