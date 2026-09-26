import { describe, it } from 'vitest';
import { runCorePipeline } from '../../src/index.js';
import { coreContext } from '../harness/context.js';
import { REQUESTS } from '../harness/requests.js';
import { expectGolden } from '../harness/golden.js';

describe('golden — sorties de référence du pipeline CORE (changement jamais accepté automatiquement)', () => {
  for (const name of ['nominal', 'dumbbells_only', 'pain_p2_no_consent', 'out_of_scope']) {
    it(`GOLDEN_CORE_${name.toUpperCase()}`, () => {
      const { result, trace } = runCorePipeline(REQUESTS[name]!, coreContext(`golden/${name}`));
      expectGolden(`core-${name}`, { result, trace });
    });
  }
});
