/** Politique V2.1 CANDIDATE, hypothèses explicites pour l'essai. Aucune autorité médicale ou production. */
export const PERSONALIZATION_V1 = {
  version: '1.0.0-candidate', status: 'candidate',
  noviceMonths: 3, beginnerMonths: 12, advancedMonths: 36, regularMinimum: 2,
  priorityFraction: 0.5, limitedFactor: 0.7, hybridFactor: 0.75,
  recoveryHours: 36, noviceSetsMax: 2, cautiousRir: 4,
  zones: {
    glutes: { muscles: ['glutes'], groups: ['glutes'], region: 'lower', needs: ['hip_dominant', 'single_leg'] },
    thighs: { muscles: ['quadriceps','hamstrings'], groups: ['quads','hamstrings'], region: 'lower', needs: ['knee_dominant','isolation_lower'] },
    calves: { muscles: ['calves'], groups: ['calves'], region: 'lower', needs: ['calves'] },
    abs: { muscles: ['abs_obliques'], groups: ['core'], region: 'core', needs: ['trunk'] },
    back: { muscles: ['lats','upper_back_traps'], groups: ['back'], region: 'upper', needs: ['pull_horizontal','pull_vertical'] },
    shoulders: { muscles: ['front_delts','side_delts','rear_delts'], groups: ['shoulders'], region: 'upper', needs: ['push_vertical','isolation_upper'] },
    chest: { muscles: ['chest'], groups: ['chest'], region: 'upper', needs: ['push_horizontal','isolation_upper'] },
    arms: { muscles: ['biceps','triceps'], groups: ['arms'], region: 'upper', needs: ['isolation_upper'] },
  },
  intentions: {
    volume: { reps: { min: 8, max: 12 }, rir: 2, restMinS: 90 },
    appearance: { reps: { min: 10, max: 15 }, rir: 3, restMinS: 75 },
    strengthen: { reps: { min: 5, max: 8 }, rir: 3, restMinS: 120 },
    endurance_control: { reps: { min: 12, max: 20 }, rir: 4, restMinS: 60 },
  },
  goals: {
    muscle: { method: 'hypertrophy', strategy: 'Hypertrophie progressive, avec spécialisation mesurée des zones prioritaires', volumeFactor: 1 },
    silhouette: { method: 'hypertrophy', strategy: 'Renforcement et recomposition corporelle ; aucune perte de graisse localisée', volumeFactor: 0.85 },
    fat_loss: { method: 'general', strategy: 'Maintien musculaire et activité régulière ; la perte de graisse dépend du bilan énergétique global', volumeFactor: 0.8 },
    fitness: { method: 'general', strategy: 'Apprentissage des mouvements et progression graduelle', volumeFactor: 0.75 },
    strength: { method: 'strength', strategy: 'Force sur les mouvements principaux ; accessoires selon vos priorités', volumeFactor: 1 },
    performance: { method: 'general', strategy: 'Renforcement complémentaire ; récupération et sports prioritaires avant volume supplémentaire', volumeFactor: 0.75 },
    mobility: { method: 'general', strategy: 'Renforcement accessible et contrôle du mouvement ; sans traitement médical', volumeFactor: 0.65 },
    recomposition: { method: 'hypertrophy', strategy: 'Développement musculaire progressif et évolution globale de la composition corporelle', volumeFactor: 0.85 },
  },
};
