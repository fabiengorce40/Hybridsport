/**
 * Scanner d'architecture : analyse l'AST TypeScript des sources du CORE
 * (packages/domain/src et packages/engine/src). Fait foi par rapport à ESLint.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';

export const REPO_ROOT = resolve(import.meta.dirname, '../../../..');
export const CORE_SOURCE_DIRS = ['packages/domain/src', 'packages/engine/src'];

export interface SourceFile {
  readonly path: string; // relatif au dépôt
  readonly text: string;
  readonly ast: ts.SourceFile;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.ts')) out.push(full);
  }
  return out;
}

export function loadCoreSources(dirs: readonly string[] = CORE_SOURCE_DIRS): SourceFile[] {
  return dirs.flatMap((d) => walk(join(REPO_ROOT, d))).sort().map((full) => {
    const text = readFileSync(full, 'utf8');
    return { path: relative(REPO_ROOT, full), text, ast: ts.createSourceFile(full, text, ts.ScriptTarget.ES2022, true) };
  });
}

export interface Finding {
  readonly file: string;
  readonly line: number;
  readonly snippet: string;
  readonly rule: string;
}

function finding(file: SourceFile, node: ts.Node, rule: string): Finding {
  const { line } = file.ast.getLineAndCharacterOfPosition(node.getStart(file.ast));
  return { file: file.path, line: line + 1, snippet: node.getText(file.ast).slice(0, 80), rule };
}

export function visit(file: SourceFile, fn: (node: ts.Node) => void): void {
  const rec = (n: ts.Node): void => {
    fn(n);
    n.forEachChild(rec);
  };
  rec(file.ast);
}

const FORBIDDEN_MEMBERS: Record<string, readonly string[]> = {
  Date: ['now'],
  Math: ['random'],
  performance: ['now'],
  process: ['env', 'hrtime', 'uptime'],
  crypto: ['getRandomValues', 'randomUUID', 'randomBytes'],
};

/** Horloge système et sources de hasard non injectées. */
export function findClockAndRandomUsage(files: readonly SourceFile[]): Finding[] {
  const out: Finding[] = [];
  for (const f of files) {
    visit(f, (n) => {
      if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression)) {
        const members = FORBIDDEN_MEMBERS[n.expression.text];
        if (members?.includes(n.name.text)) out.push(finding(f, n, 'clock-or-random'));
      }
      if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'Date' && (n.arguments?.length ?? 0) === 0) {
        out.push(finding(f, n, 'new-Date-without-argument'));
      }
      if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && /^(node:)?crypto$/.test(n.moduleSpecifier.text)) {
        out.push(finding(f, n, 'crypto-import'));
      }
    });
  }
  return out;
}

const FORBIDDEN_GLOBAL_CALLS = new Set(['fetch', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'sessionStorage', 'indexedDB', 'setTimeout', 'setInterval', 'require']);

/** Réseau, stockage, temps réel, require dynamique. */
export function findForbiddenGlobals(files: readonly SourceFile[]): Finding[] {
  const out: Finding[] = [];
  for (const f of files) {
    visit(f, (n) => {
      if (ts.isIdentifier(n) && FORBIDDEN_GLOBAL_CALLS.has(n.text)) {
        const p = n.parent;
        const isPropertyName = ts.isPropertyAccessExpression(p) && p.name === n;
        const isDeclarationName = (ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isMethodDeclaration(p)) && p.name === n;
        if (!isPropertyName && !isDeclarationName) out.push(finding(f, n, 'forbidden-global'));
      }
    });
  }
  return out;
}

/** Spécificateurs de modules importés. */
export function collectImports(files: readonly SourceFile[]): { file: string; module: string }[] {
  const out: { file: string; module: string }[] = [];
  for (const f of files) {
    visit(f, (n) => {
      if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
        out.push({ file: f.path, module: n.moduleSpecifier.text });
      }
      if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const arg = n.arguments[0];
        out.push({ file: f.path, module: arg && ts.isStringLiteral(arg) ? arg.text : '<dynamic>' });
      }
    });
  }
  return out;
}

/** Identifiants dont le nom suggère un contournement de validation. */
export function findBypassIdentifiers(files: readonly SourceFile[]): Finding[] {
  const pattern = /(skip|bypass|disable|ignore|suppress|override)_?(validation|validator|rules?|hard|safety|checks?|admissibility)/i;
  const out: Finding[] = [];
  for (const f of files) {
    visit(f, (n) => {
      if ((ts.isIdentifier(n) || ts.isStringLiteral(n)) && pattern.test(n.text)) out.push(finding(f, n, 'validation-bypass'));
    });
  }
  return out;
}

/**
 * Littéraux numériques : seuls 0, 1 et -1 sont libres. Toute autre valeur doit être
 * annotée `technical-constant:` (sur la ligne ou la ligne précédente), ou se trouver dans
 * un fichier explicitement déclaré `technical-constants-file:` ET listé dans l'allowlist.
 * Objectif : aucune valeur sportive provisoire ne peut être écrite en dur dans le CORE
 * (spec 09 §3.1) ; les valeurs sportives vivent dans le ruleset.
 */
export function findUnjustifiedNumericLiterals(files: readonly SourceFile[], allowlistedFiles: readonly string[]): Finding[] {
  const out: Finding[] = [];
  for (const f of files) {
    const fileLevel = f.text.includes('technical-constants-file:');
    if (fileLevel && allowlistedFiles.includes(f.path)) continue;
    const lines = f.text.split('\n');
    visit(f, (n) => {
      if (!ts.isNumericLiteral(n)) return;
      const value = Number(n.text.replace(/_/g, ''));
      if (value === 0 || value === 1) return;
      const { line } = f.ast.getLineAndCharacterOfPosition(n.getStart(f.ast));
      const here = lines[line] ?? '';
      const above = lines[line - 1] ?? '';
      if (here.includes('technical-constant:') || above.includes('technical-constant:')) return;
      out.push(finding(f, n, 'unjustified-numeric-literal'));
    });
  }
  return out;
}
