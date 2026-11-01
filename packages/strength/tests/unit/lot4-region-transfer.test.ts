/**
 * Reprise RC5 lot 4 — moteur Strength : régions d'archétype (seule lecture des noms), orientation Bas A / Bas B, zones
 * prioritaires placées selon la région (variantes A/B comprises), reprise FIABLE d'un suivi (D5) — jamais en cas
 * d'ambiguïté, jamais une performance inventée, suivi d'origine inchangé.
 */
import { describe, expect, it } from 'vitest';
import { loadRuleset } from '@hybridsport/engine';
import { archetypeRegion, archetypeVariant, findArchetype, inheritPredecessorTrack, personalizedStrengthParams, readStrengthParams, resolveSlots } from '../../src/index.js';
import type { SlotRole, StrengthParams, StrengthPersonalization, StrengthTrack } from '../../src/index.js';
import { strengthHautBasAbRulesetDocument } from '../fixtures/hautbas-ab.js';
import { PERSONALIZATION_V1 } from '../../content/personalization-v1.js';

const r = loadRuleset(strengthHautBasAbRulesetDocument());
if (!r.ok) throw new Error('ruleset de test invalide');
const base = readStrengthParams(r.ruleset).values;
const params: StrengthParams = { ...base, 'strength.personalization': PERSONALIZATION_V1 } as StrengthParams;
const arch = (p: StrengthParams, id: string) => { const a = findArchetype(p, id); if (!a) throw new Error(id); return a; };

describe('régions et variantes', () => {
  it('Haut, Bas et leurs variantes A/B ; Full Body et autres archétypes : région « full », sans variante', () => {
    expect(['str_upper', 'str_upper_a', 'str_upper_b'].map(archetypeRegion)).toEqual(['upper', 'upper', 'upper']);
    expect(['str_lower', 'str_lower_a', 'str_lower_b'].map(archetypeRegion)).toEqual(['lower', 'lower', 'lower']);
    expect(['str_full_body', 'str_support', 'str_ct_block'].map(archetypeRegion)).toEqual(['full', 'full', 'full']);
    expect(['str_upper_a', 'str_lower_b', 'str_upper', 'str_full_body'].map(archetypeVariant)).toEqual(['a', 'b', null, null]);
  });

  it('Bas A : principal genou (quadriceps), secondaire hanche ; Bas B : principal hanche (chaîne postérieure), secondaire genou', () => {
    const need = (id: string, role: string) => { const x = resolveSlots(arch(base, id), base, 'hypertrophy', 'strength_volume', () => 0); return [...x.required, ...x.optional].filter((s) => s.def.role === role).map((s) => s.def.need); };
    expect([need('str_lower_a', 'primary'), need('str_lower_a', 'secondary')]).toEqual([['knee_dominant'], ['hip_dominant']]);
    expect([need('str_lower_b', 'primary'), need('str_lower_b', 'secondary')]).toEqual([['hip_dominant'], ['knee_dominant']]);
  });

  it('variantes dérivées SANS modification : mêmes emplacements (hors préfixe), nombres, leviers et durées que Haut / Bas', () => {
    for (const [v, from] of [['str_upper_a', 'str_upper'], ['str_upper_b', 'str_upper'], ['str_lower_a', 'str_lower'], ['str_lower_b', 'str_lower']] as const) {
      const a = arch(base, v);
      const b = arch(base, from);
      expect(a.duration).toEqual(b.duration);
      expect(a.slots.map(({ id, preferred: _p, ...x }) => ({ ...x, id: id.split('.').slice(1).join('.') }))).toEqual(b.slots.map(({ id, ...x }) => ({ ...x, id: id.split('.').slice(1).join('.') })));
      expect(a.goals).toEqual(['hypertrophy']);
    }
  });
});

describe('zones prioritaires de la personnalisation selon la région', () => {
  const perso = (zones: StrengthPersonalization['priorities']): StrengthPersonalization => ({
    version: 1, completed: true, outcome: 'muscle', priorities: zones, experience: { months: 24, regularSessions: 3, technique: 'confident' }, sessionMinutes: 60,
    days: [0, 1, 3, 4], recovery: 'normal', avoidAreas: [], avoidExercises: [], likedExercises: [], painNow: false,
  });
  it('fessiers, cuisses (bas) et abdominaux (tronc) : jamais de zone du bas en Haut A/B ; jamais de zone du haut en Bas A/B', () => {
    const p = personalizedStrengthParams(params, perso([{ zone: 'glutes', intention: 'volume' }, { zone: 'thighs', intention: 'volume' }, { zone: 'abs', intention: 'strengthen' }]));
    const focus = (id: string) => arch(p, id).slots.filter((s) => s.id.includes('.focus.')).map((s) => s.id.split('.focus.')[1]);
    for (const id of ['str_upper', 'str_upper_a', 'str_upper_b']) expect(focus(id)).toEqual(['abs']);
    for (const id of ['str_lower', 'str_lower_a', 'str_lower_b']) expect(focus(id)).toEqual(['glutes', 'thighs', 'abs']);
    expect(focus('str_full_body')).toEqual(['glutes', 'thighs', 'abs']);
  });
  it('zones du haut : jamais en Bas A/B', () => {
    const p = personalizedStrengthParams(params, perso([{ zone: 'back', intention: 'volume' }]));
    for (const id of ['str_lower_a', 'str_lower_b']) expect(arch(p, id).slots.some((s) => s.id.includes('.focus.'))).toBe(false);
    for (const id of ['str_upper_a', 'str_upper_b']) expect(arch(p, id).slots.some((s) => s.id.endsWith('.focus.back'))).toBe(true);
  });
});

