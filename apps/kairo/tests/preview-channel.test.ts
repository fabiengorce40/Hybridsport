/**
 * Prévisualisation R5.1 : workflow ISOLÉ (projet Cloudflare distinct, branche dédiée, lecture seule, jamais gh-pages) et
 * stockage préfixé du canal (aucune clé d'un autre environnement lue ni écrite).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '@hybridsport/app-core';
import { namespaced } from '../src/channel.js';

const wf = readFileSync(new URL('../../../.github/workflows/kairo-r51-preview-pages.yml', import.meta.url), 'utf8');

describe('prévisualisation R5.1 — workflow isolé', () => {
  it('déclenché et publié UNIQUEMENT depuis la branche de prévisualisation', () => {
    expect(wf).toMatch(/push:\n\s+branches: \[claude\/kairo-r51-preview\]/);
    expect(wf).toMatch(/^ {4}if: github\.ref == 'refs\/heads\/claude\/kairo-r51-preview'$/m);
  });
  it('projet Cloudflare distinct de TEST, lecture seule, jamais gh-pages ni production', () => {
    expect(wf).toContain('CF_PROJECT: kairo-r51-preview');
    expect(wf).not.toMatch(/kairo-rc1-test['"\s]*$|CF_PROJECT: kairo-rc1-test/m);
    expect(wf).toMatch(/^permissions:\n {2}contents: read$/m);
    expect(wf).not.toMatch(/git push|gh-pages[^`]|: write/);
    expect(wf).not.toMatch(/branches: \[claude\/crosstraining-c1-c2-spike-vbg8dv\]|branches: \[claude\/kairo-rc1-test-env\]/);
    expect(wf).toContain('pnpm kairo:build:r51-preview');
  });
});

describe('prévisualisation R5.1 — stockage préfixé', () => {
  it('toutes les lectures et écritures passent par le préfixe ; production (préfixe vide) inchangée', () => {
    const raw = new MemoryStorage();
    raw.setItem('kairo.state', 'production');
    const s = namespaced(raw, 'kairo-r51-preview:');
    expect(s.getItem('kairo.state')).toBeNull();
    s.setItem('kairo.state', 'preview');
    expect(raw.getItem('kairo.state')).toBe('production');
    expect(raw.getItem('kairo-r51-preview:kairo.state')).toBe('preview');
    expect(namespaced(raw, '')).toBe(raw);
  });
});
