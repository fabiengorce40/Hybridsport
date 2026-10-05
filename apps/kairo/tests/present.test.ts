/** Présentation Beta 0 : libellés des archétypes Strength composés par le moteur et refus de composition expliqué. */
import { describe, expect, it } from 'vitest';
import type { SessionView } from '@hybridsport/app-core';
import { notPlannedText, roleName, sessionName } from '../src/present.js';

describe('présentation Strength S1', () => {
  it('libellés lisibles des archétypes composés (aucun identifiant technique) ; le rôle de rotation n’est pas affiché', () => {
    expect(['str_full_body', 'str_upper', 'str_lower'].map((a) => sessionName('strength', a))).toEqual(['Full body', 'Haut du corps', 'Bas du corps']);
    expect(roleName('ROTATION')).toBeNull();
  });

  it('composition Strength non gouvernée : explication compréhensible (Course : message générique inchangé)', () => {
    const v = (sport: 'strength' | 'running'): SessionView => ({
      requestId: 'r', sport, date: null, status: 'not_planned', targetDurationS: null, estimatedDurationS: null, archetypeId: null, role: null, compositionAuthority: null, pain: false,
      notPlanned: { category: 'governance_blocked', reason: { code: 'RULE.PLANNER.COMPOSITION_UNRESOLVED', params: {} }, triedDate: null },
    });
    expect(notPlannedText(v('strength'))).toMatch(/réduisez la fréquence de musculation/);
    expect(notPlannedText(v('running'))).toBe('Les règles nécessaires pour planifier cette séance ne sont pas encore disponibles.');
  });
});
