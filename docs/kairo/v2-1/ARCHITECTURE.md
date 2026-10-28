# V2.1 — personnalisation Musculation : contrats et compatibilité

Branche isolée `codex/rekka-v2-1-musculation-personnalisee`, base vérifiée
`ed1e1d6da00f91b3787728105a265b5ebde84978`. Aucun déploiement autorisé.

Audit : Strength possède déjà composition, sélection filtrée, allocation E1,
dosage, références de charge, tracks et progression. Le planificateur possède
le placement et l'interférence multisport. La nouvelle couche ne remplace ni
ces responsabilités ni les moteurs Course, HYROX ou Cross-training.
Les branches parallèles vérifiées (autonomous-cycle, reps-programme-review,
strength-fixes-precheck, strength-r1-r2, v2-2c) n'apportent pas de nouveau contrat
de personnalisation à fusionner. Aucune fusion effectuée.

## Contrat

`StrengthPersonalization` V1 : résultat, zéro à trois priorités ordonnées,
intention par zone, expérience déclarée, durée, jours, récupération, exclusions,
préférences et douleur déclarée. Zéro priorité signifie corps entier.
Aucun genre n'est utilisé pour déterminer la physiologie d'entraînement.

Le champ est optionnel : son absence conserve les objectifs historiques
hypertrophy/strength/general et leur comportement. La personnalisation est
un choix explicite, jamais déduite et activée automatiquement à la migration.
La politique candidate chiffrée est dans `strength/content/personalization-v1.ts`,
chargée comme paramètre G2 facultatif `strength.personalization` dans un contenu
versionné distinct `0.8.0-strength-personalization-v1`. Aucun statut de production
n'est accordé à ces hypothèses. Les plafonds de sécurité existants restent actifs.

## Persistance et compatibilité

Sauvegarde v3 : migration v2 → v3 purement additive (seul schemaVersion change).
Profil, semaines, séances, logs, charges, tracks, performances et chronos restent
inchangés ; les sauvegardes v1/v2 sont relues par les migrations successives.
Une ancienne application v2 ne peut pas lire les nouvelles sauvegardes v3 :
elle les reconnaît comme version future et n'écrase pas le stockage.
Cette compatibilité est ascendante, pas une conversion automatique vers v2.

Les semaines personnalisées portent un instantané `strengthProfile`, réutilisé
pour régénérer leurs séances et appliquer leur progression avec les choix de
leur création. Une édition depuis le profil capture aussi l'ancien profil sur
les semaines historiques qui n'avaient pas d'instantané. Les demandes, leurs
records et résultats restent identiques. Le programme conserve son identité et
ses résultats ; seules ses intentions futures Strength changent. Aucune semaine
déjà planifiée n'est replanifiée par l'éditeur.
