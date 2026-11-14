const categories = {
  str_upper: 'upper',
  str_lower: 'lower',
  str_upper_a: 'upper',
  str_upper_b: 'upper',
  str_lower_a: 'lower',
  str_lower_b: 'lower',
  str_full_body: 'full',
} as const;

const labels = { upper: 'Haut du corps', lower: 'Bas du corps', full: 'Full body' };

export function WorkoutIllustration({ archetypeId }: { archetypeId: string | null }) {
  const category = categories[archetypeId as keyof typeof categories];
  if (!category) return null;

  const upper = category === 'lower' ? '#bccce3' : '#1647cb';
  const lower = category === 'upper' ? '#bccce3' : '#e35e4d';

  return <div className="pf-exercise-illustration pf-library-illustration" data-workout-art={category}>
    <svg viewBox="0 0 360 115" role="img" aria-label={labels[category]}>
      <path fill="#fa6a58" opacity=".18" d="M242 115 360 28v87Z"/>
      <path fill="#1647cb" opacity=".08" d="M0 115V82l114 33Z"/>
      <ellipse cx="180" cy="108" rx="36" ry="4" fill="#0e1b35" opacity=".12"/>
      <g stroke="#0e1b35" strokeWidth="2" strokeLinejoin="round">
        <circle cx="180" cy="15" r="9" fill="#e8eff8"/>
        <path fill={upper} d="M173 26h14l13 6 12 29-8 4-11-23-2 19h-22l-2-19-11 23-8-4 12-29Z"/>
        <path fill={lower} d="M169 61h22l5 43h-10l-6-29-6 29h-10Z"/>
        <path fill="#0e1b35" d="M164 104h10v4h-15zm22 0h10l5 4h-15z"/>
      </g>
    </svg>
  </div>;
}
