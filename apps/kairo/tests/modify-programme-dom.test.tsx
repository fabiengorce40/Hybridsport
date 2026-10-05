// @vitest-environment jsdom
/**
 * « Modifier le programme » (application réelle, backend réel) : l'assistant s'ouvre en PLEIN ÉCRAN, sans barre de
 * navigation (cause du blocage : elle recouvrait ses actions) ; conséquences annoncées avant validation ; annulation sans
 * effet. La vérification de mise en page (recouvrement, viewport Android) est faite par l'E2E Chromium (scénario D).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryStorage, STORAGE_KEY } from '@hybridsport/app-core';
import type { Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
// Environnement jsdom : `import.meta.url` n'est pas un chemin de fichier ; le dossier du test l'est.
const STARTED = readFileSync(join(import.meta.dirname, '../../../packages/app-core/tests/fixtures/pre-s1-started-state.json'), 'utf8');
const wed = (): Clock => ({ today: '2026-10-07', now: '2026-10-07T07:30:00.000Z' });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('Modifier le programme', () => {
  it('assistant plein écran sans barre de navigation ; actions groupées ; conséquences annoncées ; annuler sans effet', () => {
    const st = new MemoryStorage();
    st.setItem(STORAGE_KEY, STARTED);
    render(<StoreProvider storage={st} clock={wed}><App /></StoreProvider>);
    const before = st.getItem(STORAGE_KEY);
    click('Programme');
    click('Modifier et recréer le programme');
    expect(screen.queryByRole('navigation', { name: 'Navigation principale' })).toBeNull();
    const actions = screen.getByRole('group', { name: 'Navigation de l’assistant' });
    expect(actions.className).toBe('wizard-actions');
    fireEvent.click(screen.getByRole('radio', { name: /^Musculation \+ Course/ }));
    click('Continuer');
    click('Continuer');
    click('Continuer');
    expect(screen.getByText(/Cette semaine est commencée : elle est conservée telle quelle/)).toBeTruthy();
    click('Retour');
    click('Retour');
    click('Retour');
    click('Annuler');
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeTruthy();
    expect(st.getItem(STORAGE_KEY)).toBe(before);
  });
});
