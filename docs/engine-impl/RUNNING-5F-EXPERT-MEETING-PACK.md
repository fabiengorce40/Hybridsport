# RUNNING-5F-EXPERT-MEETING-PACK — dossier de réunion expert (14 décisions)

> Une fiche courte par décision. Détails et preuves : `RUNNING-5E-EXPERT-DECISION-PACK.md`.
>
> - **Vérif.** : SS = résumé de recherche (Claude) ; EXT-A = vérifié par le contre-audit externe au niveau abstract.
> - **Scope** : périmètre où la décision est obligatoire (voir `RUNNING-5F-SCOPE-OPTIONS.md`).
> - **Rien n’est coché d’avance.**

---

### 1. E-RPE — bandes RPE · Scope A, B, C
- **Question** : les bandes CR-10 chevauchantes (easy ≤ 3 ; STEADY 3–5 ; seuil 5–7 ; sévère 7–9 ; test 9–10), combinées au contexte, sont-elles acceptées ?
- **Pourquoi** : toute séance sans montre dépend du RPE.
- **Preuve** : sRPE valide (Foster, SS) ; aucune correspondance validée entre RPE et domaine.
- **Incertitude** : élevée.
- **A** : bandes acceptées → cibles RPE sur toutes les séances.
- **B** : descripteurs verbaux seuls → pas de nombres, cibles moins précises.
- **KEEP BLOCKED** → ruleset non verrouillable, pas de production.
- **Exemple golden** : R9 (seuil RPE seul).
- Décision : ☐A ☐B ☐KEEP BLOCKED · Conditions : ______ · Relecteur : ______ · Date : ______

### 2. E-DENSITY — séances exigeantes · Scope A, B, C
- **Question** : maximum HD par 7 jours (P-R1 1, P-R2 2, P-R3 2, P-R4 3) + séparation forte par défaut ?
- **Pourquoi** : c’est la base de la composition hebdomadaire.
- **Preuve** : contexte García-Pinillos (SS), pas un maximum démontré.
- **A** : maximum + séparation → goldens actuels.
- **B** : maximum seul → des séances HD consécutives deviennent possibles.
- **C** : séparation seule → plus de séances HD possibles chez les avancés.
- **KEEP BLOCKED** → pas de verrouillage.
- **Exemple golden** : R2 (la LONG_RUN n’est pas désignée faute de place), R10 (DROP).
- Décision : ☐A ☐B ☐C ☐KEEP BLOCKED · Conditions : ______ · Relecteur : ______ · Date : ______

### 3. E-RECENCY — récence des références · Scope A, B, C
- **Question** : RECENT ≤ 8 semaines, AGING 9–16, STALE > 16 (sous condition de continuité) ?
- **Preuve** : Mujika (SS, qualitatif).
- **A** : accepté.
- **B** : autres bornes (______).
- **KEEP BLOCKED** → pas de verrouillage.
- **Exemple golden** : C7 (même temps récent contre ancien).
- Décision : ☐A ☐B ☐KEEP BLOCKED · Conditions : ______ · Relecteur : ______ · Date : ______

### 4. E-RECENTLOAD — contexte de charge récente · Scope A, B, C
- **Question** : 4 semaines, médiane, meilleure exposition tolérée (pas un maximum sûr), réponse négative définie par les données du produit ?
- **Preuve** : aucune validation ; mise en garde contre les ratios (SS).
- **A** : accepté.
- **B** : autre fenêtre (3 ou 6 semaines).
- **KEEP BLOCKED** → pas de LCA verrouillable.
- **Exemple golden** : R4 (restauration du long run à 90 min).
- Décision : ☐A ☐B ☐KEEP BLOCKED · Conditions : ______ · Relecteur : ______ · Date : ______

### 5. E-PACE — cibles d’allure · Scope B, C
- **Question** : HIGH ±3 %, MEDIUM ±6 %, marge du seuil 0–5 % ?
- **Preuve** : variabilité entre courses de 1,2 à 4,2 % (Hopkins, EXT-A).
- **A** : accepté → allures sur piste et route.
- **B** : plages dérivées de la variabilité estimée → dépend d’E-VARIABILITY.
- **KEEP BLOCKED** → RPE seul.
- **Exemple golden** : R5 (seuil 246–258 s/km).
- Décision : ☐A ☐B ☐KEEP BLOCKED · Conditions : ______ · Relecteur : ______ · Date : ______

### 6. E-VARIABILITY — variabilité, conflits, mises à jour · Scope B, C
- **Question** : estimation personnelle (minimum de performances : ______) + a priori par distance et par niveau (Hopkins) + repli produit 2 / 3 / 4 % ou aucun ; multiples 1× / 2× ; règle 3 observations / 2 semaines ; âge utilisé ou non ?
- **Preuve** : Hopkins (EXT-A). Sexe non établi.
- **A** : avec repli produit.
- **B** : sans repli (conflit MAJOR par défaut).
- **KEEP BLOCKED** → mises à jour sur performance seulement.
- **Exemple golden** : R9 (conflit MAJOR).
- Décision : ☐A ☐B ☐KEEP BLOCKED · Conditions : ______ · Relecteur : ______ · Date : ______

