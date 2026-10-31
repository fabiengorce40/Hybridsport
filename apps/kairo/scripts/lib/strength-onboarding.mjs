/**
 * Parcours E2E historiques — personnalisation Musculation V2.1/V2.2 (7 étapes) devenue obligatoire à l'onboarding dès
 * que la Musculation est choisie. Aide partagée : complète les étapes avec des choix EXPLICITES et rend compte de ce
 * qui a été fait. Objectif par défaut = équivalent de l'ancien objectif par défaut « general » (fitness). Sans assistant affiché (aucune Musculation choisie), ne fait rien et renvoie `false` ; un parcours
 * Musculation qui l'oublierait reste bloqué par « Continuer » désactivé (l'oubli échoue donc visiblement).
 */
/** Équivalents de l'ancien « Niveau d'entraînement général » (seuils : `strength/content/personalization-v1.ts`). */
export const EXPERIENCE = {
  beginner: { months: 6, regularSessions: 2, technique: 'confident' },
  intermediate: { months: 24, regularSessions: 3, technique: 'confident' },
};
const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export async function completeStrengthPersonalization(page, { outcome = 'Me tonifier et me remettre en forme', equipmentPreset = 'preset.full_gym', sessionsPerWeek, experience = EXPERIENCE.beginner, strengthDays, onStage } = {}) {
  const wizard = page.getByRole('region', { name: 'Personnalisation Musculation' });
  if (!(await wizard.count())) return false;
  await wizard.getByRole('button', { name: outcome, exact: true }).click();
  const next = wizard.getByRole('button', { name: 'Suivant · Musculation', exact: true });
  for (let stage = 1; stage <= 6; stage += 1) {
    // Point d'inspection : le parcours appelant vérifie l'étape AVANT tout choix de l'aide (assertions conservées).
    if (onStage) await onStage(stage, wizard, next);
    // Étape 3 (expérience) : équivalent de l'ancien niveau (débutant par défaut, comme l'ancien profil par défaut).
    if (stage === 3) {
      await wizard.getByLabel('Depuis combien de mois pratiquez-vous la musculation ?').fill(String(experience.months));
      await wizard.getByLabel('Séances régulières par semaine sur les derniers mois').selectOption(String(experience.regularSessions));
      await wizard.getByLabel('Maîtrise des mouvements').selectOption(experience.technique);
    }
    // Étape 4 (semaine) : remplace l'ancien « Séances par semaine » de la carte Musculation.
    if (stage === 4 && sessionsPerWeek !== undefined) await wizard.getByLabel('Séances Musculation par semaine').selectOption(String(sessionsPerWeek));
    // Étape 4 : « Jours possibles pour la musculation ». Par défaut, l'assistant les déduit des disponibilités PAR DÉFAUT
    // (l'étape Disponibilités vient après et ne les resynchronise pas, défaut V2.1 signalé) : les parcours qui changent
    // leurs disponibilités choisissent donc explicitement les mêmes jours, comme le ferait un utilisateur averti.
    if (stage === 4 && strengthDays) {
      for (const d of strengthDays) await wizard.getByLabel(d, { exact: true }).check();
      for (const d of WEEKDAYS.filter((x) => !strengthDays.includes(x))) await wizard.getByLabel(d, { exact: true }).uncheck();
    }
    // Étape 5 (matériel) : seule étape sans valeur par défaut valide ; choix explicite du lieu si rien n'est choisi.
    if (await next.isDisabled()) {
      const place = wizard.getByLabel('Lieu d’entraînement');
      if (stage === 5 && await place.count()) await place.selectOption(equipmentPreset);
    }
    await next.click();
  }
  await wizard.getByRole('button', { name: 'Confirmer ma personnalisation' }).click();
  return true;
}
