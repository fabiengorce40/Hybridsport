# RUNNING-5F-PRE-SIGNOFF-IMPLEMENTATION-MAP — ce qui pourrait être implémenté avant les signatures

> **Phase 5F (section M) : classification seulement, rien n’est implémenté.**
>
> **Principe** (repris de Strength) :
> - les valeurs non décidées sont des **paramètres injectés** ;
> - le code tourne en mode **CANDIDATE** derrière un drapeau non production ;
> - la PRODUCTION reste bloquée par le verrou (G1 non signés, ruleset non verrouillé).
>
> **Classes** :
> - SAFE_PRE_SIGNOFF : implémentable maintenant, non production ;
> - AFTER_CORE_EXT_R1_APPROVAL : exige l’approbation humaine de la RFC ;
> - AFTER_HUMAN_DECISIONS : valeurs requises pour être significatif ;
> - PRODUCTION_ONLY_AFTER_SIGNOFF.

| Composant | Classe | Remarque |
|---|---|---|
| Types et analyse des références (`RunningReference`, `RunningReferenceSet`, récence) | SAFE_PRE_SIGNOFF | Bornes de récence injectées (E-RECENCY) |
| Calcul des confiances (référence, prescription : minimum des facteurs) | SAFE_PRE_SIGNOFF | Cadre ordinal ; seuils injectés |
| `SessionEligibilityDecision` (deux étapes) | SAFE_PRE_SIGNOFF | Tables injectées |
| Représentation des domaines d’intensité et des cibles (plages, priorité) | SAFE_PRE_SIGNOFF (modèle interne) / AFTER_CORE_EXT_R1_APPROVAL (sérialisation dans la séance) | |
| Types des archétypes (11) et du module STRIDES | SAFE_PRE_SIGNOFF | |
| Structures de RecentLoadContext (fenêtre, médiane, meilleure exposition tolérée, UNKNOWN) | SAFE_PRE_SIGNOFF | Fenêtre injectée (E-RECENTLOAD) |
| LCA (catégories opérationnelles) | SAFE_PRE_SIGNOFF | Garde-fous injectés |
| Catalogue des codes de raison | SAFE_PRE_SIGNOFF | |
| Cadre de sélection déterministe (tri ordinal, graine) | SAFE_PRE_SIGNOFF | |
| Registre scientifique Running typé + gate (statuts, provenance, blocage G1 en production) | SAFE_PRE_SIGNOFF | Sur le modèle du registre Strength ; **c’est lui qui garantit le blocage de la production** |
| Composition hebdomadaire, progression (restauration / HOLD / baisse), replanification, reprise, taper | SAFE_PRE_SIGNOFF (logique) / AFTER_HUMAN_DECISIONS (valeurs) | Dégradations tracées quand une valeur manque |
| Harnais de tests golden (R1–R12 figés, invariants I1–I20) | SAFE_PRE_SIGNOFF | Les assertions d’**invariants** sont possibles tout de suite ; les assertions de **valeurs** attendent les décisions |
| CORE-EXT-R1 (`run_structure`, `session_record` v4, durée, levier) | **AFTER_CORE_EXT_R1_APPROVAL** | Modification du CORE verrouillé |
| Séances structurées dans `propose()` (séries, cibles RPE et FC) | AFTER_CORE_EXT_R1_APPROVAL | Les séances continues peuvent utiliser `distance` / `timed` existants, sans cible RPE |
| Intégration GlobalPlanner / InterferenceManager (P-HYBRID) | SAFE_PRE_SIGNOFF (contrat) | Dépend du planificateur |
| Activation pour des utilisateurs | **PRODUCTION_ONLY_AFTER_SIGNOFF** | 4 G1 + ruleset verrouillé |
