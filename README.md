# BATIYO

**L'assistant intelligent de gestion des artisans et petites entreprises** — Togo / Afrique de l'Ouest.
Interface en français, montants en FCFA, pensée d'abord pour le téléphone, utilisable **hors connexion**.

> BATIYO aide un artisan à créer ses devis, les transformer en factures, suivre ses chantiers,
> enregistrer ses dépenses et connaître sa rentabilité — sans comptabilité complexe et **sans
> aucun paiement en ligne**.

---

## 1. Démarrage rapide

```bash
npm install          # jsdom + playwright (tests uniquement)
npm run serve        # http://localhost:8080
```

Puis, dans le navigateur :

| Action | Comment |
|---|---|
| **Voir l’application** | bouton « Voir l’application » sur la page d'accueil, ou connexion avec un compte BATIYO créé via l’inscription |
| **Créer un compte** | « Commencer gratuitement » → nom, téléphone/email, mot de passe, entreprise, **métier obligatoire** |
| **Tester hors connexion** | outils du navigateur (onglet Réseau → Hors connexion) : l'application reste utilisable, un bandeau l'indique |

L'application se lance **en tant que visiteur** : aucune connexion automatique, le choix
(inscription, connexion ou démonstration) appartient à l'utilisateur.

---

## 2. Périmètre fonctionnel

### Chaîne principale
`CLIENT → DEVIS → CHANTIER → BUDGET → DÉPENSES → ANALYSE → FACTURE`

### Écrans livrés

**Publics** — Accueil (landing), Tarifs, FAQ, Connexion, Inscription, Conditions, Confidentialité, Mentions légales.

**Application** — Tableau de bord · Devis (liste, création assistée en 4 étapes, détail, modification) ·
Factures (liste, détail, paiements manuels, création) · Clients (liste, fiche, historique) ·
Chantiers (liste, fiche complète : budget, dépenses, rentabilité, avancement, photos, notes) ·
Dépenses (filtres, catégories, période, export CSV) · Catalogue (par métier, favoris, ajout rapide) ·
Documents · Analyse · Assistant BATIYO · Profil · Paramètres · Page introuvable.

### Métiers couverts (12)
Maçon · Plombier · Électricien · Peintre · Menuisier · Carreleur · Soudeur · Frigoriste ·
Mécanicien · Quincaillier · Commerçant · Autre — chacun avec son catalogue (166 articles modèles),
ses modèles de devis et sa répartition budgétaire conseillée.

Le métier choisi à l'inscription **pilote le catalogue** : l'utilisateur ne le ressaisit jamais.
Changer de métier n'altère aucun document existant (avertissement explicite dans le profil).

---

## 3. Ce que BATIYO ne fait pas (assumé et affiché)

- **Aucun paiement en ligne** : pas de Stripe, PayPal, Mobile Money, banque. Uniquement des champs
  saisis à la main (acompte, montant payé, reste à payer, statut de paiement). Les documents et
  l'application l'écrivent noir sur blanc.
- **Aucune fausse IA** : l'assistant travaille **uniquement** avec les données enregistrées de
  l'utilisateur. Les calculs (totaux, marges, écarts) viennent de fonctions déterministes ; l'assistant
  ne crée ou ne modifie jamais une donnée sans **confirmation explicite** (Confirmer / Annuler) et
  répond « Je ne trouve pas cette information dans vos données enregistrées. » si la réponse n'y est pas.
- **Pas d'outil comptable** : BATIYO est un outil de gestion artisanale. Les résultats sont présentés
  comme **estimations** (« résultat provisoire », « selon les données enregistrées »), avec une
  distinction nette entre *marge prévisionnelle* et *résultat provisoire*, et entre *budget prévu*,
  *dépenses réelles* et *écart*.
- **Aucune règle fiscale codée en dur** : la taxe est configurable (actif/inactif, nom, taux, mode
  inclus/exclu) et désactivée par défaut.
- Pas de marketplace, livraison, CRM avancé, stock complexe, système bancaire.

---

## 4. Architecture

