/* =========================================================================
   BATIYO — 20. ADMINISTRATION
   Supervision globale : statistiques réelles lues dans Supabase.
   Accès réservé au rôle serveur app_metadata.role = admin (RLS Supabase).
   ========================================================================= */
(function (B) {
  'use strict';
  const h = B.escape;
  const money = function (v) { return new Intl.NumberFormat('fr-FR').format(Number(v) || 0) + ' FCFA'; };
  const date = function (v) { return v ? new Date(v).toLocaleDateString('fr-FR') : '—'; };
  const withinDays = function (value, days) {
    if (!value) return false;
    const time = new Date(value).getTime();
    return Number.isFinite(time) && time >= Date.now() - days * 86400000;
  };
  const isActive = function (s) { return String(s.status || '').toLowerCase() === 'active'; };

  function admin() {
    const root = B.el('<div class="stack admin-page"></div>');
    root.innerHTML =
      '<div class="row-between wrap"><div><h2>Administration BATIYO</h2>' +
      '<p class="muted small">Vue globale des comptes, entreprises, abonnements et activité.</p></div>' +
      '<button class="btn btn-ghost" data-refresh>↻ Actualiser</button></div>' +
      '<div data-admin-state class="card card-pad">Chargement des données administrateur…</div>' +
      '<div data-admin-content></div>';
    const state = B.$('[data-admin-state]', root);
    const content = B.$('[data-admin-content]', root);

    function stat(label, value, hint) {
      return '<div class="card card-pad"><div class="tiny muted">' + h(label) + '</div>' +
        '<div class="stat-value" style="font-size:24px;font-weight:800;margin-top:8px">' + h(String(value)) + '</div>' +
        '<div class="tiny muted">' + h(hint) + '</div></div>';
    }
    function section(title, rows, empty, render) {
      const card = B.el('<section class="card card-pad stack-sm"></section>');
      card.appendChild(B.el('<div class="row-between"><h3>' + h(title) + '</h3><span class="badge">' + rows.length + '</span></div>'));
      if (!rows.length) card.appendChild(B.el('<p class="muted small">' + h(empty) + '</p>'));
      else {
        const list = B.el('<div class="list"></div>');
        rows.slice(0, 30).forEach(function (row) { list.appendChild(render(row)); });
        card.appendChild(list);
      }
      content.appendChild(card);
    }

    async function load() {
      state.hidden = false;
      state.textContent = 'Chargement des données administrateur…';
      content.innerHTML = '';
      try {
        const remote = B.DataRepository && B.DataRepository.remote;
        if (!remote || !remote.ready || !remote.client) throw new Error('Connexion sécurisée à Supabase indisponible.');
        const auth = await remote.getUser();
        const user = auth && auth.data && auth.data.user;
        if (!user || !user.app_metadata || user.app_metadata.role !== 'admin') {
          throw new Error('Accès réservé au compte administrateur. Déconnectez-vous puis reconnectez-vous pour actualiser vos droits.');
        }
        const db = remote.client;
        const results = await Promise.all([
          db.from('profiles').select('id,full_name,phone,email,role,business_id,created_at').order('created_at', { ascending: false }),
          db.from('businesses').select('id,name,phone,created_at').order('created_at', { ascending: false }),
          db.from('business_subscriptions').select('id,business_id,plan_id,status,billing_period_months,amount_fcfa,provider,payment_reference,provider_reference,created_at,starts_at,ends_at').order('created_at', { ascending: false }),
          db.from('quotes').select('id,business_id,number,status,total,date,created_at').order('created_at', { ascending: false }),
          db.from('payments').select('id,business_id,invoice_id,amount,date,method,reference,created_at').order('created_at', { ascending: false }),
          db.from('invoices').select('id', { count: 'exact', head: true })
        ]);
        results.forEach(function (r) { if (r.error) throw r.error; });
        const profiles = results[0].data || [];
        const businesses = results[1].data || [];
        const subs = results[2].data || [];
        const quotes = results[3].data || [];
        const payments = results[4].data || [];
        const businessById = {};
        businesses.forEach(function (b) { businessById[b.id] = b; });

        const active = subs.filter(isActive);
        const pending = subs.filter(function (s) { return s.status === 'pending'; });
        const expired = subs.filter(function (s) { return s.status === 'expired'; });
        const pastDue = subs.filter(function (s) { return s.status === 'past_due'; });
        const failed = subs.filter(function (s) { return s.status === 'failed' || s.status === 'cancelled'; });
        const activeRevenue = active.reduce(function (sum, s) { return sum + (Number(s.amount_fcfa) || 0); }, 0);
        const planCounts = {};
        subs.forEach(function (s) {
          const plan = s.plan_id || (s.billing_period_months ? s.billing_period_months + ' mois' : 'Formule non précisée');
          planCounts[plan] = (planCounts[plan] || 0) + 1;
        });
        const today = new Date().toDateString();
        const registeredToday = profiles.filter(function (p) { return p.created_at && new Date(p.created_at).toDateString() === today; }).length;
        const registered7d = profiles.filter(function (p) { return withinDays(p.created_at, 7); }).length;
        const registered30d = profiles.filter(function (p) { return withinDays(p.created_at, 30); }).length;
        const recentSubs = subs.filter(function (s) { return withinDays(s.created_at, 30); }).length;

        state.hidden = true;
        content.appendChild(B.el('<div class="grid grid-2 grid-3-md">' +
          stat('Utilisateurs inscrits', profiles.length, registeredToday + ' aujourd’hui · ' + registered7d + ' sur 7 jours · ' + registered30d + ' sur 30 jours') +
          stat('Entreprises', businesses.length, 'Espaces professionnels enregistrés') +
          stat('Abonnements actifs', active.length, 'Statut confirmé : active') +
          stat('Demandes en attente', pending.length, recentSubs + ' demandes créées sur 30 jours') +
          stat('Revenus abonnements actifs', money(activeRevenue), 'Somme des montants au statut active uniquement') +
          stat('Devis créés', quotes.length, 'Toutes entreprises confondues') +
          stat('Factures', results[5].count || 0, 'Factures enregistrées') +
          stat('Paiements de factures', payments.length, 'Paiements manuels enregistrés') +
          stat('Visiteurs du site', 'Non mesuré', 'Le suivi des visites n’est pas encore installé') +
          '</div>'));

        const planCard = B.el('<section class="card card-pad stack-sm"><h3>Répartition des abonnements par formule</h3></section>');
        const planRows = Object.keys(planCounts).sort().map(function (name) {
          return '<div class="kv"><span class="k">' + h(name) + '</span><strong class="v">' + planCounts[name] + '</strong></div>';
        }).join('');
        planCard.appendChild(B.el(planRows || '<p class="muted small">Aucune formule enregistrée.</p>'));
        planCard.appendChild(B.el('<div class="tiny muted">En attente : ' + pending.length + ' · Expirés : ' + expired.length +
          ' · En retard : ' + pastDue.length + ' · Annulés/échoués : ' + failed.length + '</div>'));
        content.appendChild(planCard);

        section('Derniers utilisateurs inscrits', profiles, 'Aucun utilisateur enregistré.', function (p) {
          const b = businessById[p.business_id];
          return B.el('<div class="list-item"><div class="avatar neutral">' + h(B.initials(p.full_name || p.phone || 'U')) +
            '</div><div class="body"><div class="t1">' + h(p.full_name || 'Nom non renseigné') +
            '</div><div class="t2">' + h([p.phone || p.email, b && b.name, date(p.created_at)].filter(Boolean).join(' · ')) +
            '</div></div></div>');
        });
        section('Abonnements et paiements PayDunya', subs, 'Aucun abonnement enregistré.', function (s) {
          const b = businessById[s.business_id];
          const activeNow = isActive(s);
          return B.el('<div class="list-item"><div class="avatar ' + (activeNow ? 'success' : 'neutral') + '">' +
            (activeNow ? '✓' : '◷') + '</div><div class="body"><div class="t1">' +
            h((b && b.name) || 'Entreprise') + ' · ' + h(s.plan_id || s.billing_period_months + ' mois') +
            '</div><div class="t2">' + h([s.provider, s.status, date(s.created_at), s.payment_reference || s.provider_reference].filter(Boolean).join(' · ')) +
            '</div></div><div class="end"><strong>' + h(money(s.amount_fcfa)) + '</strong></div></div>');
        });
        section('Derniers devis créés', quotes, 'Aucun devis enregistré.', function (q) {
          const b = businessById[q.business_id];
          return B.el('<div class="list-item"><div class="avatar neutral">DEV</div><div class="body"><div class="t1">' +
            h(q.number || 'Devis') + ' · ' + h((b && b.name) || 'Entreprise') + '</div><div class="t2">' +
            h([q.status, date(q.created_at)].filter(Boolean).join(' · ')) + '</div></div><div class="end"><strong>' +
            h(money(q.total)) + '</strong></div></div>');
        });
        section('Paiements de factures', payments, 'Aucun paiement enregistré.', function (p) {
          const b = businessById[p.business_id];
          return B.el('<div class="list-item"><div class="avatar neutral">FCFA</div><div class="body"><div class="t1">' +
            h((b && b.name) || 'Entreprise') + '</div><div class="t2">' +
            h([p.method, p.reference, date(p.date || p.created_at)].filter(Boolean).join(' · ')) +
            '</div></div><div class="end"><strong>' + h(money(p.amount)) + '</strong></div></div>');
        });
      } catch (error) {
        state.hidden = false;
        state.innerHTML = '<strong>Accès administrateur indisponible</strong><p class="small">' +
          h(error && error.message ? error.message : 'Une erreur est survenue.') + '</p>';
      }
    }
    B.$('[data-refresh]', root).addEventListener('click', load);
    load();
    return root;
  }
  B.screens.admin = admin;
})(globalThis.BATIYO = globalThis.BATIYO || {});
