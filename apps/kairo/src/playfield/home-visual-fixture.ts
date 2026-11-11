// The isolated capture workflow is the only build that enables this presentation fixture.
export const HOME_VISUAL_FIXTURE = import.meta.env.VITE_REKKA_HOME_CAPTURE === '1' ? {
  name: 'Alex',
  title: 'Haut du corps B',
  time: '18:30',
  heroProgress: { done: 0, total: 7 },
  sports: [
    { sport: 'strength' as const, done: 2, total: 3 },
    { sport: 'running' as const, done: 1, total: 2 },
  ],
} : undefined;
