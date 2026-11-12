/** Editorial descriptions keyed by exact catalogue ID. Independent of prescriptions. */
interface ExerciseDetails {
  readonly primary: string;
  readonly secondary: string;
  readonly view: 'avant' | 'arrière' | 'latérale';
  readonly cues: readonly string[];
  readonly tip: string;
}

export const exerciseDetails: Readonly<Partial<Record<string, ExerciseDetails>>> = {
  'ex.bench_press': {
    primary: 'Pectoraux', secondary: 'Triceps · Épaules', view: 'avant',
    cues: ['Banc horizontal', 'Saisie légèrement plus large que les épaules', 'Descente contrôlée – 2 s', 'Poussée explosive'],
    tip: 'Garde les pieds stables et les omoplates rapprochées. Pousse sans faire rebondir la barre sur la poitrine.',
  },
  'ex.db_bench_press': {
    primary: 'Pectoraux', secondary: 'Triceps · Deltoïdes antérieurs', view: 'avant',
    cues: ['Installe-toi sur un banc horizontal avec deux haltères.', 'Stabilise les pieds et garde les poignets au-dessus des coudes.', 'Descends les haltères de chaque côté de la poitrine.', 'Remonte les deux haltères sans les entrechoquer.'],
    tip: 'Garde une trajectoire symétrique et une amplitude que tu peux contrôler.',
  },
  'ex.barbell_ohp': {
    primary: 'Deltoïdes antérieurs et moyens', secondary: 'Triceps', view: 'avant',
    cues: ['Place la barre devant les épaules, avant-bras verticaux.', 'Serre les fessiers et stabilise le tronc.', 'Pousse la barre au-dessus de la tête, près du visage.', 'Redescends vers les épaules sans élan des jambes.'],
    tip: 'Évite de compenser la poussée en creusant le bas du dos.',
  },
  'ex.seated_cable_row': {
    primary: 'Grand dorsal · Trapèzes moyens · Rhomboïdes', secondary: 'Fléchisseurs du coude', view: 'arrière',
    cues: ['Assieds-toi face à la poulie basse, pieds sur les appuis.', 'Saisis la poignée et garde le buste stable.', 'Tire la poignée vers le bas des côtes.', 'Accompagne le retour sans laisser les plaques retomber.'],
    tip: 'Évite de balancer le buste pour terminer le tirage.',
  },
  'ex.machine_row': {
    primary: 'Grand dorsal · Trapèzes moyens · Rhomboïdes', secondary: 'Fléchisseurs du coude', view: 'arrière',
    cues: ['Règle le siège à hauteur des poignées.', 'Prends appui sur le support thoracique si la machine en dispose.', 'Tire les poignées vers toi en gardant le buste stable.', 'Relâche progressivement jusqu’à retrouver la position initiale.'],
    tip: 'Choisis une position de siège qui te permet de tirer sans hausser les épaules.',
  },
  'ex.pull_up': {
    primary: 'Grand dorsal · Grand rond', secondary: 'Fléchisseurs du coude', view: 'arrière',
    cues: ['Suspends-toi à une barre fixe, paumes vers l’avant.', 'Stabilise le tronc avant de commencer.', 'Amène les coudes vers le bas pour te hisser.', 'Redescends sous contrôle sans balancer les jambes.'],
    tip: 'Garde la tête dans le prolongement du tronc en haut du mouvement.',
  },
  'ex.back_squat': {
    primary: 'Quadriceps · Fessiers', secondary: 'Adducteurs', view: 'latérale',
    cues: ['Place la barre sur le haut du dos, dans un rack.', 'Prends appui sur tout le pied.', 'Fléchis les hanches et les genoux, genoux dans l’axe des pieds.', 'Remonte en gardant la barre au-dessus du milieu des pieds.'],
    tip: 'Règle les sécurités du rack et garde une profondeur que tu contrôles.',
  },
  'ex.romanian_deadlift': {
    primary: 'Ischio-jambiers · Fessiers', secondary: 'Érecteurs du rachis (stabilisation)', view: 'arrière',
    cues: ['Commence debout, barre devant les cuisses.', 'Déverrouille légèrement les genoux.', 'Recule les hanches et garde la barre proche des jambes.', 'Arrête la descente avant de perdre le contrôle du dos, puis redresse les hanches.'],
    tip: 'La profondeur dépend de l’amplitude disponible aux hanches. La barre peut rester au-dessus du sol.',
  },
  'ex.db_lateral_raise': {
    primary: 'Deltoïdes moyens', secondary: 'Trapèzes supérieurs', view: 'avant',
    cues: ['Tiens un haltère dans chaque main, bras le long du corps.', 'Garde les coudes légèrement fléchis.', 'Monte les bras sur les côtés, légèrement en avant du buste.', 'Redescends sans élan ni haussement volontaire des épaules.'],
    tip: 'Garde une charge qui te permet de contrôler la descente.',
  },
  'ex.db_curl': {
    primary: 'Biceps · Brachial', secondary: 'Brachioradial', view: 'avant',
    cues: ['Tiens un haltère dans chaque main, coudes près du buste.', 'Tourne les paumes vers l’avant.', 'Fléchis les coudes sans balancer le tronc.', 'Déplie les bras sous contrôle.'],
    tip: 'Garde les poignets dans l’axe des avant-bras.',
  },
  'ex.dead_bug': {
    primary: 'Abdominaux (stabilisation)', secondary: '', view: 'avant',
    cues: ['Allonge-toi sur le dos, bras verticaux et genoux au-dessus des hanches.', 'Expire et stabilise le bassin.', 'Éloigne lentement un bras et la jambe opposée.', 'Reviens au centre et alterne les côtés.'],
    tip: 'Réduis l’amplitude si le bassin bouge ou si le bas du dos se creuse.',
  },
};
