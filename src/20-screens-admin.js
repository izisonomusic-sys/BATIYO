/* =========================================================================
   BATIYO — 20. ADMINISTRATION
   Tableau de supervision plateforme, données servies par RPC sécurisé.
   ========================================================================= */
(function (B) {
  'use strict';
  const h = B.escape;

  function date(value) {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
  }
  function amount(value) {
    return new Intl.NumberFormat('fr-FR').format(Number(value) || 0) + ' FCFA';
  }
  function admin() {
    const root = B.el('<div class="stack admin-page"></div>');
    root.innerHTML =
      '<div class="row-between wrap"><div><h2>Administration BATIYO</h2>' +
      '<p class="muted small">Suivi global des inscriptions, abonnements et activité de la plateforme.</p></div>' +
      '<button class="btn btn-ghost" data-refresh>↻ Actualiser</button></div>' +
      '<div data-admin-state class="card card-pad">Chargement des données administrateur…</div>' +
      '<div data-admin-content></div>';
    const state = B.$('[data-admin-state]', root);
    const content = B.$('[data-admin-content]', root);

    async function load() {
      state.hidden = false;
      state.textContent = 'Chargement des données administrateur…';
      content.innerHTML = '';
      try {
        if (!B.DataRepository.remote || !B.DataRepository.remote.ready) {
          throw new Error('Connexion sécurisée à Supabase indisponible. Vérifiez votre connexion puis réessayez.');
        }
        const response = await B.DataRepository.remote.rpc('batiyo_admin_overview');
        if (response.error) throw response.error;
        const data = response.data;
        if (!data || !data.stats) throw new Error('Réponse administrateur invalide.');
        const s = data.stats;
        state.hidden = true;

        const cards = [
          ['Utilisateurs inscrits', s.users, 'users'],
          ['Entreprises', s.businesses, 'store'],
          ['Abonnements actifs', s.active_subscriptions, 'checkCircle'],
          ['Revenus confirmés', amount(s.confirmed_revenue_fcfa), 'coins'],
          ['Devis créés', s.quotes, 'doc'],
          ['Factures créées', s.invoices, 'invoice']
        ];
        const grid = B.el('<div class="grid grid-2 grid-3-md"></div>');
        cards.forEach(function (c) {
          grid.appendChild(B.el('<div class="card card-pad"><div class="tiny muted">' + h(c[0]) +
            '</div><div class="stat-value" style="font-size:24px;font-weight:800;margin-top:8px">' +
            h(String(c[1] == null ? 0 : c[1])) + '</div></div>'));
        });
        content.appendChild(grid);

        const users = Array.isArray(data.users) ? data.users : [];
        const subs = Array.isArray(data.subscriptions) ? data.subscriptions : [];
        const quotes = Array.isArray(data.recent_quotes) ? data.recent_quotes : [];

        function section(title, rows, empty, renderRow) {
          const card = B.el('<section class="card card-pad stack-sm"></section>');
          card.appendChild(B.el('<div class="row-between"><h3>' + h(title) + '</h3><span class="badge">' + rows.length + '</span></div>'));
          if (!rows.length) card.appendChild(B.el('<p class="muted small">' + h(empty) + '</p>'));
          else {
            const list = B.el('<div class="list"></div>');
            rows.forEach(function (row) { list.appendChild(renderRow(row)); });
            card.appendChild(list);
          }
          content.appendChild(card);
        }
        section('Derniers utilisateurs inscrits', users, 'Aucun utilisateur enregistré.', function (u) {
          return B.el('<div class="list-item"><div class="avatar neutral">' +
            h(B.initials(u.full_name || u.phone || 'U')) + '</div><div class="body"><div class="t1">' +
            h(u.full_name || 'Nom non renseigné') + '</div><div class="t2">' +
            h([u.phone, u.business_name, date(u.created_at)].filter(Boolean).join(' · ')) +
            '</div></div></div>');
        });
        section('Abonnements et paiements', subs, 'Aucun abonnement enregistré.', function (sub) {
          const active = sub.status === 'active';
          return B.el('<div class="list-item"><div class="avatar ' + (active ? 'success' : 'neutral') + '">' +
            (active ? '✓' : '◷') + '</div><div class="body"><div class="t1">' +
            h(sub.business_name || 'Entreprise') + ' · ' + h(sub.plan_id || 'Abonnement') +
            '</div><div class="t2">' + h([sub.owner_name, sub.owner_phone, sub.billing_period_months + ' mois',
              date(sub.created_at), sub.payment_reference || sub.provider_reference].filter(Boolean).join(' · ')) +
            '</div></div><div class="end"><strong>' + h(amount(sub.amount_fcfa)) +
            '</strong><div class="tiny muted">' + h(sub.status || '—') + '</div></div></div>');
        });
        section('Derniers devis créés', quotes, 'Aucun devis enregistré.', function (q) {
          return B.el('<div class="list-item"><div class="avatar neutral">DEV</div><div class="body"><div class="t1">' +
            h(q.number || 'Devis') + ' · ' + h(q.business_name || 'Entreprise') +
            '</div><div class="t2">' + h([q.status, date(q.created_at)].filter(Boolean).join(' · ')) +
            '</div></div><div class="end"><strong>' + h(amount(q.total)) + '</strong></div></div>');
        });
      } catch (error) {
        state.hidden = false;
        state.innerHTML = '<strong>Accès administrateur indisponible</strong><p class="small">' +
          h(error && error.message ? error.message : 'Une erreur est survenue.') +
          '</p><p class="tiny muted">Connectez-vous avec le compte administrateur principal BATIYO.</p>';
      }
    }
    B.$('[data-refresh]', root).addEventListener('click', load);
    load();
    return root;
  }

  B.screens.admin = admin;
})(globalThis.BATIYO = globalThis.BATIYO || {});
