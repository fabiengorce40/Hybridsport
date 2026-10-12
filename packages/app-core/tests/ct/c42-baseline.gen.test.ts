import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { matrix } from './c42-metrics.js';
it.runIf(process.env.C42_BASELINE === '1')('génère la référence C4.1', () => {
  writeFileSync(new URL('./__reports__/c41-baseline.json', import.meta.url).pathname, `${JSON.stringify(matrix(), null, 1)}\n`);
});