```
batiyo/
├── index.html                 # coquille de l'application (écran de démarrage inclus)
├── manifest.json · sw.js      # PWA : installation + mise en cache hors connexion
├── icon.svg
├── src/
│   ├── 01-config.js           # constantes : unités, catégories, statuts, paramètres par défaut
│   ├── 02-professions.js      # 12 métiers : catalogues, modèles de devis, profils budgétaires
│   ├── 03-utils.js            # formatage FCFA / dates FR, helpers DOM, téléchargement, WhatsApp
│   ├── 04-storage.js          # adaptateurs Mémoire / localStorage / session (+ repli quota)
│   ├── 05-calculations.js     # calculs purs : lignes, totaux, taxes, marges, écarts, alertes
│   ├── 06-core.js             # session, numérotation humaine, authService, profileService
│   ├── 07-repository.js       # DataRepository / LocalRepository / SupabaseRepository
│   ├── 08-reference.js        # référentiel métier local hors connexion, sans données utilisateur
│   ├── 09-services.js         # client, catalogue, devis, factures, chantiers, dépenses, documents,
│   │                          # photos, notifications, assistant, analyse, recherche, fournisseurs
│   ├── 10-assistant.js        # assistant déterministe (réponses + actions à confirmer)
│   ├── 11-pdf.js              # devis et factures imprimables, partage WhatsApp, export CSV
│   ├── 13-ui.js               # bibliothèque d'interface (icônes, modales, toasts, champs, graphiques)
│   ├── 14-screens-public.js   # accueil, connexion, inscription, onboarding, tarifs, FAQ, pages légales
│   ├── 15-shared.js            # composants partagés (sélecteurs, formulaires, éditeur de lignes, totaux)
│   ├── 16-screens-dashboard.js # tableau de bord, analyse, formulaire de dépense, notifications
│   ├── 17-screens-docs.js      # devis et factures (listes, éditeurs, détails, paiements)
│   ├── 18-screens-ops.js       # clients, catalogue, chantiers, dépenses, documents, assistant, profil
│   ├── 19-app.js               # routeur, coquille applicative, réseau, PWA, démarrage
│   └── styles.css              # système de design (jetons, composants, responsive, impression)
├── supabase/                   # base de données prête à connecter (voir supabase/README.md)
├── tools/                      # serveur local, captures d'écran, génération du référentiel SQL
└── tests/                      # tests de logique, d'interface et de parcours
```

L'ordre de chargement des modules est donné par leur préfixe numérique (`01` → `19`).
Chaque fichier est un module autonome qui s'attache à l'objet global `BATIYO`.

### Règles structurantes

| Sujet | Règle appliquée |
|---|---|
| **Argent** | Entiers en FCFA, jamais de flottant ; formatage `5 500 000 FCFA` ; dates `29 septembre 2026` / `29/09/2026` |
| **Numérotation** | `DEV-2026-0001`, `FAC-2026-0001`, `CH-2026-0001`, `DEP-2026-0001` — **un compteur par entreprise** |
| **Documents figés** | Chaque ligne conserve son libellé, sa quantité, son unité et son prix : modifier le catalogue ne change aucun document existant |
| **Multi-entreprises** | Toute donation métier porte `business_id` ; sans entreprise active, aucune donnée n'est visible |
| **Synchronisation** | `created_at, updated_at, deleted_at, sync_status, local_id, remote_id, created_by, updated_by` + suppression logique |
| **Hors connexion** | Écriture locale d'abord, file de synchronisation, indicateur « En ligne / Hors connexion / Synchronisation » |
| **Suppressions** | Confirmation systématique : « Cette action ne pourra pas être annulée. » |

---

## 5. Tests

```bash
npm test                  # 31 tests de logique métier (Node)
npm run test:dom          # 62 tests d'interface (jsdom, sans navigateur)
npm run test:parcours     # 40 vérifications de parcours (navigateur réel, 390×844)
npm run captures          # 42 captures d'écran + contrôle visuel (mobile, tablette, desktop, PDF)
```

Le serveur doit tourner (`npm run serve`) pour les tests de parcours et les captures.
Sous Linux, si Chromium ne trouve pas ses bibliothèques :
`export LD_LIBRARY_PATH=$HOME/.local/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH`.

**Ce que couvrent les tests**

- *Logique* : catalogues par métier, calculs (lignes, remises, taxes, marges, écarts, statuts
  budgétaires), cycle complet client → devis → facture → chantier → dépenses, duplication,
  mémoire des prix, isolation entre entreprises, assistant (questions, création avec confirmation,
  refus honnête), numérotation, formatage FCFA/dates, paramètres de taxe, versions et historique.
- *Interface* (jsdom) : démarrage, landing, onboarding, garde des routes privées, navigation,
  chaque écran principal, états hors connexion, absence d'erreur JS.
- *Parcours* (Chromium) : inscription → onboarding → client → devis (4 étapes, catalogue, totaux)
  → PDF → conversion en facture → chantier → dépense → assistant → hors connexion → rechargement.
- *Visuel* : 42 captures mobile / tablette / desktop, détection des débordements horizontaux,
  des textes trop petits, des écrans vides, plus l'impression PDF réelle des documents.

---

## 6. Données locales et absence de compte démo

La version de production ne crée **aucun compte, client, devis, facture ou chantier de démonstration**.