describe('reprise d’un suivi (D5)', () => {
  const t = (o: Partial<StrengthTrack> & Pick<StrengthTrack, 'trackId' | 'archetypeId' | 'slotId'>): StrengthTrack => ({
    tier: 'anchor', exerciseId: 'ex.bench_press', model: 'double_progression', status: 'active', openedAt: '2026-09-01T10:00:00Z' as StrengthTrack['openedAt'],
    consecutiveSuccess: 2, consecutiveBelow: 0, consecutiveHolds: 0, cycleStartLoadKg: 60, ...o,
  });
  const fresh = t({ trackId: 'track.str_upper_a.ua.main_push_h.ex.bench_press.2026-11-02', archetypeId: 'str_upper_a', slotId: 'ua.main_push_h', cycleStartLoadKg: 70, consecutiveSuccess: 0 });
  const roles: Record<string, SlotRole> = { 'up.main_push_h': 'primary', 'fb.push_h': 'secondary', 'ua.main_push_h': 'primary' };
  const roleOf = (x: StrengthTrack) => roles[x.slotId];

  it('correspondance FIABLE (même exercice, même rôle, même modèle, candidat unique) : borne de cycle réelle la plus basse, provenance tracée', () => {
    const old = t({ trackId: 'track.str_upper.up.main_push_h.ex.bench_press.2026-09-01', archetypeId: 'str_upper', slotId: 'up.main_push_h' });
    const all = [old, fresh];
    const before = JSON.stringify(all);
    const out = inheritPredecessorTrack(fresh, 'primary', all, roleOf);
    expect(out.track.cycleStartLoadKg).toBe(60);
    expect(out.track.transferredFrom).toEqual({ trackId: old.trackId, archetypeId: 'str_upper', slotId: 'up.main_push_h', cycleStartLoadKg: 60 });
    // Aucun compteur repris, aucune charge inventée, prochaine prescription inchangée (issue des séries réellement faites).
    expect(out.track.consecutiveSuccess).toBe(0);
    expect(out.track.nextPrescription).toEqual(fresh.nextPrescription);
    expect(out.reasons.map((x) => x.code)).toEqual(['PROGRESSION.TRACK_TRANSFERRED']);
    expect(JSON.stringify(all)).toBe(before);
  });

  it('borne de cycle d’origine plus haute : la plus basse est conservée (plafond de gain jamais élargi), provenance sans charge', () => {
    const old = t({ trackId: 'o', archetypeId: 'str_upper', slotId: 'up.main_push_h', cycleStartLoadKg: 80 });
    const out = inheritPredecessorTrack(fresh, 'primary', [old], roleOf);
    expect(out.track.cycleStartLoadKg).toBe(70);
    expect(out.track.transferredFrom).toEqual({ trackId: 'o', archetypeId: 'str_upper', slotId: 'up.main_push_h' });
  });

  it('ambiguïté (deux candidats compatibles) : AUCUN transfert, cause tracée', () => {
    const a = t({ trackId: 'a', archetypeId: 'str_upper', slotId: 'up.main_push_h' });
    const b = t({ trackId: 'b', archetypeId: 'str_upper_b', slotId: 'up.main_push_h' });
    const out = inheritPredecessorTrack(fresh, 'primary', [a, b], roleOf);
    expect(out.track).toEqual(fresh);
    expect(out.reasons[0]?.params).toMatchObject({ cause: 'ambiguous', candidates: ['a', 'b'] });
  });

  it('rôle ou modèle différent (secondaire du Full Body, autre modèle) : AUCUN transfert', () => {
    const fb = t({ trackId: 'fb', archetypeId: 'str_full_body', slotId: 'fb.push_h' });
    const other = t({ trackId: 'm', archetypeId: 'str_upper', slotId: 'up.main_push_h', model: 'autoregulated' });
    for (const c of [fb, other]) {
      const out = inheritPredecessorTrack(fresh, 'primary', [c], roleOf);
      expect(out.track).toEqual(fresh);
      expect(out.reasons[0]?.params).toMatchObject({ cause: 'role_or_model_differs' });
    }
  });

  it('aucun candidat (autre exercice, suivi clos ou suspendu, même archétype) : rien à transférer, aucune raison', () => {
    const cands = [
      t({ trackId: 'x', archetypeId: 'str_upper', slotId: 'up.main_push_h', exerciseId: 'ex.db_bench_press' }),
      t({ trackId: 'y', archetypeId: 'str_upper', slotId: 'up.main_push_h', status: 'closed' }),
      t({ trackId: 'z', archetypeId: 'str_upper', slotId: 'up.main_push_h', status: 'suspended' }),
      t({ trackId: 'w', archetypeId: 'str_upper_a', slotId: 'ua.main_push_h' }),
    ];
    expect(inheritPredecessorTrack(fresh, 'primary', cands, roleOf)).toEqual({ track: fresh, reasons: [] });
  });
});
