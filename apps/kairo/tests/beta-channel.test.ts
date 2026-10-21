/**
 * REKKA BÊTA : workflow ISOLÉ (projet Cloudflare distinct, branche dédiée, lecture seule, jamais gh-pages, TEST ni
 * prévisualisation), stockage préfixé STABLE du canal (aucune clé d'un autre environnement lue ni écrite ; mêmes clés
 * relues après chaque mise à jour) et build de production inchangée (aucun canal sans variable).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '@hybridsport/app-core';
import { CHANNEL, namespaced, STORAGE_NAMESPACE } from '../src/channel.js';

const wf = readFileSync(new URL('../../../.github/workflows/rekka-beta-pages.yml', import.meta.url), 'utf8');
const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

describe('REKKA BÊTA — workflow isolé', () => {
  it('déclenché et publié UNIQUEMENT depuis la branche BÊTA', () => {
    expect(wf).toMatch(/push:\n\s+branches: \[claude\/rekka-beta\]/);
    expect(wf).toMatch(/^ {4}if: github\.ref == 'refs\/heads\/claude\/rekka-beta'$/m);
  });
  it('projet Cloudflare distinct de TEST et de la prévisualisation, lecture seule, jamais gh-pages ni production', () => {
    expect(wf).toContain('CF_PROJECT: rekka-beta');
    expect(wf).not.toMatch(/CF_PROJECT: kairo-rc1-test|CF_PROJECT: kairo-r51-preview/);
    expect(wf).toMatch(/^permissions:\n {2}contents: read$/m);
    expect(wf).not.toMatch(/git push|gh-pages[^`]|: write/);
    expect(wf).not.toMatch(/branches: \[claude\/crosstraining-c1-c2-spike-vbg8dv\]|branches: \[claude\/kairo-rc1-test-env\]|branches: \[claude\/kairo-r51-preview\]/);
    expect(wf).toContain('pnpm kairo:build:beta');
  });
  it('garde anti-écrasement : un projet existant qui ne publie pas la BÊTA n’est jamais remplacé', () => {
    expect(wf).toContain(`grep -q '"channel":"beta"'`);
    expect(wf).toContain('déploiement refusé pour ne rien écraser');
  });
  it('version et commit déployés publiés (version.json, canal beta) et vérifiés après déploiement', () => {
    expect(wf).toContain('\\"channel\\":\\"beta\\"');
    expect(wf).toContain('E2E_EXPECT_BUILD="${GITHUB_SHA}"');
  });
});

describe('REKKA BÊTA — données', () => {
  it('toutes les lectures et écritures passent par le préfixe ; production (préfixe vide) inchangée', () => {
    const raw = new MemoryStorage();
    raw.setItem('kairo.state', 'production');
    const s = namespaced(raw, 'rekka-beta:');
    expect(s.getItem('kairo.state')).toBeNull();
    s.setItem('kairo.state', 'beta');
    expect(raw.getItem('kairo.state')).toBe('production');
    expect(raw.getItem('rekka-beta:kairo.state')).toBe('beta');
    expect(namespaced(raw, '')).toBe(raw);
  });
  it('préfixe STABLE de la BÊTA (les mises à jour relisent les mêmes clés) ; tests = canal production', () => {
    expect(readFileSync(new URL('../src/channel.ts', import.meta.url), 'utf8')).toContain("IS_BETA ? 'rekka-beta:' : ''");
    expect(CHANNEL).toBe('production');
    expect(STORAGE_NAMESPACE).toBe('');
  });
  it('service worker : ne touche jamais au stockage local ; la BÊTA ne supprime que ses propres caches', () => {
    expect(sw).not.toMatch(/localStorage|indexedDB/);
    expect(vite).toContain("keys.filter((k) => k.startsWith('rekka-beta-') && k !== CACHE)");
  });
});
