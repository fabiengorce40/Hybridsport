/**
 * Garde de publication du workflow de production `kairo-pages.yml` : seule la branche de production publie sur
 * GitHub Pages ; un lancement manuel (workflow_dispatch) depuis une autre branche ou une étiquette est refusé et ne
 * publie rien. Lecture STRUCTURELLE du fichier (aucune dépendance YAML ajoutée) ; la validité YAML et les expressions
 * sont vérifiées en plus par actionlint lors de la préparation du correctif.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const PROD = 'claude/crosstraining-c1-c2-spike-vbg8dv';
const DIR = new URL('../../../.github/workflows/', import.meta.url);
const read = (f: string) => readFileSync(new URL(f, DIR), 'utf8');

/** Blocs de jobs (clé de job à 2 espaces sous `jobs:`) → texte du bloc. */
function jobs(src: string): Record<string, string> {
  const lines = src.split('\n');
  const start = lines.findIndex((l) => l === 'jobs:');
  const out: Record<string, string> = {};
  let cur: string | undefined;
  for (const l of lines.slice(start + 1)) {
    const m = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(l);
    if (m) { cur = m[1]; out[cur as string] = ''; continue; }
    if (/^\S/.test(l)) break;
    if (cur) out[cur] += `${l}\n`;
  }
  return out;
}
const jobIf = (block: string): string | undefined => /^ {4}if: (.+)$/m.exec(block)?.[1]?.trim();
/** Évalue la condition de garde `github.ref == '<lit>'` / `!= '<lit>'` lue DANS le fichier (pas recopiée). */
function evaluate(cond: string, ref: string): boolean {
  const m = /^github\.ref (==|!=) '([^']+)'$/.exec(cond);
  if (!m) throw new Error(`condition non reconnue : ${cond}`);
  return m[1] === '==' ? ref === m[2] : ref !== m[2];
}

describe('kairo-pages.yml — garde de publication en production', () => {
  const src = read('kairo-pages.yml');
  const j = jobs(src);

  it('G-1. le déclenchement automatique reste limité à la branche de production', () => {
    expect(src).toMatch(new RegExp(`push:\\n\\s+branches: \\[${PROD.replace(/[/-]/g, '\\$&')}\\]`));
    expect(src).toContain('workflow_dispatch:');
  });

  it('G-2. le job qui publie (gh-pages) n’est exécuté QUE depuis la branche de production', () => {
    expect(j.deploy).toContain('git push -f');
    expect(jobIf(j.deploy ?? '')).toBe(`github.ref == 'refs/heads/${PROD}'`);
  });

  it('G-3. décision pour chaque référence possible : seule la production publie, toute autre est refusée explicitement', () => {
    const deployIf = jobIf(j.deploy ?? '') as string;
    const refuseIf = jobIf(j.refuse ?? '') as string;
    const refs = [`refs/heads/${PROD}`, 'refs/heads/claude/kairo-rc1', 'refs/heads/claude/kairo-rc1-test-env', 'refs/heads/claude/kairo-rc3-prep',
      `refs/heads/${PROD}-copy`, `refs/heads/x/${PROD}`, `refs/tags/${PROD}`, 'refs/heads/main', 'refs/pull/3/merge'];
    for (const ref of refs) {
      const publishes = evaluate(deployIf, ref);
      expect(publishes).toBe(ref === `refs/heads/${PROD}`);
      expect(evaluate(refuseIf, ref)).toBe(!publishes);
    }
  });

  it('G-4. refus explicite : le job de refus échoue avec un message et n’a AUCUNE permission', () => {
    expect(j.refuse).toMatch(/^ {4}permissions: \{\}$/m);
    expect(j.refuse).toContain('::error::Publication refusée');
    expect(j.refuse).toMatch(/exit 1/);
    expect(j.refuse).not.toMatch(/git push|checkout|secrets\./);
  });

  it('G-5. la vérification post-publication dépend de la publication (sautée si elle l’est)', () => {
    expect(j.verify).toMatch(/^ {4}needs: deploy$/m);
    expect(jobIf(j.verify ?? '')).toBeUndefined();
  });

  it('G-6. permissions : seul `contents: write` (nécessaire à gh-pages), aucune autre portée en écriture', () => {
    const top = /^permissions:\n((?: {2}.+\n)+)/m.exec(src)?.[1] ?? '';
    expect(top.trim().split('\n').map((x) => x.trim())).toEqual(['contents: write']);
    expect(src.match(/: write/g)).toHaveLength(1);
  });

  it('G-7. tout workflow du dépôt qui pousse sur gh-pages porte la garde de la branche de production', () => {
    for (const f of readdirSync(DIR).filter((x) => /\.ya?ml$/.test(x))) {
      for (const [name, block] of Object.entries(jobs(read(f)))) {
        if (!/git push[^\n]*gh-pages/.test(block)) continue;
        expect(jobIf(block), `${f} → ${name}`).toBe(`github.ref == 'refs/heads/${PROD}'`);
      }
    }
  });
});
