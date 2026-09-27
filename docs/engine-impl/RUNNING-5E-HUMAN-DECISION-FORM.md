# RUNNING-5E-HUMAN-DECISION-FORM — formulaire de décision humaine

> À remplir **par des personnes habilitées**. Claude ne remplit aucune case. Détail des options : [`RUNNING-5E-EXPERT-DECISION-PACK.md`](RUNNING-5E-EXPERT-DECISION-PACK.md) et [`RUNNING-5E-G1-SAFETY-PACK.md`](RUNNING-5E-G1-SAFETY-PACK.md).
>
> **Priorité** : les décisions marquées ★ appartiennent à l’ensemble minimal d’implémentation.

## Décisions expertes

### ★ E-RPE — bandes RPE (V02)
[ ] A — bandes chevauchantes CR-10 candidates [ ] B — descripteurs verbaux seulement [ ] KEEP BLOCKED
Notes : ____________________ Relecteur : ____________________ Rôle : ____________________ Date : ________

### ★ E-DENSITY — densité HD (V10, V11)
[ ] A — maximum par 7 jours + séparation par défaut [ ] B — maximum seulement [ ] C — séparation seulement [ ] KEEP BLOCKED
Notes : ____________________ Relecteur : ____________________ Rôle : ____________________ Date : ________

### ★ E-RECENCY — récence (V12)
[ ] A — 8 / 16 semaines [ ] B — autres bornes : ______ [ ] KEEP BLOCKED
Notes : ____________________ Relecteur : ____________________ Rôle : ____________________ Date : ________

### ★ E-RECENTLOAD — RecentLoadContext (V21)
[ ] A — 4 semaines, médiane, meilleure exposition tolérée [ ] B — autre fenêtre : ______ [ ] KEEP BLOCKED
Notes : ____________________ Relecteur : ____________________ Rôle : ____________________ Date : ________

### E-PROG — progression au-delà du toléré (V23)
[ ] A — restauration seulement [ ] B — plages par variable (valeurs : ______) [ ] C — unité minimale adaptative (unités : ______) [ ] KEEP BLOCKED
Notes : ____________________ Relecteur : ____________________ Rôle : ____________________ Date : ________

### E-QUALITY — dose de qualité (V31)
[ ] A — aucun minimum dur [ ] B — minimum par stimulus (______) [ ] C — minimum en première exposition seulement [ ] KEEP BLOCKED
Notes : ____________________ Relecteur : ____________________ Rôle : ____________________ Date : ________

### E-LONG — long run (V32)
[ ] A — mécanisme sans maximum produit [ ] B — mécanisme + maximum produit (______) [ ] KEEP BLOCKED
Notes : ____________________ Relecteur : ____________________ Rôle : ____________________ Date : ________

### E-PACE — allure (V03, V04)
[ ] A — ±3 % / ±6 % ; marge 0–5 % [ ] B — plages dérivées de la variabilité [ ] KEEP BLOCKED (RPE seul)
Notes : ____________________ Relecteur : ____________________ Rôle : ____________________ Date : ________

### E-RECOVERY — récupérations (V08)
[ ] A — plages candidates [ ] B — récupérations fixées en durée (______) [ ] KEEP BLOCKED
Notes : ____________________ Relecteur : ____________________ Rôle : ____________________ Date : ________

### E-LOAD — saut de programme (V22)
[ ] A — 130 % sur 2 semaines, plafonnement [ ] B — autre valeur : ______ [ ] KEEP BLOCKED
Notes : ____________________ Relecteur : ____________________ Rôle : ____________________ Date : ________

### E-TAPER — taper (V27, V28)
[ ] A — milieu de plage, ajusté ; marathon 2–3 semaines [ ] B — bornes par épreuve (______) [ ] KEEP BLOCKED
Notes : ____________________ Relecteur : ____________________ Rôle : ____________________ Date : ________

### E-FIRST — premières expositions (V35–V37)
[ ] A — doses d’initiation (______) [ ] B — après test seulement [ ] KEEP BLOCKED
Notes : ____________________ Relecteur : ____________________ Rôle : ____________________ Date : ________

### E-MODEL — extrapolation (V38)
[ ] A — Riegel ≤ semi, exposant vérifié : ______, largeur de prédiction : ______ [ ] B — aucune extrapolation [ ] KEEP BLOCKED
Notes : ____________________ Relecteur : ____________________ Rôle : ____________________ Date : ________

### E-VARIABILITY — variabilité et mises à jour (V42, V43, V15)
[ ] A — personnelle + a priori + repli 2 / 3 / 4 % ; 1× / 2× ; 3 / 2 [ ] B — sans repli [ ] KEEP BLOCKED
Âge utilisé : [ ] oui [ ] non · Minimum de performances personnelles : ______
Notes : ____________________ Relecteur : ____________________ Rôle : ____________________ Date : ________

## Décisions de sécurité G1

### ★ G1-PAIN (`painActionPolicy`, `painWording`)
[ ] A — comportement (1) à (4) et formulations candidates [ ] B — alternative prudente (tout signal ⇒ arrêt) [ ] KEEP BLOCKED
Visa sécurité : [ ] APPROVED [ ] APPROVED WITH CONDITIONS [ ] REJECTED [ ] DEFERRED
Conditions et notes : ____________________ Signataire : ____________________ Rôle : ____________________ Date : ________

### ★ G1-RETURN (`stateBoundaries`, `protocol`, `unknownStateHandling`)
Frontières V24 : [ ] acceptées [ ] modifiées : ______ · UNKNOWN : [ ] accepté · Premier départ (V34) : [ ] reste NO_VALID [ ] dose signée : ______ · Falaise à 28 jours : [ ] acceptée [ ] à traiter
Visa sécurité : [ ] APPROVED [ ] APPROVED WITH CONDITIONS [ ] REJECTED [ ] DEFERRED
Conditions et notes : ____________________ Signataire : ____________________ Rôle : ____________________ Date : ________

### ★ G1-NOVICE (`noviceEntryProtocol`)
[ ] A — course / marche à la durée (dose : ______) [ ] B — continu après capacité démontrée (définition : ______) [ ] C — séance d’observation d’abord (protocole : ______) [ ] D / KEEP BLOCKED — P-R0 hors V1 (règle de périmètre seule)
Visa sécurité : [ ] APPROVED [ ] APPROVED WITH CONDITIONS [ ] REJECTED [ ] DEFERRED
Conditions et notes : ____________________ Signataire : ____________________ Rôle : ____________________ Date : ________

### ★ G1-SCOPE (`outOfScopeTriggers`)
[ ] A — liste et message candidats [ ] B — liste élargie + confirmation de l’utilisateur [ ] KEEP BLOCKED
Visa sécurité : [ ] APPROVED [ ] APPROVED WITH CONDITIONS [ ] REJECTED [ ] DEFERRED
Conditions et notes : ____________________ Signataire : ____________________ Rôle : ____________________ Date : ________
