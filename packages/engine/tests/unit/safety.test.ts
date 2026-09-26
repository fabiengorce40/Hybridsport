import { describe, expect, it } from 'vitest';
import { asISODateTime, zPainReport } from '@hybridsport/domain';
import type { PainReportInput } from '@hybridsport/domain';
import {
  handlePainReport, deriveSafetyRestrictions, onP4Report, detectRecurrence, performanceRelevant, deriveProgramStatus, generationGuard,
  repairSession, validateSession,
} from '../../src/index.js';
import { baseContext, deps } from '../fixtures/context.js';
import { session } from '../fixtures/sessions.js';
import { param, testRulesetDocument } from '../fixtures/ruleset.js';
import { testRuleset } from '../fixtures/load.js';

const rs = testRuleset();
const now = asISODateTime('2026-09-28T12:00:00Z');
const pain = (p: Partial<PainReportInput>) => zPainReport.parse({ id: 'pain.1', level: 'P1', bodyAreas: ['knee'], context: 'after_session', reportedAt: '2026-09-28T10:00:00Z', persisted: true, rulesetRef: '0.1.0-test', ...p });

describe('contrats douleur (architecture P1–P4, contenus G1 dans le ruleset)', () => {
  it('schéma : choix fermés, zone obligatoire sauf P4, aucun texte libre accepté', () => {
    expect(() => pain({ level: 'P2', bodyAreas: [] })).toThrow();
    expect(pain({ level: 'P4', bodyAreas: [] }).level).toBe('P4');
    expect(zPainReport.safeParse({ ...pain({}), description: 'douleur vive' }).success).toBe(false);
  });

  it('sans consentement : aucune persistance, mais adaptation immédiate possible', () => {
    const h = handlePainReport(pain({ level: 'P2', affectedMovements: ['deep_squat'] }), false);
    expect(h.toPersist).toBeNull();
    expect(h.report.persisted).toBe(false);
    expect(h.reasons[0]?.code).toBe('DATA.NOT_PERSISTED_NO_CONSENT');
    const r = deriveSafetyRestrictions([h.report], rs);
    expect(r.areaRestrictions).toEqual([{ area: 'knee', action: 'exclude', painLevel: 'P2' }]);
    expect(r.restrictedMovements).toEqual(['deep_squat']);
    expect(handlePainReport(pain({}), true).toPersist?.persisted).toBe(true);
  });

  it('les comportements par niveau viennent du ruleset G1 (P1 prudence, P3 pause sur zone centrale)', () => {
    expect(deriveSafetyRestrictions([pain({ level: 'P1' })], rs).areaRestrictions[0]?.action).toBe('reduce');
    expect(deriveSafetyRestrictions([pain({ level: 'P3', bodyAreas: ['knee'] })], rs).pauseProgram).toBe(false);
    const central = deriveSafetyRestrictions([pain({ level: 'P3', bodyAreas: ['lower_back'] })], rs);
    expect(central.pauseProgram).toBe(true);
    expect(central.suspendHighIntensity).toBe(true);
    expect(deriveSafetyRestrictions([pain({ level: 'P2', resolution: { declaredAt: '2026-09-28T11:00:00Z', kind: 'resolved' } })], rs).areaRestrictions).toEqual([]);
  });

  it('pipeline P4 : interruption, blocage, clé de message issue du ruleset (aucun texte codé en dur)', () => {
    const p4 = onP4Report(pain({ level: 'P4', bodyAreas: [] }), rs);
    expect(p4).toMatchObject({ interruptSession: true, programStatus: 'paused_safety', messageKey: 'safety.p4.test_message' });
    const base = testRulesetDocument();
    const other = testRuleset({ ...base, parameters: base.parameters.map((p) => (p.id === 'safety.p4.messageKey' ? param(p.id, 'safety.p4.other', 'G1') : p)) });
    expect(onP4Report(pain({ level: 'P4', bodyAreas: [] }), other).messageKey).toBe('safety.p4.other');
    expect(onP4Report(pain({ level: 'P1' }), rs).interruptSession).toBe(false);
  });

  it('récurrence : impossible sans historique (aucune fausse détection), détectée avec historique', () => {
    const history = [pain({ id: 'a', reportedAt: '2026-09-20T10:00:00Z' }), pain({ id: 'b', reportedAt: '2026-09-27T10:00:00Z' })];
    expect(detectRecurrence(history, 'unavailable', rs, now)).toMatchObject({ status: 'unavailable', reasons: [{ code: 'DATA.HEALTH_HISTORY_UNAVAILABLE' }] });
    expect(detectRecurrence(history, 'available', rs, now)).toMatchObject({ status: 'escalate', areas: ['knee'], toLevel: 'P2' });
    // Signalements non persistés (sans consentement) : jamais comptés.
    expect(detectRecurrence(history.map((h) => ({ ...h, persisted: false })), 'available', rs, now).status).toBe('none');
    expect(detectRecurrence([history[1]!], 'available', rs, now).status).toBe('none');
  });

  it('pain et safety_pause sont exclus des mécanismes normaux d’échec', () => {
    const r = performanceRelevant([
      { id: 'x1', completed: false, skipReason: 'pain' }, { id: 'x2', completed: false, skipReason: 'safety_pause' },
      { id: 'x3', completed: false, skipReason: 'time' }, { id: 'x4', completed: true },
    ]);
    expect(r.relevant.map((e) => e.id)).toEqual(['x3', 'x4']);
    expect(r.reasons.map((x) => x.params.reason)).toEqual(['pain', 'safety_pause']);
  });
});

describe('contrats d’éligibilité et statut du programme', () => {
  const noPause = { pauseProgram: false };
  it('suspended / excluded ⇒ suspended_scope ; déclaration requise mais absente ⇒ suspended_scope', () => {
    expect(deriveProgramStatus({ eligibility: 'excluded', declarations: [], safety: noPause, ruleset: rs }).status).toBe('suspended_scope');
    expect(deriveProgramStatus({ eligibility: 'suspended', declarations: [], safety: noPause, ruleset: rs }).status).toBe('suspended_scope');
    expect(deriveProgramStatus({ eligibility: 'declaration_required', declarations: [], safety: noPause, ruleset: rs }).reasons[0]?.code).toBe('SCOPE.DECLARATION_REQUIRED');
    const decl = [{ kind: 'test.professional_clearance', declaredAt: asISODateTime('2026-09-01T00:00:00Z'), rulesetRef: '0.1.0-test' }];
    expect(deriveProgramStatus({ eligibility: 'declaration_required', declarations: decl, safety: noPause, ruleset: rs }).status).toBe('active');
    expect(deriveProgramStatus({ eligibility: 'eligible', declarations: [], safety: { pauseProgram: true }, ruleset: rs }).status).toBe('paused_safety');
  });

  it('hors `active` : aucune génération (garde, validateur et réparateur concordent)', () => {
    expect(generationGuard('suspended_scope', 'excluded')).toMatchObject({ ok: false, error: { code: 'OUT_OF_SCOPE' } });
    expect(generationGuard('paused_safety', 'eligible')).toMatchObject({ ok: false, error: { code: 'SAFETY_BLOCK' } });
    expect(generationGuard('active', 'eligible')).toEqual({ ok: true });
    const ctx = baseContext({ programStatus: 'suspended_scope', eligibility: 'excluded' });
    expect(validateSession(session(), ctx, deps()).report.status).toBe('INVALID');
    const r = repairSession(session(), ctx, deps(), { seed: 's' });
    expect(r.result.status === 'error' && r.result.error.code).toBe('OUT_OF_SCOPE');
  });
});