### 7. E-MODEL — extrapolation · Scope B, C
- **Question** : Riegel pour une cible ≤ semi, avec quel exposant (provenance vérifiée) et quelle largeur de prédiction (distincte de V03 et de V43) ?
- **Preuve** : Vickers 2016 (SS) : calibré jusqu’au semi, biaisé au marathon.
- **A** : Riegel ≤ semi (exposant : ______ ; largeur : ______).
- **B** : aucune extrapolation, calibration.
- **KEEP BLOCKED** = B.
- **Exemple golden** : R4 (allure semi suspendue).
- Décision : ☐A ☐B ☐KEEP BLOCKED · Conditions : ______ · Relecteur : ______ · Date : ______

### 8. E-LOAD — garde-fou de saut de programme · Scope B, C
- **Question** : P-R0 et P-R1 : semaine au-delà de 130 % de celle d’il y a 2 semaines ⇒ plafonnée (garde-fou produit, pas de la sécurité) ?
- **Preuve** : association (Nielsen, SS).
- **A** : accepté.
- **B** : autre valeur (______).
- **KEEP BLOCKED** → P-R1 limité au HOLD.
- **Exemple golden** : R2 (105 % ⇒ aucun effet).
- Décision : ☐A ☐B ☐KEEP BLOCKED · Conditions : ______ · Relecteur : ______ · Date : ______

### 9. E-PROG — progression au-delà du toléré · Scope B, C
- **Question** : le moteur peut-il dépasser `bestToleratedExposure`, et selon quelle règle ?
- **Preuve** : 10 % non protecteur (Buist, EXT-A) ; aucune magnitude universelle.
- **A** : restauration seulement.
- **B** : plages par variable (______).
- **C** : unité minimale adaptative (______).
- **KEEP BLOCKED** = A.
- **Conséquences** : A = stagnation au-delà du démontré ; B ou C = valeurs à fixer.
- **Exemple golden** : R3 (HOLD), R4 (restauration).
- Décision : ☐A ☐B ☐C ☐KEEP BLOCKED · Conditions : ______ · Relecteur : ______ · Date : ______

### 10. E-FIRST — premières expositions · Scope B, C
- **Question** : prescrire une première séance de seuil, sévère ou de côtes sans historique ?
- **Preuve** : aucune.
- **A** : doses d’initiation (______ × 3).
- **B** : après un test seulement.
- **KEEP BLOCKED** → pas de première exposition.
- **Exemple golden** : R12 (seuil bloqué), R9 (VO2 bloqué).
- Décision : ☐A ☐B ☐KEEP BLOCKED · Conditions : ______ · Relecteur : ______ · Date : ______

### 11. E-TAPER — taper · Scope B (hors marathon), C (avec marathon)
- **Question** : règle de sélection dans la réduction de 41–60 % ; durée du marathon (2–3 semaines, observationnel) ; autres épreuves ?
- **Preuve** : Wang (EXT-A), Bosquet (SS), Smyth (texte intégral vérifié par le contre-audit, observationnel).
- **A** : milieu de plage ajusté ; marathon 2–3 semaines.
- **B** : bornes par épreuve (______).
- **KEEP BLOCKED** → dernière semaine, sélection laissée à l’utilisateur.
- **Exemple golden** : R11 (96,0–141,6 min).
- Décision : ☐A ☐B ☐KEEP BLOCKED · Conditions : ______ · Relecteur : ______ · Date : ______

### 12. E-LONG — long run · Scope C (facultatif en B)
- **Question** : accepter le mécanisme (long run toléré récent, objectif, phase, contexte, temps restant, charge concurrente, niveau) ? Faut-il un maximum produit ?
- **Preuve** : associations au marathon (SS).
- **A** : mécanisme, sans maximum produit.
- **B** : mécanisme + maximum produit (______).
- **KEEP BLOCKED** → HOLD ou restauration ; marathon exclu.
- **Exemple golden** : R6.
- Décision : ☐A ☐B ☐KEEP BLOCKED · Conditions : ______ · Relecteur : ______ · Date : ______

### 13. E-RECOVERY — récupérations · Scope C (facultatif en B)
- **Question** : plages récupération / travail par type de séance (seuil 0,20–0,35 ; sévère 0,5–1,0 ; court 0,5–1,0) pour les premières expositions et le taper ?
- **Preuve** : mécanisme (SS) ; aucun ratio universel.
- **A** : plages acceptées.
- **B** : récupérations fixées en durée (______).
- **KEEP BLOCKED** → historique seulement.
- **Exemple golden** : R11 S2.
- Décision : ☐A ☐B ☐KEEP BLOCKED · Conditions : ______ · Relecteur : ______ · Date : ______

### 14. E-QUALITY — dose minimale de qualité · Scope C (facultatif en B)
- **Question** : un minimum de travail est-il requis pour étiqueter une séance par stimulus ?
- **Preuve** : critère d’inclusion ≠ minimum (Bacon, SS).
- **A** : aucun minimum dur.
- **B** : minimum par stimulus (______).
- **C** : minimum en première exposition seulement.
- **KEEP BLOCKED** = A.
- **Exemple golden** : R11 (séance de seuil de 10 min).
- Décision : ☐A ☐B ☐C ☐KEEP BLOCKED · Conditions : ______ · Relecteur : ______ · Date : ______
