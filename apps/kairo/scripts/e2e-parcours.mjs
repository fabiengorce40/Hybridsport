/** Lance un parcours complet du grand E2E existant, sans supprimer ses assertions internes.
 * Usage : E2E_URL=http://127.0.0.1:4174/ E2E_REKKA_V2=1 node apps/kairo/scripts/e2e-parcours.mjs planning
 * Parcours : base (accueil, musculation, course, historique), cross, hyrox, recovery, planning.
 * Réservé à la build BÊTA locale : les accès au stockage prennent son préfixe.
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const choices = {
  base: ['// PWA : manifest et service worker.', '// ——— Strength S1 dans le navigateur'],
  cross: ['// F / G — Cross-training', '// HYROX H2.5'],
  hyrox: ['// HYROX H2.5', '// ——— M3.1'],
  recovery: ['// RC4.5 (lot C, C-9)', '// R5.1 — Planning en GRILLE'],
  planning: ['// R5.1 — Planning en GRILLE', '// Version réellement servie'],
};
const name = process.argv[2];
if (!Object.hasOwn(choices, name)) throw new Error(`Parcours inconnu : ${String(name)}. Choisir : ${Object.keys(choices).join(', ')}`);
const code = readFileSync(new URL('./e2e.mjs', import.meta.url), 'utf8');
function slice(start, end) {
  const a = code.indexOf(start); const b = code.indexOf(end, a + start.length);
  if (a < 0 || b < 0 || b <= a) throw new Error(`Délimitation E2E introuvable : ${start} → ${end}`);
  return code.slice(a, b);
}
const prefix = code.slice(0, code.indexOf('// PWA : manifest et service worker.'));
if (!prefix.includes('const browser = ')) throw new Error('Préambule E2E introuvable');
const helper = name === 'recovery' ? slice('async function freshPage(', 'const strengthTitles =') : '';
const [start, end] = choices[name];
const selected = prefix + helper + slice(start, end) + `\nawait browser.close();\nconsole.log('PARCOURS ${name} OK');\n`;
const temp = fileURLToPath(new URL(`./.e2e-parcours-${name}-${process.pid}.mjs`, import.meta.url));
try {
  writeFileSync(temp, selected.replaceAll("'kairo.state'", "'rekka-beta:kairo.state'"));
  const result = spawnSync(process.execPath, [temp], { stdio: 'inherit', env: process.env, timeout: 75000 });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
} finally { unlinkSync(temp); }
