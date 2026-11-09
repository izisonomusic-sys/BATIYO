/* =========================================================================
   BATIYO — 20. ADMINISTRATION
   Tableau de supervision protégé par le rôle Supabase app_metadata + RLS.
   ========================================================================= */
(function (B) {
  'use strict';
  const h = B.escape;
  const money = function (v) { return new Intl.NumberFormat('fr-FR').format(Number(v) || 0) + ' FCFA'; };
  const date = function (v) { return v ? new Date(v).toLocaleDateString('fr-FR') : '—'; };

  function admin() {
    const root = B.el('<div class="stack admin-page"></div>');
    root.innerHTML =
      '<div class="row-between wrap"><div><h2>Administration BATIYO</h2>' +
      '<p class="muted small">Suivi global des inscriptions, abonnements, paiements et devis.</p></div>' +
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
        const remote = B.DataRepository && B.DataRepository.remote;
        if (!remote || !remote.ready) throw new Error('Connexion sécurisée à Supabase indisponible.');
        const auth = await remote.getUser();
        const user = auth && auth.data && auth.data.user;
        if (!user || !user.app_metadata || user.app_metadata.role !== 'admin') {
          throw new Error('Accès réservé au compte administrateur principal. Déconnectez-vous puis reconnectez-vous pour actualiser vos droits.');
        }
        const db = remote.client;
        const result = await Promise.all([
          db.from('profiles').select('id,full_name,phone,email,role,business_id,created_at').order('created_at', { ascending: false }),
          db.from('businesses').select('id,name,phone,created_at'),
          db.from('business_subscriptions').select('id,business_id,plan_id,status,billing_period_months,amount_fcfa,provider,payment_reference,provider_reference,created_at,starts_at,ends_at').order('created_at', { ascending: false }),
          db.from('quotes').select('id,business_id,number,status,total,date,created_at').order('created_at', { ascending: false }),
          db.from('payments').select('id,business_id,invoice_id,amount,date,method,reference,created_at').order('created_at', { ascending: false }),
          db.from('invoices').select('id', { count: 'exact', head: true })
        ]);
        result.forEach(function (r) { if (r.error) throw r.error; });
        const profiles=result[0].data||[], businesses=result[1].data||[], subs=result[2].data||[];
        const quotes=result[3].data||[], payments=result[4].data||[];
        const businessById={};
        businesses.forEach(function (b) { businessById[b.id]=b; });
        const confirmed=subs.filter(function (s) { return ['active','paid','succeeded','completed','confirmed'].indexOf(String(s.status||'').toLowerCase())>=0; });
        const pending=subs.filter(function (s) { return String(s.status||'').toLowerCase()==='pending'; });
        const revenue=confirmed.reduce(function (sum,s) { return sum+(Number(s.amount_fcfa)||0); },0);
        function stat(label,value,hint) {
          return '<div class="card card-pad"><div class="tiny muted">'+label+'</div><div class="stat-value" style="font-size:24px;font-weight:800;margin-top:8px">'+value+'</div><div class="tiny muted">'+hint+'</div></div>';
        }
        function section(title,rows,empty,render) {
          const card=B.el('<section class="card card-pad stack-sm"></section>');
          card.appendChild(B.el('<div class="row-between"><h3>'+title+'</h3><span class="badge">'+rows.length+'</span></div>'));
          if (!rows.length) card.appendChild(B.el('<p class="muted small">'+empty+'</p>'));
          else {
            const list=B.el('<div class="list"></div>');
            rows.slice(0,30).forEach(function (row) { list.appendChild(render(row)); });
            card.appendChild(list);
          }
          content.appendChild(card);
        }
        state.hidden=true;
        content.appendChild(B.el('<div class="grid grid-2 grid-3-md">'+
          stat('Utilisateurs inscrits',profiles.length,'Comptes enregistrés')+
          stat('Entreprises',businesses.length,'Espaces professionnels')+
          stat('Abonnements actifs',confirmed.length,'Confirmés')+
          stat('Revenus abonnements',money(revenue),pending.length+' paiement(s) en attente')+
          stat('Devis créés',quotes.length,'Toutes entreprises confondues')+
          stat('Factures',result[5].count||0,'Factures enregistrées')+
          '</div>'));
        section('Derniers utilisateurs inscrits',profiles,'Aucun utilisateur enregistré.',function (p) {
          const b=businessById[p.business_id];
          return B.el('<div class="list-item"><div class="avatar neutral">'+h(B.initials(p.full_name||p.phone||'U'))+'</div><div class="body"><div class="t1">'+h(p.full_name||'Nom non renseigné')+'</div><div class="t2">'+h([p.phone||p.email,b&&b.name,date(p.created_at)].filter(Boolean).join(' · '))+'</div></div></div>');
        });
        section('Abonnements et paiements PayDunya',subs,'Aucun abonnement enregistré.',function (s) {
          const b=businessById[s.business_id], active=s.status==='active';
          return B.el('<div class="list-item"><div class="avatar '+(active?'success':'neutral')+'">'+(active?'✓':'◷')+'</div><div class="body"><div class="t1">'+h(b&&b.name||'Entreprise')+' · '+h(s.plan_id||s.billing_period_months+' mois')+'</div><div class="t2">'+h([s.provider,s.status,date(s.created_at),s.payment_reference||s.provider_reference].filter(Boolean).join(' · '))+'</div></div><div class="end"><strong>'+h(money(s.amount_fcfa))+'</strong></div></div>');
        });
        section('Derniers devis créés',quotes,'Aucun devis enregistré.',function (q) {
          const b=businessById[q.business_id];
          return B.el('<div class="list-item"><div class="avatar neutral">DEV</div><div class="body"><div class="t1">'+h(q.number||'Devis')+' · '+h(b&&b.name||'Entreprise')+'</div><div class="t2">'+h([q.status,date(q.created_at)].filter(Boolean).join(' · '))+'</div></div><div class="end"><strong>'+h(money(q.total))+'</strong></div></div>');
        });
        section('Paiements de factures',payments,'Aucun paiement enregistré.',function (p) {
          const b=businessById[p.business_id];
          return B.el('<div class="list-item"><div class="avatar neutral">FCFA</div><div class="body"><div class="t1">'+h(b&&b.name||'Entreprise')+'</div><div class="t2">'+h([p.method,p.reference,date(p.date||p.created_at)].filter(Boolean).join(' · '))+'</div></div><div class="end"><strong>'+h(money(p.amount))+'</strong></div></div>');
        });
      } catch (error) {
        state.hidden=false;
        state.innerHTML='<strong>Accès administrateur indisponible</strong><p class="small">'+h(error&&error.message?error.message:'Une erreur est survenue.')+'</p>';
      }
    }
    B.$('[data-refresh]',root).addEventListener('click',load);
    load();
    return root;
  }
  B.screens.admin=admin;
})(globalThis.BATIYO=globalThis.BATIYO||{});
