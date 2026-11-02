# REKKA V2.1 — intégration Android ESSAI

Branche isolée : `codex/rekka-v2-1-android-integration`.
Sources vérifiées : Musculation `297ea6eb416778ec255ca2ac246ac3cafd30e3fc`
et correctif d'icônes `3ec81a84c8e19acc1243a1aa32a214e08acfa89e`.
Cible unique autorisée : https://rekka-v2-android-test.pages.dev/.
Aucune fusion BÊTA/production, aucun import de données personnelles.

## Contenu intégré

Les sept étapes, objectifs et trois priorités au maximum, intentions, niveau,
matériel/récupération, génération et édition depuis Profil → Ma musculation sont
ceux de la branche Musculation validée. Aucun changement de source des moteurs
par rapport à `297ea6e` ; les exports d'icônes sont strictement ceux de `3ec81a8`.

La seule adaptation de livraison est le nom du cache du worker : il inclut le
hash d'icônes **et le commit de build**, pour qu'une évolution applicative active
un nouveau worker même si l'icône reste identique. Même origine, même manifeste,
`id`, `scope`, `start_url` et clés de données. Aucun effacement localStorage ou
IndexedDB ; suppression limitée aux anciens caches de ressources ESSAI.

## Contrôles avant publication

Le workflow `.github/workflows/rekka-v21-android.yml` vérifie d'abord via l'API
Cloudflare et les ressources HTTPS : projet existant, identité, domaine propre,
absence d'intégration Git et de bindings, version actuellement servie `3ec81a8`,
SHA-256 de toutes les icônes corrigées. Une seconde garde recontrôle ces faits
juste avant l'unique commande d'écriture `pages deploy`, explicitement ciblée
sur `rekka-v2-android-test`, branche Cloudflare `android-test`.
Tout échec bloque la publication. Un succès empêche de réexécuter cette release
puisque le précédent commit exigé n'est plus servi.

TypeScript racine/application, ESLint complet, suite Vitest complète, build,
E2E Chromium :

- A–E : fessiers, silhouette bras/abdos, pectoraux/épaules, débutant et hybride.
  Comparaison réelle d'exercices, doses et séries hebdomadaires pondérées E1.
- Prochaines semaines après changement de priorité : prescriptions différentes,
  passé, journaux et charges conservés ; environnement ESSAI candidat explicite.
- Sauvegardes riches fictives v1/v2 : migration additive et conservation exacte.
- Mise à jour navigateur depuis le **build exact actuellement publié** `3ec81a8`,
  avec semaines, performances et charges de la fixture du dépôt ; export/import
  v3 dans un contexte jetable, IndexedDB et clés étrangères inchangées.
- Ancien build v2 testé avec cette v3 : écran « Mise à jour requise », aucune
  réécriture. La v3 n'est pas rétrocompatible avec une application v2.
- Onboarding et vraie séance personnalisée à 360/390 px : série renseignée et
  cochée, repos, pause, +15 s, reprise, rechargement, fin et conservation après
  édition du profil. Pas d'erreur JavaScript ni débordement horizontal.
- Identité PWA, chemins/tailles des PNG, worker, cache d'icônes hors ligne,
  préservation des données et origine BÊTA simulée indépendante.

Après déploiement, contrôle du commit Cloudflare et de `version.json`, empreintes
du HTML, du bundle V2.1 réellement servi, du worker et des PNG, manifeste stable,
BÊTA/production comparées avant/après. Le parcours complet 360/390 est rejoué sur
l'adresse Cloudflare dans des contextes navigateur vierges et jetables.
Les résultats et captures sont archivés dans le run Actions de la branche.

## Vérification sur Samsung

Ouvrir l'URL dans le navigateur d'installation, actualiser, puis ouvrir REKKA
ESSAI. Le mécanisme « Nouvelle version disponible » peut aussi recharger l'app.
Aucune désinstallation et aucun effacement de données nécessaires. L'icône ne
change pas durant cette livraison : les URL et empreintes du correctif officiel
sont conservées.

Pour un ancien profil : Profil → Ma musculation permet de personnaliser les
objectifs. Les séances déjà planifiées restent conservées ; les nouvelles
priorités s'appliquent aux prochaines semaines non encore planifiées.
Pour tester immédiatement une première génération, créer un profil fictif dans
un contexte navigateur distinct ; ne pas réinitialiser le profil existant.

Limites : règles candidates, fréquence Musculation de 1 à 4 séances/semaine,
volume parfois réduit par les autres sports et la récupération ; aucune promesse
de perte de graisse localisée. Une demande hybride de trois séances Musculation
peut être partiellement placée. Les brouillons d'onboarding non confirmés ne sont
pas encore persistés. Le Samsung physique ne peut être contrôlé à distance ;
les vérifications Android sont effectuées dans Chromium à 360/390 px.
