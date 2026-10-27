// @vitest-environment jsdom
/**
 * REKKA V2-2C — objectifs et jalons VÉRIFIÉS : aucune valeur, progression ou obtention sans preuve (séances réelles) ;
 * sans preuve, le composant l'écrit. Aucun niveau ni XP.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GoalProgress, MilestoneCard, goalRatio, isVerified, milestoneEarned } from '../src/design/Milestones.js';
import type { VerifiedGoal, VerifiedMilestone } from '../src/design/Milestones.js';

afterEach(cleanup);
const proof = { sessionIds: ['s1', 's2'], lastOn: '20 octobre' };
const goal: VerifiedGoal = { id: 'g', sport: 'strength', title: 'Squat barre : 80 kg × 6', current: 72.5, target: 80, unit: 'kg', better: 'higher', evidence: proof };
const ms: VerifiedMilestone = { id: 'm', title: 'Premier record', detail: 'Une charge confirmée', badge: 'record', achievedOn: '20 octobre', evidence: proof };

describe('REKKA V2-2C — objectifs et jalons vérifiés', () => {
  it('preuve : au moins une séance et une date', () => {
    expect(isVerified(proof)).toBe(true);
    expect(isVerified(null)).toBe(false);
    expect(isVerified({ sessionIds: [], lastOn: '20 octobre' })).toBe(false);
    expect(isVerified({ sessionIds: ['s1'], lastOn: '' })).toBe(false);
  });

  it('objectif prouvé : valeur mesurée, cible, barre et nombre de séances', () => {
    render(<GoalProgress goal={goal} />);
    const card = screen.getByRole('article', { name: 'Squat barre : 80 kg × 6 : 72,5 kg sur 80 kg' });
    expect(card.textContent).toMatch(/72,5 \/ 80 kg/);
    expect(card.textContent).toMatch(/Mesuré sur 2 séances/);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('72.5');
    expect(goalRatio(goal)).toBeCloseTo(0.90625);
  });

  it('objectif SANS preuve ou sans mesure : « non disponible », aucun chiffre ni barre', () => {
    for (const g of [{ ...goal, evidence: null }, { ...goal, current: null }, { ...goal, evidence: { sessionIds: [], lastOn: '' } }]) {
      render(<GoalProgress goal={g} />);
      const card = screen.getByRole('article', { name: /: non disponible$/ });
      expect(card.textContent).not.toMatch(/72,5/);
      expect(card.textContent).toMatch(/aucune séance réelle/);
      expect(screen.queryByRole('progressbar')).toBeNull();
      expect(goalRatio(g)).toBeNull();
      cleanup();
    }
  });

  it('objectif de temps (moins = mieux) : pas de ratio inventé', () => {
    expect(goalRatio({ ...goal, better: 'lower', current: 75, target: 70 })).toBeNull();
  });

  it('jalon : « obtenu » seulement avec date ET preuve ; sinon « à venir » grisé', () => {
    expect(milestoneEarned(ms)).toBe(true);
    expect(milestoneEarned({ ...ms, evidence: null })).toBe(false);
    expect(milestoneEarned({ ...ms, achievedOn: null })).toBe(false);
    render(<><MilestoneCard m={ms} /><MilestoneCard m={{ ...ms, id: 'x', title: '50 séances', achievedOn: null, evidence: null }} /></>);
    expect(screen.getByRole('article', { name: 'Premier record : obtenu' }).textContent).toMatch(/Obtenu le 20 octobre/);
    const locked = screen.getByRole('article', { name: '50 séances : à venir' });
    expect(locked.className).toMatch(/locked/);
    expect(locked.textContent).toMatch(/À venir/);
  });

  it('aucun niveau ni XP rendu', () => {
    render(<><GoalProgress goal={goal} /><MilestoneCard m={ms} /></>);
    expect(document.body.textContent).not.toMatch(/niveau|\bXP\b/i);
  });
});
