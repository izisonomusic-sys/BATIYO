# Connexion du projet BATIYO à Supabase

Le code frontend est préparé pour Supabase Auth + PostgreSQL + Storage et utilise l’URL configurée dans `src/07-repository.js`.

## À renseigner

Dans `src/07-repository.js`, renseigner la **publishable key** du même projet :

```js
publishableKey: 'sb_publishable_...'
```

Ne jamais utiliser `service_role` dans le navigateur.

## Migration

Pour un projet Supabase vide, le fichier `supabase/migrations/20260930153000_batiyo_initial.sql` contient tout le socle : tables, RLS, fonctions, Storage et référentiel métier.

Pour un projet existant, ne pas l’exécuter aveuglément : comparer d’abord les tables/migrations présentes et appliquer uniquement les changements nécessaires.

## État actuel de la connexion de cet environnement

Le projet BATIYO `oawalbnivqcuzbvhuvnc` est maintenant connecté. La migration initiale a été appliquée et l’application frontend utilise sa clé publishable publique. Le secret/service_role n’est jamais embarqué dans le navigateur.


## État de connexion

- Supabase project: `oawalbnivqcuzbvhuvnc`
- URL: `https://oawalbnivqcuzbvhuvnc.supabase.co`
- Migration initiale: appliquée
- Auth: prête
- Database/RLS: active
- Storage: `logos`, `photos`, `receipts`
- Paiements en ligne: non intégrés
