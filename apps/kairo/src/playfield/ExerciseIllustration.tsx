import type { ComponentType } from 'react';
import { PlayfieldBenchArt } from './ExerciseArt.js';
import benchPressReference from './assets/bench-press-reference.webp';

function BarbellBenchPress() {
  return <img src={benchPressReference} alt="Développé couché à la barre"
    width={853} height={272} loading="lazy" decoding="async"/>;
}

function DumbbellBenchPress() {
  return <PlayfieldBenchArt dumbbells/>;
}

const illustrations = new Map<string, ComponentType>([
  ['ex.bench_press', BarbellBenchPress],
  ['ex.db_bench_press', DumbbellBenchPress],
]);

export function ExerciseIllustration({ exerciseId }: { exerciseId: string }) {
  const Illustration = illustrations.get(exerciseId);
  return <div className="pf-exercise-illustration pf-library-illustration"
    data-exercise-art={exerciseId} data-art-available={Boolean(Illustration)}>
    {Illustration ? <Illustration/> : <span className="pf-exercise-art-placeholder">
      <svg aria-hidden="true" viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="6" width="24" height="20" rx="4"/>
        <path d="m4 23 8-8 5 5 4-4 7 7"/>
        <circle cx="21" cy="12" r="2"/>
      </svg>
      Illustration indisponible
    </span>}
  </div>;
}
