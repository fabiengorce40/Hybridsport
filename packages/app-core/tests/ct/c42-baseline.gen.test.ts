import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { matrix } from './c42-metrics.js';
it.runIf(process.env.C4_BASELINE !== undefined)('génère une référence figée (C4_BASELINE = nom du fichier)', () => {
  writeFileSync(new URL(`./__reports__/${process.env.C4_BASELINE ?? 'baseline'}.json`, import.meta.url).pathname, `${JSON.stringify(matrix(), null, 1)}\n`);
});
