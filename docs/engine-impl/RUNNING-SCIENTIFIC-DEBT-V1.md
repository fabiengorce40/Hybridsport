# RUNNING-SCIENTIFIC-DEBT-V1 — registre de la dette scientifique restante

> **Phase 5F (section O).** Dette priorisée, **pas traitée à égalité**.
>
> **Catégories** :
> - MUST_RESOLVE_PRE_PRODUCTION : une décision humaine est requise avant la production, dans le périmètre choisi ;
> - CAN_VALIDATE_DURING_BETA : dégradation ou heuristique acceptable, à confronter aux données de bêta ;
> - POST_V1_RESEARCH : hors périmètre V1 ou recherche nécessaire.

| Sujet | Catégorie | Condition | Ce qui manque |
|---|---|---|---|
| Correspondance RPE ↔ domaines (V02) | **MUST_RESOLVE_PRE_PRODUCTION** | Tous les périmètres | Acceptation opérationnelle (E-RPE) ; validation empirique ensuite en bêta |
| RecentLoadContext (V21) | **MUST_RESOLVE_PRE_PRODUCTION** (acceptation) → CAN_VALIDATE_DURING_BETA (réglage de la fenêtre) | Tous | Aucune validation d’agrégation |
| Reprise : politique et frontières (V24, UNKNOWN) | **MUST_RESOLVE_PRE_PRODUCTION** | Tous | Signature G1 |
| Reprise : dose (V34) | MUST_RESOLVE_PRE_PRODUCTION si périmètre C ; sinon POST_V1_RESEARCH | — | Aucune dose défendable |
| Entrée novice (V33) | MUST_RESOLVE_PRE_PRODUCTION si périmètre C ; sinon POST_V1_RESEARCH | — | Aucune dose validée |
| Densité (V10, V11) et récence (V12) | **MUST_RESOLVE_PRE_PRODUCTION** (décision) → CAN_VALIDATE_DURING_BETA | Tous | Heuristiques |
| Incertitude d’allure (V03, V04) | CAN_VALIDATE_DURING_BETA | B, C | Comparer allures tenues et plages |
| Variabilité (V42, V43, V15) | CAN_VALIDATE_DURING_BETA | B, C | Estimation personnelle à partir des données de bêta |
| Récupérations (V08) | CAN_VALIDATE_DURING_BETA | B, C | Mécanisme soutenu, valeurs non |
| Magnitude de progression (V23) | CAN_VALIDATE_DURING_BETA si E-PROG A (restauration ; observer la stagnation) ; MUST_RESOLVE_PRE_PRODUCTION si B ou C | — | Aucune dose–réponse |
| Riegel (V38) | CAN_VALIDATE_DURING_BETA (≤ semi : comparer prédictions et courses réelles) | B, C | Exposant à vérifier (documentaire) |
| Taper hors marathon (V27 application, V28) | CAN_VALIDATE_DURING_BETA | B, C | Aucune preuve par épreuve |
| Long run hors marathon (V32) | CAN_VALIDATE_DURING_BETA | B, C | Associations seulement |
| Premières expositions (V35–V37) | MUST_RESOLVE_PRE_PRODUCTION si E-FIRST A ; sinon non requis | B, C | Aucune preuve |
| Long run marathon, taper marathon | POST_V1_RESEARCH (sauf périmètre C) | — | Observationnel (Smyth), associations |
| Modèle de prédiction intégrant l’entraînement | POST_V1_RESEARCH | — | FUTURE_RFC |
| Variabilité individualisée, contexte lissé | POST_V1_RESEARCH | — | FUTURE_RFC |
