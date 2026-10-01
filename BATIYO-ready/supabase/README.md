# BATIYO — Supabase

Le dossier contient le schéma de production de BATIYO : Auth, base PostgreSQL, RLS, fonctions, stockage et référentiel métier. Aucun compte utilisateur ou jeu de données de démonstration n’est créé par ces scripts.

## Ordre d’installation

1. `01-schema.sql` — tables, contraintes, index et triggers.
2. `02-rls.sql` — RLS et droits d’accès par entreprise.
3. `03-functions.sql` — inscription, numérotation, paiements manuels, statistiques et Storage.
4. `04-reference.sql` — métiers, unités, catégories et catalogues modèles uniquement.

Le fichier `migrations/20260930153000_batiyo_initial.sql` reprend ces quatre étapes dans une seule migration pour un nouveau projet.

## Configuration du front

Le navigateur utilise uniquement l’URL du projet et la **publishable key** Supabase. Ne jamais mettre la `service_role` key dans le frontend.

Dans `src/07-repository.js` :

```js
B.SUPABASE_CONFIG = {
  url: 'https://xxxx.supabase.co',
  publishableKey: 'sb_publishable_...',
  tables: []
};
```

Après configuration, l’inscription crée automatiquement l’entreprise, le profil et les paramètres par défaut grâce au trigger Supabase. Le métier choisi lors de l’inscription est enregistré sur `profiles.profession_id` et pilote automatiquement le catalogue des nouveaux devis.

## Sécurité

- RLS est activé sur les tables exposées.
- Les données métier sont filtrées par `business_id`.
- Les fonctions `SECURITY DEFINER` ne sont pas exposées comme API publique.
- Le frontend n’utilise jamais une clé secrète.
- Les logos sont stockés dans `logos`; photos et justificatifs utilisent `photos` et `receipts`.

## Offline-first

Le navigateur garde un cache local et peut créer/modifier les données essentielles hors connexion. Lorsque la connexion revient, `SupabaseRepository` synchronise l’espace de l’entreprise.

## Important

Avant la mise en production, configurer dans Supabase Auth les paramètres d’email/confirmation et vérifier les règles Storage.
