// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { SetPrescription } from '@hybridsport/app-core';
import { SetLine } from '../src/workout/StrengthWorkout.js';

afterEach(cleanup);
const set: SetPrescription = { kind: 'working', reps: { min: 12, max: 20 }, restAfterS: 90 };

describe('saisie réelle d’une série', () => {
  it('exige une valeur réelle, conserve la plage et transmet les valeurs choisies', () => {
    const record = vi.fn();
    render(<SetLine set={set} label="Série 1" saved={undefined} editable onRecord={record} />);
    expect(screen.getByText('obj. 12–20')).toBeTruthy();
    const repetitions = screen.getByLabelText('Répétitions réalisées') as HTMLInputElement;
    const charge = screen.getByLabelText('Charge (kg)') as HTMLInputElement;
    const check = screen.getByRole('button', { name: 'Cocher la série' }) as HTMLButtonElement;
    expect(repetitions.placeholder).toBe('12–20');
    expect(check.disabled).toBe(true);
    fireEvent.change(repetitions, { target: { value: '15' } });
    fireEvent.change(charge, { target: { value: '12,5' } });
    expect(check.disabled).toBe(false);
    fireEvent.click(check);
    expect(record).toHaveBeenCalledWith({ done: true, reps: 15, loadKg: 12.5 });
  });
  it('explique une charge invalide et ne valide pas la série', () => {
    const record = vi.fn();
    render(<SetLine set={set} label="Série 1" saved={undefined} editable onRecord={record} />);
    fireEvent.change(screen.getByLabelText('Répétitions réalisées'), { target: { value: '15' } });
    const charge = screen.getByLabelText('Charge (kg)');
    fireEvent.change(charge, { target: { value: '1..2' } });
    expect(charge.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain('charge valide');
    expect((screen.getByRole('button', { name: 'Cocher la série' }) as HTMLButtonElement).disabled).toBe(true);
    expect(record).not.toHaveBeenCalled();
    fireEvent.change(charge, { target: { value: '12.5' } });
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('affiche et permet de décocher une série enregistrée', () => {
    const record = vi.fn();
    render(<SetLine set={set} label="Série 1" saved={{ itemId: 'x', setIndex: 0, done: true, reps: 14, loadKg: 12.5 }} editable onRecord={record} />);
    expect((screen.getByLabelText('Répétitions réalisées') as HTMLInputElement).value).toBe('14');
    expect((screen.getByLabelText('Charge (kg)') as HTMLInputElement).value).toBe('12.5');
    fireEvent.click(screen.getByRole('button', { name: 'Décocher la série' }));
    expect(record).toHaveBeenCalledWith({ done: false, reps: 14, loadKg: 12.5 });
  });
});
