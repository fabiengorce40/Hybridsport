# Reprise 2 — Sécurité des données entre onglets et versions de la PWA

**Branche :** `claude/rekka-reprise-20261031`, locale, jamais poussée.

## Risque reproduit avant correction

| Scénario | Reproduction | Résultat sur `fe708a2` (avant correction) |
|---|---|---|
| Deux onglets, même version | `tests/storage-guard-dom.test.tsx` (jsdom) et `scripts/e2e-storage-guard.mjs` A (Chromium) | L'onglet périmé réécrit l'état complet : **la série validée dans l'autre onglet disparaît**. Jsdom : 0 au lieu de 1. Navigateur : 69 séries au lieu de 70. |
| Ancienne version (V2.1, non protégée) restée ouverte après la mise à jour | `e2e-storage-guard.mjs` B, et test jsdom n° 2 | Son écriture v3 remplace les données v4 de la nouvelle version, série comprise, **sans que rien ne le signale** |

Cause : `apps/kairo/src/store.tsx`.
- `commit` appelait `saveState`, qui réécrit tout l'état sans regarder le stockage.
- Aucune synchronisation entre onglets.
- L'ouverture et le retour au premier plan écrivent aussi.

## Protection (schéma v4 inchangé, aucune migration)

`packages/app-core/src/write-guard.ts` (pur, testé), branché dans `apps/kairo/src/store.tsx`.

### Trois clés à côté de `kairo.state`

Préfixe BÊTA inclus.

| Clé | Contenu |
|---|---|
| `kairo.state.stamp` | Révision, version de schéma, empreinte du texte et date de la dernière écriture protégée |
| `kairo.state.guard` | Copie du dernier état écrit sous protection |
| `kairo.state.replaced.<date>` | Version écartée lors d'un choix de l'utilisateur, **jamais supprimée** |

### Écriture gardée
- Un onglet n'écrit que si le stockage est exactement celui qu'il a lu ou écrit en dernier (révision et empreinte).
- Sinon : **rien n'est écrit**, l'état à jour est relu, et l'utilisateur lit « Vos données ont été modifiées dans un autre onglet : elles ont été rechargées. Refaites l'action si besoin. »
- Un contenu identique à celui déjà enregistré n'est pas réécrit : l'ouverture d'un second onglet ne crée pas de conflit.

### Autres onglets
- Un événement `storage` sur l'état (écrit en dernier) déclenche une relecture et l'avis « Données mises à jour depuis un autre onglet. »
- Au retour au premier plan, les données changées entre-temps sont relues **avant** toute préparation de semaine.

### Écrasement par une version non protégée
- **Détection :** au chargement, l'état ne correspond plus à la marque, alors que la copie, elle, y correspond. L'écran « Données remplacées par une autre version » s'affiche.
- **Choix :** « Restaurer les données enregistrées le … » ou « Garder les données actuelles ». **Aucune écriture avant le choix.** La version non retenue reste sur l'appareil.
- **Lecture en cours de session :** un autre onglet peut être entre deux écritures. L'écrasement apparent est alors confirmé après 400 ms avant d'être proposé.

### Ordre d'écriture
Copie, puis marque, puis état. Une interruption laisse une copie et une marque cohérentes avec l'état **voulu** : il reste récupérable.

### Erreur d'écriture
En cas d'erreur (quota par exemple), l'erreur est signalée comme avant, et l'état et la marque sont inchangés.

## Limites

| Limite | Détail |
|---|---|
| Versions déjà installées | Les anciennes versions (BÊTA actuelle, ESSAI V2.1) n'écrivent pas de marque. Leur écrasement n'est **détecté qu'après coup**, au chargement de la nouvelle version, puis réparable par choix. La protection complète vaut entre onglets de versions protégées. |
| Place | La copie double la place de l'état dans le stockage (environ 2 × 217 Ko pour un état réel d'une semaine chargée). |
| Données importées puis remplacées | L'utilisateur choisit entre deux versions **complètes**. Aucune fusion automatique, car il n'existe aucune règle de fusion validée. |

## Tests

| Test | Résultat |
|---|---|
| `packages/app-core/tests/write-guard.test.ts` | 11/11 : première écriture, migration en place, conflits (onglet protégé, écriture non protégée), contenu identique, détection, copie incohérente, « restaurer », « garder », écriture interrompue, quota |
| `apps/kairo/tests/storage-guard-dom.test.tsx` | 2/2. Échouait avant correction : 0 série au lieu de 1 ; écran absent. |
| `scripts/e2e-storage-guard.mjs` (Chromium, vrais onglets, vraie build V2.1) | OK. Avant correction : 69 séries au lieu de 70. |
| `pnpm check` | **3 082 tests réussis**, 2 générateurs ignorés, 0 échec ; types et lint OK |
| E2E complet `e2e-beta.mjs` + `e2e.mjs` | 341 vérifications OK |
| Mise à jour réelle A → B | OK : **4 clés** identiques octet pour octet (état, marque, copie, préférence Planning) |
| Migrations v1, v2, v3 → v4 depuis la build V2.1 | OK |
| Personnalisation 360/390 | OK |
| Icônes et hors ligne | OK |
| Séance mobile, répétitions, chrono isolé | OK |
