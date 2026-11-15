import upper from './assets/workout-upper.webp';
import lower from './assets/workout-lower.webp';
import full from './assets/workout-full.webp';

const categories = new Map<string, keyof typeof illustrations>([
  ['str_upper', 'upper'],
  ['str_upper_a', 'upper'],
  ['str_upper_b', 'upper'],
  ['str_lower', 'lower'],
  ['str_lower_a', 'lower'],
  ['str_lower_b', 'lower'],
  ['str_full_body', 'full'],
] as const);

const illustrations = {
  upper: { src: upper, label: 'Haut du corps' },
  lower: { src: lower, label: 'Bas du corps' },
  full: { src: full, label: 'Full Body' },
};

export function WorkoutIllustration({ archetypeId }: { archetypeId: string | null }) {
  const category = archetypeId === null ? undefined : categories.get(archetypeId);
  const illustration = category ? illustrations[category] : undefined;

  return <div className="pf-exercise-illustration pf-library-illustration" data-workout-art={category ?? 'neutral'}>
    {illustration ? <img src={illustration.src} alt={illustration.label}
      width={1080} height={360} loading="lazy" decoding="async"/> :
      <span className="pf-exercise-art-placeholder">
        <svg aria-hidden="true" viewBox="0 0 32 32" width="32" height="32" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="6" y="8" width="5" height="16" rx="2"/>
          <rect x="21" y="8" width="5" height="16" rx="2"/>
          <path d="M11 16h10M3 13v6m26-6v6"/>
        </svg>
        Musculation
      </span>}
  </div>;
}
