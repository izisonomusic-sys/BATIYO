# BATIYO — Configuration PayDunya SoftPay Afrique de l’Ouest

## Pays et moyens documentés

Les options actuellement codées correspondent à la documentation SoftPay de PayDunya :

| Pays | Code | Moyens |
|---|---|---|
| Togo | TG | T-Money, Moov Togo |
| Bénin | BJ | Moov, MTN, Celtiis Cash |
| Côte d’Ivoire | CI | MTN, Moov, Wave, Orange Money (OTP), Djamo |
| Sénégal | SN | Free Money, Expresso, Wave, Orange Money (application), Djamo |
| Burkina Faso | BF | Moov, Orange Money (OTP) |
| Mali | ML | Orange Money, Moov |

La disponibilité effective dépend de l’activation du compte marchand PayDunya pour chaque pays et de la disponibilité du moyen chez PayDunya. Les méthodes peuvent être restreintes indépendamment par pays.

## Secrets Supabase requis

Dans Supabase → Edge Functions → Secrets, configurer :

- `PAYDUNYA_MASTER_KEY`
- `PAYDUNYA_PRIVATE_KEY`
- `PAYDUNYA_TOKEN`
- `PAYDUNYA_MODE=live` uniquement après activation et validation du compte marchand.

Ne jamais placer ces clés dans le navigateur, GitHub public ou les messages de discussion.

## URL de notification IPN / callback

`https://vrqwvynujpimgamrcllj.supabase.co/functions/v1/paydunya-webhook`

Cette URL doit être renseignée dans l’application PayDunya comme URL de callback/IPN. Elle valide le hash SHA-512 de PayDunya avant d’activer un abonnement.

## Important — Sandbox

La documentation PayDunya décrit le Sandbox SoftPay pour le portefeuille PayDunya générique. Elle ne documente pas les endpoints Sandbox opérateur par opérateur utilisés pour T-Money, Moov, MTN, Orange, Wave, Free, etc. Le backend refuse donc volontairement de lancer ces paiements opérateurs en mode test, afin d’éviter de présenter un faux test comme un paiement valide.

Les endpoints opérateurs ne doivent être appelés qu’en production après confirmation du compte marchand et des moyens activés. Une réponse SoftPay positive laisse l’abonnement en attente ; seul le webhook IPN vérifié l’active.

## Pays ouest-africains hors couverture PayDunya SoftPay

Les autres marchés de la région ne sont pas déclarés comme compatibles PayDunya SoftPay par cette intégration. Ils nécessitent un prestataire agréé et des moyens de paiement locaux supplémentaires. Ne pas afficher ces paiements comme disponibles avant intégration et tests réels.