Au premier démarrage, BATIYO charge uniquement le référentiel nécessaire hors connexion : métiers, catégories, unités et catalogue modèle. Les données utilisateur sont créées uniquement après inscription/authentification et restent isolées par entreprise.

Le dashboard public contient quelques chiffres statiques uniquement comme **illustration visuelle de l'interface** ; ils ne sont jamais enregistrés dans la base de données et ne deviennent jamais des données d'un utilisateur.


## 7. Base de données (Supabase)

Le dossier `supabase/` contient le schéma complet, les politiques de sécurité, les fonctions et le
référentiel (métiers, unités, catégories, catalogues). **L'application fonctionne sans Supabase** :
les données vivent sur l'appareil. Le branchement se fait en une étape, décrite dans
[`supabase/README.md`](supabase/README.md).

```bash
npm run sync:reference    # régénère supabase/04-reference.sql depuis la configuration
```

---

## 8. PWA et hors connexion

- `manifest.json` : application installable, raccourcis « Nouveau devis / Dépenses / Assistant ».
- `sw.js` : mise en cache de l'application ; les données sont déjà locales.
- Bandeau « Installer BATIYO » (Android/Chrome) et indication d'installation sur iOS.
- Messages prévus : « Vous êtes hors connexion. Vos données locales restent accessibles. » puis
  « Connexion rétablie. » / « Synchronisation disponible. »

> Ouvrir `index.html` directement depuis le disque fonctionne pour l’aperçu local, mais
> l'installation et le mode hors connexion nécessitent de servir le dossier (`npm run serve`).

---

## 9. Limites connues de cette version

- La connexion utilise Supabase Auth lorsque la clé publique du projet est configurée ; le cache local reste disponible pour l’offline-first.
- Le catalogue de référence est fourni ; la lecture de reçus par photo et la saisie vocale
  ne sont **pas** implémentées et ne sont jamais annoncées comme disponibles.
- Une seule entreprise par compte dans cette version (le schéma multi-entreprises est en place).
- La réinitialisation de l'espace de démonstration se fait dans *Paramètres → Mes données*.

---

## 10. Journal de vérification (état livré)

| Vérification | Résultat |
|---|---|
| 31 tests de logique métier | ✅ passent |
| 62 tests d'interface (jsdom) | ✅ passent |
| 40 vérifications de parcours (navigateur réel) | ✅ passent |
| 42 captures d'écran (mobile 390 / tablette 1024 / desktop 1440) | ✅ aucun débordement, aucune erreur JS |
| Documents PDF (devis + facture) imprimés réellement | ✅ conformes |

Défauts corrigés pendant la vérification : isolation des données par entreprise sur le tableau de
bord et les dépenses ; **tableaux de devis/factures et d'analyse budgétaire illisibles sur téléphone
(colonnes masquées et valeurs reportées sous la désignation) ; boutons d'action collants qui
recouvraient le contenu ; bouton flottant limité aux écrans de liste ; stepper tronqué ; maquette
d'écran qui masquait la photo du hero ; balise HTML manquante déplaçant le badge dans la maquette ; classement « Transport du sable » en poste Sablé ; grille de chantiers
illisible à 2 colonnes sur téléphone ; filtres provoquant un débordement horizontal ; bouton
flottant masquant le contenu ; boutons de validation absents des modales de formulaire ; état du
formulaire de devis perdu à chaque étape ; numérotation non repartie à zéro pour une nouvelle
entreprise ; avertissement « aucun paiement en ligne » manquant sur les devis.

---

## 11. Ressources visuelles

| Fichier | Usage |
|---|---|
| `assets/hero-artisan-1.jpg` | photo du hero — artisan maçon sur un chantier à Lomé, téléphone en main |
| `assets/hero-artisan-2.jpg` | variante (artisane électricienne) — disponible pour A/B tester le hero |
| `assets/app-*.png` | captures d'écran de l'application (devis, tableau de bord) |

La maquette superposée à la photo est **dessinée dans `heroAppMockup()`** (dans
`src/14-screens-public.js`) : elle reproduit l'écran de création de devis avec de vrais
calculs BATIYO (20 sacs × 5 500 + 3 voyages × 35 000 + 2 forfaits × 150 000 = **515 000 FCFA**).
Elle est allégée sur téléphone (trois lignes au lieu de quatre) pour rester lisible.

**Remplacer la photo** : déposez votre image dans `assets/` puis modifiez la balise `<img class="hero-photo">`
dans `src/14-screens-public.js`. Cadrage recommandé : portrait 4/5, sujet à droite, espace libre à gauche.
Pensez à mettre à jour le texte alternatif.
