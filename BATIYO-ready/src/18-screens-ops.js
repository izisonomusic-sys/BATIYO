/* =========================================================================
   BATIYO — 18. CLIENTS, CATALOGUE, CHANTIERS, DÉPENSES, DOCUMENTS,
   ASSISTANT, PROFIL, PARAMÈTRES
   ========================================================================= */
(function (B) {
  'use strict';
  const h = B.escape;
  const ui = function () { return B.ui; };
  const C = function () { return B.components; };

  /* =======================================================================
     CLIENTS (#77 → #180)
     ======================================================================= */
  function clientsList() {
    const state = clientsList.state || (clientsList.state = { search: '' });
    const wrap = B.el('<div class="stack"></div>');
    const rows = B.clientService.search(state.search);
    wrap.appendChild(B.el('<div class="row-between wrap"><div><h2>Mes clients</h2><div class="small muted">' + rows.length + ' client(s)</div></div>' +
      '<button class="btn btn-primary" data-new>' + ui().icon('plus', 18) + ' Client</button></div>'));
    const search = B.el('<div class="search">' + ui().icon('search', 18) + '<input placeholder="Rechercher un client, un téléphone, une adresse…" value="' + h(state.search) + '" aria-label="Rechercher"></div>');
    wrap.appendChild(search);
    B.$('input', search).addEventListener('input', B.debounce(function () { state.search = this.value; B.router.refresh(); }, 200));

    if (!rows.length) {
      wrap.appendChild(ui().emptyState({
        icon: 'users', title: state.search ? 'Aucun client trouvé' : 'Aucun client pour le moment',
        text: state.search ? 'Essayez un autre nom ou un autre numéro.' : 'Ajoutez votre premier client pour créer vos devis.',
        actionLabel: state.search ? null : 'Ajouter un client',
        onAction: function () { C().clientForm(null, null); }
      }));
    } else {
      const list = B.el('<div class="card"><div class="list" data-list></div></div>');
      const host = B.$('[data-list]', list);
      rows.forEach(function (c) {
        const d = B.clientService.detail(c.id);
        const row = B.el('<button class="list-item"><div class="avatar">' + ui().icon('user', 18) + '</div>' +
          '<div class="body"><div class="t1">' + h(c.name) + (c.favorite ? ' ⭐' : '') + '</div>' +
          '<div class="t2">' + h([c.phone, c.address].filter(Boolean).join(' · ') || 'Aucune coordonnée') + '</div></div>' +
          '<div class="end"><div class="amount mono">' + B.money(d.stats.total_invoiced) + '</div>' +
          '<div class="tiny muted">' + d.stats.quotes_count + ' devis</div></div></button>');
        row.addEventListener('click', function () { B.router.go('/clients/' + c.id); });
        host.appendChild(row);
      });
      wrap.appendChild(list);
    }
    B.$('[data-new]', wrap).addEventListener('click', function () { C().clientForm(null, null); });
    return wrap;
  }

  function clientDetail(ctx) {
    const d = B.clientService.detail(ctx.params.id);
    if (!d) return notFound('Ce client est introuvable.');
    const c = d.client;
    const wrap = B.el('<div class="stack"></div>');
    wrap.appendChild(B.el('<button class="btn btn-ghost btn-sm" data-back>' + ui().icon('arrowLeft', 16) + ' Mes clients</button>'));

    const head = B.el('<div class="card card-pad-lg"></div>');
    head.innerHTML = '<div class="row-between wrap"><div class="row" style="gap:12px">' +
      '<div class="avatar-initials" style="width:52px;height:52px;font-size:18px">' + h(B.initials(c.name)) + '</div>' +
      '<div><h2>' + h(c.name) + '</h2><div class="small muted">' + h([c.phone, c.email].filter(Boolean).join(' · ') || 'Aucune coordonnée') + '</div>' +
      '<div class="tiny muted">' + h(c.address || '') + '</div></div></div>' +
      '<div class="row" style="gap:8px">' + (c.favorite ? ui().badge('Client favori', 'accent') : '') + '</div></div>';
    const actions = B.el('<div class="btn-row mt-16"></div>');
    [['Nouveau devis', 'doc', 'btn-primary', function () { B.router.go('/quotes/new?client=' + c.id); }],
     ['Nouvelle facture', 'invoice', 'btn-ghost', function () { B.router.go('/invoices/new?client=' + c.id); }],
     ['Modifier', 'edit', 'btn-ghost', function () { C().clientForm(c, null); }],
     [c.favorite ? 'Retirer des favoris' : 'Marquer favori', 'star', 'btn-ghost', function () {
        B.clientService.toggleFavorite(c.id); ui().toast('Client mis à jour.', 'success'); B.router.refresh();
      }]
    ].forEach(function (a) {
      const b = B.el('<button class="btn ' + a[2] + '">' + ui().icon(a[1], 17) + ' ' + h(a[0]) + '</button>');
      b.addEventListener('click', a[3]);
      actions.appendChild(b);
    });
    head.appendChild(actions);
    if (c.notes) head.appendChild(B.el('<div class="banner banner-info mt-12">' + ui().icon('info', 17) + '<span>' + h(c.notes) + '</span></div>'));
    wrap.appendChild(head);

    wrap.appendChild(B.el('<div class="grid grid-2 grid-4-md">' +
      statMini('devis', String(d.stats.quotes_count), B.money(d.stats.total_quoted)) +
      statMini('factures', String(d.stats.invoices_count), B.money(d.stats.total_invoiced)) +
      statMini('encaissé', B.money(d.stats.total_paid), 'paiements enregistrés') +
      statMini('chantiers', String(d.stats.projects_count), d.stats.active_projects + ' en cours') + '</div>'));

    /* Historique (#79) */
    const history = B.clientService.history(c.id);
    const histCard = B.el('<div class="card"><div class="card-head"><h3>Historique</h3></div></div>');
    if (!history.length) {
      histCard.appendChild(ui().emptyState({ icon: 'clock', title: 'Aucun document', text: 'Ce client n’a pas encore de devis ni de facture.', actionLabel: 'Créer un devis', onAction: function () { B.router.go('/quotes/new?client=' + c.id); } }));
    } else {
      const list = B.el('<div class="list"></div>');
      history.forEach(function (it) {
        const isQuote = it.type === 'devis';
        const isProject = it.type === 'chantier';
        const row = B.el('<button class="list-item"><div class="avatar ' + (isProject ? 'info' : isQuote ? '' : 'success') + '">' +
          ui().icon(isProject ? 'hardhat' : isQuote ? 'doc' : 'invoice', 18) + '</div>' +
          '<div class="body"><div class="t1">' + h(it.number) + '</div><div class="t2">' + h(it.type) + ' · ' + B.dateShort(it.date) + '</div></div>' +
          '<div class="end"><div class="amount mono">' + B.money(it.amount) + '</div>' +
          (isQuote ? ui().statusBadge(B.QUOTE_STATUSES, it.status) : isProject ? ui().statusBadge(B.PROJECT_STATUSES, it.status) : ui().statusBadge(B.INVOICE_STATUSES, it.status)) + '</div></button>');
        row.addEventListener('click', function () { B.router.go(it.route.replace('#', '')); });
        list.appendChild(row);
      });
      histCard.appendChild(list);
    }
    wrap.appendChild(histCard);

    const danger = B.el('<div class="card"><div class="card-head"><h3>Actions</h3></div><button class="btn btn-danger btn-block" data-del>' + ui().icon('trash', 17) + ' Supprimer ce client</button></div>');
    B.$('[data-del]', danger).addEventListener('click', function () {
      C().confirmDelete('le client ' + c.name, function () {
        B.clientService.remove(c.id); ui().toast('Client supprimé.', 'success'); B.router.go('/clients');
      });
    });
    wrap.appendChild(danger);
    B.$('[data-back]', wrap).addEventListener('click', function () { B.router.go('/clients'); });
    return wrap;
  }
  function statMini(label, value, sub) {
    return '<div class="card" style="padding:13px"><div class="tiny muted">' + h(label) + '</div>' +
      '<div class="strong" style="font-size:18px">' + h(value) + '</div><div class="tiny muted">' + h(sub) + '</div></div>';
  }

  /* =======================================================================
     CATALOGUE (#72 → #76)
     ======================================================================= */
  function catalog() {
    const state = catalog.state || (catalog.state = { search: '', category: 'all' });
    const prof = B.session.profession();
    const wrap = B.el('<div class="stack"></div>');
    wrap.appendChild(B.el('<div class="row-between wrap"><div><h2>Mon catalogue</h2>' +
      '<div class="small muted">Catalogue ' + h(prof.name) + ' · ' + B.catalogService.list().length + ' article(s)</div></div>' +
      '<button class="btn btn-primary" data-new>' + ui().icon('plus', 18) + ' Article</button></div>'));

    wrap.appendChild(B.el('<div class="banner banner-info">' + ui().icon('sparkles', 18) +
      '<span>Votre métier (<strong>' + h(prof.name) + '</strong>) détermine ce catalogue. Vous pouvez ajouter vos propres articles : ils apparaîtront en priorité dans vos devis.</span></div>'));

    const search = B.el('<div class="search">' + ui().icon('search', 18) + '<input placeholder="Rechercher un article (ex : cim)…" value="' + h(state.search) + '" aria-label="Rechercher un article"></div>');
    wrap.appendChild(search);
    B.$('input', search).addEventListener('input', B.debounce(function () { state.search = this.value; B.router.refresh(); }, 180));

    const chips = B.el('<div class="chip-scroll"></div>');
    [['all', 'Tous'], ['favoris', 'Favoris'], ['custom', 'Mes articles']].concat(B.CATALOG_CATEGORIES.map(function (c) { return [c.id, c.label]; })).forEach(function (s) {
      const c = B.el('<button class="chip' + (state.category === s[0] ? ' active' : '') + '">' + h(s[1]) + '</button>');
      c.addEventListener('click', function () { state.category = s[0]; B.router.refresh(); });
      chips.appendChild(c);
    });
    wrap.appendChild(chips);

    let items = state.search ? B.catalogService.search(state.search) : B.catalogService.list();
    if (state.category === 'favoris') items = items.filter(function (i) { return i.favorite; });
    else if (state.category === 'custom') items = items.filter(function (i) { return !!i.business_id; });
    else if (state.category !== 'all') items = items.filter(function (i) { return i.category === state.category; });

    if (!items.length) {
      wrap.appendChild(ui().emptyState({
        icon: 'box', title: 'Aucun article', text: 'Ajoutez vos propres prix et unités : ils seront utilisés en priorité dans vos devis.',
        actionLabel: 'Ajouter un article', onAction: function () { C().catalogItemForm(null, null); }
      }));
    } else {
      const list = B.el('<div class="card"><div class="list" data-list></div></div>');
      const host = B.$('[data-list]', list);
      items.forEach(function (it) {
        const row = B.el('<div class="list-item" style="cursor:default"><div class="avatar ' + (it.favorite ? 'warn' : 'neutral') + '">' + ui().icon(it.favorite ? 'star' : 'box', 18) + '</div>' +
          '<div class="body"><div class="t1">' + h(it.name) + (it.business_id ? ' ' + ui().badge('Mon article', 'primary') : '') + '</div>' +
          '<div class="t2">' + h(B.catalogCategory(it.category).label) + ' · ' + h(B.unitLabel(it.unit)) +
          (it.last_price != null ? ' · dernier prix ' + B.money(it.last_price) : '') +
          (it.usage_count ? ' · utilisé ' + it.usage_count + '×' : '') + '</div></div>' +
          '<div class="end"><div class="amount mono">' + B.money(it.last_price != null ? it.last_price : it.default_price) + '</div></div>' +
          '<span data-menu></span></div>');
        B.$('[data-menu]', row).appendChild(ui().actionsMenu([
          { label: it.favorite ? 'Retirer des favoris' : 'Marquer favori', icon: 'star', onClick: function () { B.catalogService.toggleFavorite(it.id); B.router.refresh(); } },
          { label: 'Modifier', icon: 'edit', onClick: function () { C().catalogItemForm(it, null); } },
          { label: 'Utiliser dans un devis', icon: 'doc', onClick: function () { B.router.go('/quotes/new'); } },
          {
            label: it.business_id ? 'Supprimer' : 'Retirer du catalogue', icon: 'trash', tone: 'danger', onClick: function () {
              C().confirmDelete('l’article ' + it.name, function () {
                B.catalogService.remove(it.id); ui().toast('Article retiré du catalogue.', 'success'); B.router.refresh();
              });
            }
          }
        ]));
        host.appendChild(row);
      });
      wrap.appendChild(list);
    }
    B.$('[data-new]', wrap).addEventListener('click', function () { C().catalogItemForm(null, null); });
    return wrap;
  }

  /* =======================================================================
     CHANTIERS (#48 → #50, #312 → #320)
     ======================================================================= */
  function projectsList() {
    const state = projectsList.state || (projectsList.state = { status: 'actifs' });
    const wrap = B.el('<div class="stack"></div>');
    const rows = B.projectService.list({ status: state.status });
    wrap.appendChild(B.el('<div class="row-between wrap"><div><h2>Mes chantiers</h2><div class="small muted">' + rows.length + ' chantier(s)</div></div>' +
      '<button class="btn btn-primary" data-new>' + ui().icon('plus', 18) + ' Nouveau chantier</button></div>'));

    const chips = B.el('<div class="chip-scroll"></div>');
    [['actifs', 'Actifs'], ['en_cours', 'En cours'], ['planifie', 'Planifiés'], ['termine', 'Terminés'], ['annule', 'Annulés'], ['all', 'Tous']].forEach(function (s) {
      const c = B.el('<button class="chip' + (state.status === s[0] ? ' active' : '') + '">' + h(s[1]) + '</button>');
      c.addEventListener('click', function () { state.status = s[0]; B.router.refresh(); });
      chips.appendChild(c);
    });
    wrap.appendChild(chips);

    if (!rows.length) {
      wrap.appendChild(ui().emptyState({
        icon: 'hardhat', title: 'Aucun chantier',
        text: 'Créez un chantier pour suivre son budget, ses dépenses et sa rentabilité.',
        actionLabel: 'Créer un chantier', onAction: function () { C().projectForm(null, null); }
      }));
    } else {
      const grid = B.el('<div class="grid grid-cards"></div>');
      rows.forEach(function (p, i) {
        const s = B.calc.projectSummary(p, B.expenseService.list({ project_id: p.id }), B.session.settings());
        const client = B.clientService.get(p.client_id);
        const card = B.el('<div class="card card-hover animate-rise" ' + B.stagger(i) + ' style="cursor:pointer">' +
          '<div class="row-between"><strong>' + h(p.name) + '</strong>' + ui().statusBadge(B.PROJECT_STATUSES, p.status) + '</div>' +
          '<div class="tiny muted">' + h(client ? client.name : 'Sans client') + ' · ' + h(p.address || '') + '</div>' +
          '<div class="grid mt-12" style="grid-template-columns:repeat(2,1fr);gap:10px">' +
            '<div><div class="tiny muted">Montant</div><div class="strong mono">' + B.money(s.contract) + '</div></div>' +
            '<div><div class="tiny muted">Dépenses</div><div class="strong mono">' + B.money(s.spent) + '</div></div>' +
            '<div><div class="tiny muted">Budget</div><div class="strong mono">' + B.money(s.budget_total) + '</div></div>' +
            '<div><div class="tiny muted">Résultat provisoire</div><div class="strong mono ' + (s.actual_result >= 0 ? 'tone-success' : 'tone-danger') + '">' + B.money(s.actual_result) + '</div></div>' +
          '</div>' +
          '<div class="mt-12">' + ui().progress(p.progress) + '</div>' +
          '<div class="row-between mt-8"><span class="tiny muted">Avancement ' + p.progress + ' %</span>' + ui().badge(s.health.label, s.health.tone) + '</div>' +
          '</div>');
        card.addEventListener('click', function () { B.router.go('/projects/' + p.id); });
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
    }
    B.$('[data-new]', wrap).addEventListener('click', function () { C().projectForm(null, null); });
    return wrap;
  }

  function projectDetail(ctx) {
    const d = B.projectService.detail(ctx.params.id);
    if (!d) return notFound('Ce chantier est introuvable.');
    const p = d.project, s = d.summary;
    const wrap = B.el('<div class="stack"></div>');
    wrap.appendChild(B.el('<button class="btn btn-ghost btn-sm" data-back>' + ui().icon('arrowLeft', 16) + ' Mes chantiers</button>'));

    const head = B.el('<div class="card card-pad-lg"></div>');
    head.innerHTML = '<div class="row-between wrap"><div><div class="row" style="gap:10px"><h2>' + h(p.name) + '</h2>' + ui().statusBadge(B.PROJECT_STATUSES, p.status) + ui().badge(s.health.label, s.health.tone) + '</div>' +
      '<div class="small muted mt-8">' + h(d.client ? d.client.name : 'Sans client') + ' · ' + h(p.address || '') + '</div>' +
      '<div class="tiny muted">' + (p.start_date ? 'Du ' + B.dateLong(p.start_date) : '') + (p.end_date ? ' au ' + B.dateLong(p.end_date) : '') + '</div></div>' +
      '<div class="right"><div class="tiny muted">Résultat provisoire</div><div class="mono ' + (s.actual_result >= 0 ? 'tone-success' : 'tone-danger') + '" style="font-size:24px;font-weight:750">' + B.money(s.actual_result) + '</div></div></div>';
    const actions = B.el('<div class="btn-row mt-16"></div>');
    [['Dépense', 'coins', 'btn-primary', function () { B.screens.expenseForm(null, { project_id: p.id }); }],
     ['Devis', 'doc', 'btn-ghost', function () { B.router.go('/quotes/new?project=' + p.id); }],
     ['Facture', 'invoice', 'btn-ghost', function () { B.router.go('/invoices/new?project=' + p.id + (d.client ? '&client=' + d.client.id : '')); }],
     ['Photo', 'camera', 'btn-ghost', function () { addPhoto(); }],
     ['Modifier', 'edit', 'btn-ghost', function () { C().projectForm(p, null); }]
    ].forEach(function (a) {
      const b = B.el('<button class="btn ' + a[2] + '">' + ui().icon(a[1], 17) + ' ' + h(a[0]) + '</button>');
      b.addEventListener('click', a[3]);
      actions.appendChild(b);
    });
    head.appendChild(actions);
    wrap.appendChild(head);

    /* Avancement (#152) */
    const progCard = B.el('<div class="card"><div class="card-head"><h3>Avancement</h3><span class="strong">' + p.progress + ' %</span></div>' +
      ui().progress(p.progress) + '<div class="chip-scroll mt-12" data-steps></div></div>');
    const steps = B.$('[data-steps]', progCard);
    B.PROGRESS_STEPS.forEach(function (v) {
      const c = B.el('<button class="chip' + (p.progress === v ? ' active' : '') + '">' + v + ' %</button>');
      c.addEventListener('click', function () {
        B.projectService.setProgress(p.id, v);
        ui().toast('Avancement mis à jour : ' + v + ' %.', 'success');
        B.router.refresh();
      });
      steps.appendChild(c);
    });
    wrap.appendChild(progCard);

    /* Synthèse financière (#55, #56, #204) */
    wrap.appendChild(B.el('<div class="grid grid-2 grid-4-md">' +
      statMini('Montant du contrat', B.money(s.contract), 'montant prévu avec le client') +
      statMini('Budget prévu', B.money(s.budget_total), 'coût prévisionnel') +
      statMini('Dépenses réelles', B.money(s.spent), 'enregistrées à ce jour') +
      statMini('Budget restant', B.money(s.budget_remaining), s.status.label) + '</div>'));

    wrap.appendChild(B.el('<div class="card"><div class="card-head"><h3>Rentabilité</h3><span class="tiny muted">Prévision vs réel</span></div>' +
      ui().kv('Montant du chantier', B.money(s.contract)) +
      ui().kv('Budget prévu', B.money(s.budget_total)) +
      ui().kv('Marge prévisionnelle (contrat − budget)', B.money(s.estimated_margin), 'tone-success') +
      ui().kv('Dépenses réelles', B.money(s.spent)) +
      ui().kv('Résultat provisoire (contrat − dépenses)', B.money(s.actual_result), s.actual_result >= 0 ? 'tone-success' : 'tone-danger') +
      ui().kv('Écart budget / réel', B.signedMoney(s.variance), s.variance > 0 ? 'tone-danger' : 'tone-success') +
      ui().kv('Montant payé', B.money(s.paid)) +
      ui().kv('Reste à encaisser', B.money(s.remaining_to_pay), s.remaining_to_pay > 0 ? 'tone-warn' : 'tone-success') +
      '<div class="help-text mt-12">Résultat provisoire : estimation basée sur vos données enregistrées. Le montant encaissé n’est pas la même chose que le revenu contractuel.</div></div>'));

    /* Alertes (#57) */
    const alertsCard = B.el('<div class="card"><div class="card-head"><h3>Alertes</h3></div><div class="stack-sm" data-alerts></div></div>');
    const ah = B.$('[data-alerts]', alertsCard);
    d.alerts.forEach(function (a) { ah.appendChild(B.screens.alertRow(a)); });
    wrap.appendChild(alertsCard);

    /* Comparaison par poste (#58, #204) */
    const varCard = B.el('<div class="card"><div class="card-head"><h3>Budget / réel par poste</h3></div>' +
      '<div class="table-wrap"><table class="data"><thead><tr><th>Poste</th><th class="num">Budget</th><th class="num col-opt">Réel</th><th class="num">Écart</th><th class="num col-opt">%</th><th>État</th></tr></thead>' +
      '<tbody>' + s.analysis.rows.map(function (r) {
        return '<tr><td><strong>' + h(r.label) + '</strong>' +
          '<div class="cell-sub">Dépensé : ' + B.money(r.actual) + ' (' + (r.rate > 0 ? '+' : '') + r.rate + ' %)</div>' +
          '<div class="progress thin mt-8">' + ui().progress(r.ratio * 100, r.status === 'depassement' ? 'danger' : r.status === 'attention' ? 'warn' : 'success').replace(/<div class="progress[^>]*>|<\/div>/g, '') + '</div></td>' +
          '<td class="num">' + B.money(r.planned) + '</td><td class="num col-opt">' + B.money(r.actual) + '</td>' +
          '<td class="num ' + (r.variance > 0 ? 'tone-danger' : 'tone-success') + '">' + B.signedMoney(r.variance) + '</td>' +
          '<td class="num col-opt">' + (r.rate > 0 ? '+' : '') + r.rate + ' %</td>' +
          '<td>' + ui().badge(B.BUDGET_STATUS[r.status].label, B.BUDGET_STATUS[r.status].tone) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="totals-box mt-16"><div class="line"><span>Budget total</span><span class="pill-num">' + B.money(s.analysis.planned_total) + '</span></div>' +
      '<div class="line"><span>Dépenses réelles</span><span class="pill-num">' + B.money(s.analysis.actual_total) + '</span></div>' +
      '<div class="line total"><span>Écart</span><span class="pill-num ' + (s.analysis.variance > 0 ? 'tone-danger' : 'tone-success') + '">' + B.signedMoney(s.analysis.variance) + '</span></div></div></div>');
    wrap.appendChild(varCard);

    /* Dépenses du chantier (#315) */
    const expCard = B.el('<div class="card"><div class="card-head"><h3>Dépenses du chantier</h3>' +
      '<button class="btn btn-soft btn-sm" data-add>' + ui().icon('plus', 15) + ' Ajouter</button></div><div data-list></div></div>');
    const el2 = B.$('[data-list]', expCard);
    if (!d.expenses.length) el2.appendChild(B.el('<p class="muted small">Aucune dépense enregistrée sur ce chantier.</p>'));
    else {
      const list = B.el('<div class="list"></div>');
      d.expenses.slice(0, 12).forEach(function (e) {
        const cat = B.expenseCategory(e.category);
        const row = B.el('<div class="list-item" style="cursor:default"><div class="avatar neutral">' + ui().icon(cat.icon, 17) + '</div>' +
          '<div class="body"><div class="t1">' + h(e.description) + '</div><div class="t2">' + h(cat.label) + ' · ' + B.dateShort(e.date) +
          (e.supplier_name ? ' · ' + h(e.supplier_name) : '') + '</div></div>' +
          '<div class="end"><div class="amount mono">' + B.money(e.amount) + '</div></div><span data-menu></span></div>');
        B.$('[data-menu]', row).appendChild(ui().actionsMenu([
          { label: 'Modifier', icon: 'edit', onClick: function () { B.screens.expenseForm(e, null); } },
          { label: 'Voir le justificatif', icon: 'image', hidden: !e.receipt, onClick: function () { showImage(e.receipt, e.description); } },
          { label: 'Supprimer', icon: 'trash', tone: 'danger', onClick: function () {
              C().confirmDelete('la dépense « ' + e.description + ' »', function () {
                B.expenseService.remove(e.id); ui().toast('Dépense supprimée.', 'success'); B.router.refresh();
              });
            } }
        ]));
        list.appendChild(row);
      });
      el2.appendChild(list);
    }
    B.$('[data-add]', expCard).addEventListener('click', function () { B.screens.expenseForm(null, { project_id: p.id }); });
    wrap.appendChild(expCard);

    /* Photos (#70, #71, #319) */
    const photoCard = B.el('<div class="card"><div class="card-head"><h3>Photos du chantier</h3>' +
      '<button class="btn btn-soft btn-sm" data-add>' + ui().icon('camera', 15) + ' Ajouter</button></div><div data-gallery></div></div>');
    function paintGallery() {
      const host = B.$('[data-gallery]', photoCard);
      host.innerHTML = '';
      const photos = B.photoService.list({ project_id: p.id });
      if (!photos.length) { host.appendChild(B.el('<p class="muted small">Aucune photo pour le moment.</p>')); return; }
      const g = B.el('<div class="gallery"></div>');
      photos.forEach(function (ph) {
        const item = B.el('<div class="ph"><img src="' + h(ph.file_url) + '" alt="' + h(ph.title) + '" loading="lazy">' +
          '<div class="cap">' + h(ph.title) + '</div></div>');
        item.addEventListener('click', function () {
          const m = ui().modal({ title: ph.title, size: 'wide', body: '<img src="' + h(ph.file_url) + '" alt="" style="width:100%;border-radius:12px">' });
          const footer = B.el('<div class="btn-row" style="width:100%"></div>');
          const replace = B.el('<button class="btn btn-ghost">Remplacer la photo</button>');
          replace.addEventListener('click', function () {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = 'image/*';
            input.addEventListener('change', async function () {
              if (!input.files[0]) return;
              const url = await ui().readImage(input.files[0], 1200);
              B.photoService.replace(ph.id, url);
              m.close(); ui().toast('Photo remplacée.', 'success'); paintGallery();
            });
            input.click();
          });
          const del = B.el('<button class="btn btn-danger">Supprimer</button>');
          del.addEventListener('click', function () {
            m.close();
            C().confirmDelete('cette photo', function () { B.photoService.remove(ph.id); ui().toast('Photo supprimée.', 'success'); paintGallery(); });
          });
          footer.appendChild(replace); footer.appendChild(del);
          m.foot.innerHTML = '';
          m.foot.appendChild(footer);
        });
        g.appendChild(item);
      });
      host.appendChild(g);
    }
    function addPhoto() {
      ui().modal({
        title: 'Ajouter des photos', size: 'wide',
        body: B.el('<div class="stack"><p class="muted small">Prenez une photo du chantier ou choisissez une image.</p></div>')
      }).body.appendChild(ui().imagePicker({
        title: 'Ajouter une photo', onPick: function (url) {
          B.photoService.add({ project_id: p.id, title: 'Photo du ' + B.dateShort(B.today()), file_url: url, date: B.today() });
          ui().toast('Photo ajoutée au chantier.', 'success');
          B.router.refresh();
        }
      }));
    }
    paintGallery();
    B.$('[data-add]', photoCard).addEventListener('click', addPhoto);
    wrap.appendChild(photoCard);

    /* Documents (#314) */
    const docsCard = B.el('<div class="card"><div class="card-head"><h3>Documents associés</h3></div><div data-docs></div></div>');
    const dh = B.$('[data-docs]', docsCard);
    const docs = d.documents;
    if (!docs.length) dh.appendChild(B.el('<p class="muted small">Aucun devis ou facture associé.</p>'));
    else {
      const list = B.el('<div class="list"></div>');
      docs.forEach(function (doc) {
        const row = B.el('<button class="list-item"><div class="avatar">' + ui().icon(doc.type === 'Facture' ? 'invoice' : 'doc', 17) + '</div>' +
          '<div class="body"><div class="t1">' + h(doc.number) + '</div><div class="t2">' + h(doc.type) + ' · ' + B.dateShort(doc.date) + '</div></div>' +
          '<div class="end"><div class="amount mono">' + B.money(doc.amount) + '</div>' +
          (doc.type === 'Facture' ? ui().statusBadge(B.INVOICE_STATUSES, doc.status) : ui().statusBadge(B.QUOTE_STATUSES, doc.status)) + '</div></button>');
        row.addEventListener('click', function () { B.router.go(doc.route.replace('#', '')); });
        list.appendChild(row);
      });
      dh.appendChild(list);
    }
    wrap.appendChild(docsCard);

    /* Notes & actions */
    const notes = B.el('<div class="card"><div class="card-head"><h3>Notes</h3><button class="btn btn-ghost btn-sm" data-edit-notes>Modifier</button></div>' +
      '<p class="small muted" data-notes>' + h(p.notes || 'Aucune note.') + '</p></div>');
    B.$('[data-edit-notes]', notes).addEventListener('click', function () {
      const ta = B.el('<textarea class="textarea" rows="4">' + h(p.notes || '') + '</textarea>');
      const m = ui().modal({ title: 'Notes du chantier', body: ta });
      const ok = B.el('<button class="btn btn-primary">Enregistrer</button>');
      ok.addEventListener('click', function () {
        B.projectService.update(p.id, { notes: ta.value });
        m.close(); ui().toast('Note enregistrée.', 'success'); B.router.refresh();
      });
      m.foot.appendChild(ok);
    });
    wrap.appendChild(notes);

    const danger = B.el('<div class="card"><div class="card-head"><h3>Actions</h3></div><div class="stack-sm">' +
      '<button class="btn btn-ghost btn-block" data-archive>' + ui().icon('archive', 17) + (p.archived ? ' Restaurer le chantier' : ' Archiver le chantier') + '</button>' +
      '<button class="btn btn-danger btn-block" data-del>' + ui().icon('trash', 17) + ' Supprimer le chantier</button></div></div>');
    B.$('[data-archive]', danger).addEventListener('click', function () {
      B.projectService.archive(p.id, !p.archived);
      ui().toast(p.archived ? 'Chantier restauré.' : 'Chantier archivé (les données sont conservées).', 'success');
      B.router.refresh();
    });
    B.$('[data-del]', danger).addEventListener('click', function () {
      C().confirmDelete('le chantier ' + p.name, function () {
        B.projectService.remove(p.id); ui().toast('Chantier supprimé.', 'success'); B.router.go('/projects');
      });
    });
    wrap.appendChild(danger);

    B.$('[data-back]', wrap).addEventListener('click', function () { B.router.go('/projects'); });
    return wrap;
  }

  function showImage(src, title) {
    ui().modal({ title: title || 'Justificatif', size: 'wide', body: '<img src="' + h(src) + '" alt="" style="width:100%;border-radius:12px">' });
  }

  /* =======================================================================
     DÉPENSES (#51 → #55, #153, #156)
     ======================================================================= */
  function expenses() {
    const state = expenses.state || (expenses.state = { period: 'all', category: 'all', project: 'all', search: '' });
    const wrap = B.el('<div class="stack"></div>');
    const range = B.periodRange(state.period);
    const filters = { category: state.category, from: range.from, to: range.to, search: state.search };
    if (state.project !== 'all') filters.project_id = state.project;
    const rows = B.expenseService.list(filters);
    const total = B.calc.calculateSums(rows);
    const cats = B.calc.expensesByCategory(rows);

    wrap.appendChild(B.el('<div class="row-between wrap"><div><h2>Mes dépenses</h2><div class="small muted">' + h(range.label) + ' · ' + rows.length + ' dépense(s)</div></div>' +
      '<button class="btn btn-primary" data-new>' + ui().icon('plus', 18) + ' Ajouter une dépense</button></div>'));

    wrap.appendChild(B.el('<div class="card" style="background:linear-gradient(135deg,#0F766E,#115E59);color:#fff;border:0">' +
      '<div class="tiny" style="color:rgba(255,255,255,.8)">Total des dépenses affichées</div>' +
      '<div class="mono" style="font-size:26px;font-weight:800">' + B.money(total) + '</div>' +
      '<div class="tiny mt-8" style="color:rgba(255,255,255,.8)">' + (cats.length ? 'Principale catégorie : ' + h(cats[0].label) + ' (' + B.money(cats[0].value) + ')' : 'Aucune dépense sur la période') + '</div></div>'));

    wrap.appendChild(C().periodChips(state.period, function (p) { state.period = p; B.router.refresh(); }));

    const chips = B.el('<div class="chip-scroll"></div>');
    [['all', 'Toutes catégories']].concat(B.EXPENSE_CATEGORIES.map(function (c) { return [c.id, c.label]; })).forEach(function (c) {
      const chip = B.el('<button class="chip' + (state.category === c[0] ? ' active' : '') + '">' + h(c[1]) + '</button>');
      chip.addEventListener('click', function () { state.category = c[0]; B.router.refresh(); });
      chips.appendChild(chip);
    });
    wrap.appendChild(chips);

    const projChip = B.el('<div class="chip-scroll"></div>');
    const projectsList_ = B.projectService.list({ status: 'all', hide_archived: false });
    [['all', 'Tous les chantiers']].concat(projectsList_.map(function (p) { return [p.id, p.name]; })).concat([['none', 'Hors chantier']]).forEach(function (p) {
      const chip = B.el('<button class="chip' + (state.project === p[0] ? ' active' : '') + '">' + h(p[1]) + '</button>');
      chip.addEventListener('click', function () {
        state.project = p[0];
        if (p[0] === 'none') { state.project = 'none'; }
        B.router.refresh();
      });
      projChip.appendChild(chip);
    });
    wrap.appendChild(projChip);

    let list_ = rows;
    if (state.project === 'none') list_ = rows.filter(function (e) { return !e.project_id; });

    if (!list_.length) {
      wrap.appendChild(ui().emptyState({
        icon: 'coins', title: 'Aucune dépense', text: 'Enregistrez vos achats au fur et à mesure pour suivre votre budget.',
        actionLabel: 'Ajouter une dépense', onAction: function () { B.screens.expenseForm(null, null); }
      }));
    } else {
      const list = B.el('<div class="card"><div class="list" data-list></div></div>');
      const host = B.$('[data-list]', list);
      list_.forEach(function (e) {
        const cat = B.expenseCategory(e.category);
        const proj = e.project_id ? B.projectService.get(e.project_id) : null;
        const row = B.el('<div class="list-item" style="cursor:default">' +
          (e.receipt ? '<img src="' + h(e.receipt) + '" alt="" style="width:40px;height:40px;border-radius:11px;object-fit:cover;cursor:pointer" data-photo>' :
            '<div class="avatar neutral">' + ui().icon(cat.icon, 18) + '</div>') +
          '<div class="body"><div class="t1">' + h(e.description) + '</div>' +
          '<div class="t2">' + h(cat.label) + ' · ' + B.dateShort(e.date) + (proj ? ' · ' + h(proj.name) : '') + (e.supplier_name ? ' · ' + h(e.supplier_name) : '') + '</div></div>' +
          '<div class="end"><div class="amount mono">' + B.money(e.amount) + '</div><div class="tiny muted">' + h(e.number || '') + '</div></div>' +
          '<span data-menu></span></div>');
        if (B.$('[data-photo]', row)) B.$('[data-photo]', row).addEventListener('click', function () { showImage(e.receipt, e.description); });
        B.$('[data-menu]', row).appendChild(ui().actionsMenu([
          { label: 'Modifier', icon: 'edit', onClick: function () { B.screens.expenseForm(e, null); } },
          { label: 'Voir le justificatif', icon: 'image', hidden: !e.receipt, onClick: function () { showImage(e.receipt, e.description); } },
          {
            label: 'Voir le chantier', icon: 'hardhat', hidden: !e.project_id,
            onClick: function () { B.router.go('/projects/' + e.project_id); }
          },
          {
            label: 'Supprimer', icon: 'trash', tone: 'danger', onClick: function () {
              C().confirmDelete('la dépense « ' + e.description + ' »', function () {
                B.expenseService.remove(e.id); ui().toast('Dépense supprimée.', 'success'); B.router.refresh();
              });
            }
          }
        ]));
        host.appendChild(row);
      });
      wrap.appendChild(list);
    }

    if (cats.length) {
      const catCard = B.el('<div class="card"><div class="card-head"><h3>Répartition par catégorie</h3></div></div>');
      catCard.appendChild(B.el(ui().donut(cats.map(function (c) { return { label: c.label, value: c.value }; }), { centerLabel: 'Total', centerValue: B.moneyShort(total) })));
      wrap.appendChild(catCard);
    }

    const foot = B.el('<div class="row-between"><button class="btn btn-ghost btn-sm" data-export>' + ui().icon('download', 15) + ' Exporter en CSV</button>' +
      '<span class="tiny muted">BATIYO enregistre vos dépenses ; il ne remplace pas une comptabilité.</span></div>');
    B.$('[data-export]', foot).addEventListener('click', B.screens.exportExpensesCsv);
    wrap.appendChild(foot);
    B.$('[data-new]', wrap).addEventListener('click', function () { B.screens.expenseForm(null, null); });
    return wrap;
  }

  /* =======================================================================
     DOCUMENTS (#80, #81)
     ======================================================================= */
  function documents() {
    const state = documents.state || (documents.state = { tab: 'all', search: '' });
    const wrap = B.el('<div class="stack"></div>');

    /* En ligne, rafraîchir la vue depuis Supabase pour éviter qu'un cache local
       stale masque un devis ou une facture déjà enregistrés à distance. */
    if (B.network && B.network.state() === 'online' && B.DataRepository && B.DataRepository.remote && B.DataRepository.remote.ready && B.session.isLoggedIn() && !documents._refreshing) {
      documents._refreshing = true;
      B.DataRepository.refreshFromRemote().then(function () {
        documents._refreshing = false;
        B.router.refresh();
      }).catch(function () {
        documents._refreshing = false;
      });
    }

    const rows = B.documentService.list({ tab: state.tab, search: state.search });
    wrap.appendChild(B.el('<div><h2>Mes documents</h2><div class="small muted">Devis, factures et justificatifs</div></div>'));

    const tabs = B.el('<div class="chip-scroll"></div>');
    [['all', 'Tous'], ['brouillons', 'Brouillons'], ['acceptes', 'Acceptés'], ['payes', 'Payés']].forEach(function (t) {
      const c = B.el('<button class="chip' + (state.tab === t[0] ? ' active' : '') + '">' + h(t[1]) + '</button>');
      c.addEventListener('click', function () { state.tab = t[0]; B.router.refresh(); });
      tabs.appendChild(c);
    });
    wrap.appendChild(tabs);

    const search = B.el('<div class="search">' + ui().icon('search', 18) + '<input placeholder="Rechercher : Koffi, DEV-001, ciment…" value="' + h(state.search) + '" aria-label="Rechercher"></div>');
    wrap.appendChild(search);
    B.$('input', search).addEventListener('input', B.debounce(function () { state.search = this.value; B.router.refresh(); }, 200));

    if (!rows.length) {
      wrap.appendChild(ui().emptyState({ icon: 'file', title: 'Aucun document', text: 'Vos devis, factures et justificatifs apparaîtront ici.' }));
    } else {
      const list = B.el('<div class="card"><div class="list" data-list></div></div>');
      const host = B.$('[data-list]', list);
      rows.forEach(function (d) {
        const client = d.client_id ? B.clientService.get(d.client_id) : null;
        const list_ = d.status_list === 'quotes' ? B.QUOTE_STATUSES : d.status_list === 'invoices' ? B.INVOICE_STATUSES : null;
        const row = B.el('<button class="list-item"><div class="avatar ' + (d.type === 'Facture' ? 'success' : d.type === 'Justificatif' ? 'neutral' : '') + '">' +
          ui().icon(d.type === 'Facture' ? 'invoice' : d.type === 'Justificatif' ? 'image' : 'doc', 18) + '</div>' +
          '<div class="body"><div class="t1">' + h(d.number) + ' · ' + h(d.type) + '</div>' +
          '<div class="t2">' + h(client ? client.name : d.title) + ' · ' + B.dateShort(d.date) + '</div></div>' +
          '<div class="end"><div class="amount mono">' + B.money(d.amount) + '</div>' +
          (list_ ? ui().statusBadge(list_, d.status) : ui().badge('Reçu', 'neutral')) + '</div></button>');
        row.addEventListener('click', function () { B.router.go(d.route.replace('#', '')); });
        host.appendChild(row);
      });
      wrap.appendChild(list);
    }
    return wrap;
  }

  /* =======================================================================
     ASSISTANT (#59 → #64, #116 → #122)
     ======================================================================= */
  function assistant() {
    const wrap = B.el('<div class="stack"></div>');
    const history = B.assistantService.history();
    wrap.appendChild(B.el('<div class="row-between wrap"><div class="row" style="gap:11px">' +
      '<div style="width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#0F766E,#115E59);color:#fff;display:grid;place-items:center">' + ui().icon('sparkles', 22) + '</div>' +
      '<div><h2>Assistant BATIYO</h2><div class="small muted">Demandez-moi quelque chose sur votre activité.</div></div></div>' +
      '<button class="btn btn-ghost btn-sm" data-clear>Effacer</button></div>'));

    const chat = B.el('<div class="card chat" data-chat></div>');
    wrap.appendChild(chat);

    const sugg = B.el('<div class="chip-scroll" data-sugg></div>');
    B.assistantService.suggestions().forEach(function (s) {
      const c = B.el('<button class="chip">' + h(s.label) + '</button>');
      c.addEventListener('click', function () { send(s.text); });
      sugg.appendChild(c);
    });
    wrap.appendChild(sugg);

    const inputBar = B.el('<div class="chat-input">' +
      '<textarea rows="1" data-input placeholder="Ex : Combien ai-je dépensé sur le chantier Koffi ?" aria-label="Votre question"></textarea>' +
      '<button class="btn btn-primary btn-icon" data-send aria-label="Envoyer">' + ui().icon('chevronRight', 19) + '</button></div>');
    wrap.appendChild(inputBar);
    wrap.appendChild(B.el('<div class="tiny muted center">' +
      'Les calculs sont réalisés par l’application à partir de vos données enregistrées. L’assistant ne crée ou ne modifie rien sans votre confirmation. ' +
      'L’entrée vocale n’est pas encore disponible.</div>'));

    function bubble(role, content, meta) {
      const el = B.el('<div class="bubble ' + role + '"></div>');
      el.innerHTML = h(content).replace(/\n/g, '<br>') + (meta ? '<div class="meta">' + h(meta) + '</div>' : '');
      chat.appendChild(el);
      try { if (el.scrollIntoView) el.scrollIntoView({ block: 'end', behavior: 'smooth' }); } catch (e) { /* ignore */ }
      return el;
    }

    function renderHistory() {
      chat.innerHTML = '';
      if (!history.length) {
        bubble('assistant', 'Bonjour,\n\nJe peux vous montrer vos dépenses, votre marge, votre budget restant, ou préparer un devis et enregistrer une dépense.\n\nPour ces actions, je vous demanderai toujours de confirmer.');
      } else {
        history.forEach(function (m) { bubble(m.role === 'user' ? 'user' : 'assistant', m.content); });
      }
    }

    let pending = null;
    function send(text) {
      if (!text) return;
      bubble('user', text);
      B.assistantService.addMessage('user', text);
      const wait = B.el('<div class="bubble assistant"><span class="typing"><i></i><i></i><i></i></span></div>');
      chat.appendChild(wait);
      try { if (wait.scrollIntoView) wait.scrollIntoView({ block: 'end', behavior: 'smooth' }); } catch (e) { /* ignore */ }
      setTimeout(function () {
        wait.remove();
        const res = B.assistant.respond(text);
        const el = bubble('assistant', res.text);
        B.assistantService.addMessage('assistant', res.text, res.meta);
        if (res.pending) {
          pending = res.pending;
          const card = B.el('<div class="pending-card"><div class="tiny muted mb-8">Action à confirmer</div>' +
            '<div class="strong small">' + h(res.pending.label) + '</div><div class="btn-row mt-12"></div></div>');
          const ok = B.el('<button class="btn btn-primary btn-sm">Confirmer</button>');
          const no = B.el('<button class="btn btn-ghost btn-sm">Annuler</button>');
          ok.addEventListener('click', function () {
            const done = B.assistant.execute(pending);
            pending = null;
            card.remove();
            bubble('assistant', done.text);
            B.assistantService.addMessage('assistant', done.text);
            ui().toast(done.ok ? 'Action enregistrée.' : 'Action impossible.', done.ok ? 'success' : 'error', {
              actionLabel: done.ok && done.route ? 'Ouvrir' : null,
              onAction: done.ok && done.route ? function () { B.router.go(done.route.replace('#', '')); } : null
            });
            if (done.ok && done.route) {
              const open = B.el('<button class="btn btn-soft btn-sm mt-8">Ouvrir</button>');
              open.addEventListener('click', function () { B.router.go(done.route.replace('#', '')); });
              chat.appendChild(open);
            }
          });
          no.addEventListener('click', function () {
            pending = null;
            card.remove();
            bubble('assistant', 'Action annulée. Rien n’a été enregistré.');
          });
          card.lastChild.appendChild(ok); card.lastChild.appendChild(no);
          chat.appendChild(card);
          try { if (card.scrollIntoView) card.scrollIntoView({ block: 'end', behavior: 'smooth' }); } catch (e) { /* ignore */ }
        }
      }, 320);
    }

    renderHistory();

    /* Question venant du tableau de bord (#193) */
    if (B.pendingAsk) {
      const q = B.pendingAsk;
      B.pendingAsk = null;
      setTimeout(function () { send(q); }, 380);
    }

    const ta = B.$('[data-input]', inputBar);
    B.$('[data-send]', inputBar).addEventListener('click', function () { const v = ta.value.trim(); ta.value = ''; send(v); });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const v = ta.value.trim(); ta.value = ''; send(v); }
    });
    B.$('[data-clear]', wrap).addEventListener('click', function () {
      ui().confirm({ title: 'Effacer la conversation ?', message: 'L’historique de discussion sera supprimé. Vos données (devis, dépenses…) ne sont pas modifiées.', confirmLabel: 'Effacer' })
        .then(function (ok) {
          if (!ok) return;
          B.assistantService.clear();
          B.router.go('/assistant');
          ui().toast('Conversation effacée.', 'success');
        });
    });
    return wrap;
  }

  /* =======================================================================
     PROFIL (#66 → #69, #173, #175, #176)
     ======================================================================= */
  function profile() {
    const user = B.session.user();
    const business = B.session.business();
    const prof = B.session.profession();
    const wrap = B.el('<div class="stack"></div>');
    wrap.appendChild(B.el('<div><h2>Mon profil</h2><div class="small muted">Informations personnelles, entreprise et activité</div></div>'));

    /* Identité */
    const idCard = B.el('<div class="card card-pad-lg"></div>');
    idCard.innerHTML = '<div class="row-between wrap"><div class="row" style="gap:14px">' +
      (user.avatar ? '<img class="avatar-img" style="width:62px;height:62px" src="' + h(user.avatar) + '" alt="">' : '<div class="avatar-initials" style="width:62px;height:62px;font-size:20px">' + h(B.initials(user.name)) + '</div>') +
      '<div><h3>' + h(user.name) + '</h3><div class="small muted">' + h(user.identifier) + '</div>' +
      '<div class="row mt-8" style="gap:6px">' + ui().badge(prof.name, 'primary') + ui().badge(user.role === 'proprietaire' ? 'Propriétaire' : 'Utilisateur', 'neutral') + '</div></div></div>' +
      '<button class="btn btn-ghost btn-sm" data-photo>' + ui().icon('camera', 16) + ' Photo</button></div>';
    B.$('[data-photo]', idCard).addEventListener('click', function () {
      const m = ui().modal({ title: 'Photo de profil', body: B.el('<div></div>') });
      m.body.appendChild(ui().imagePicker({
        title: 'Choisir une photo', onPick: function (url) {
          B.profileService.updatePersonal({ avatar: url });
          m.close(); ui().toast('Photo de profil mise à jour.', 'success'); B.router.refresh();
        }
      }));
    });
    wrap.appendChild(idCard);

    /* Informations personnelles */
    const personal = B.el('<div class="card"><div class="card-head"><h3>Informations personnelles</h3></div><form class="form-grid"></form></div>');
    const pf = B.$('form', personal);
    pf.appendChild(ui().field({ label: 'Nom complet', name: 'name', value: user.name, required: true }));
    const p2 = B.session.profile();
    pf.appendChild(ui().field({ label: 'Téléphone', name: 'phone', type: 'tel', value: p2.phone || '' }));
    pf.appendChild(ui().field({ label: 'Email', name: 'email', type: 'email', value: p2.email || '' }));
    pf.appendChild(ui().field({ label: 'Adresse', name: 'address', value: p2.address || '' }));
    const savePersonal = B.el('<button class="btn btn-primary btn-block mt-12">Enregistrer</button>');
    savePersonal.addEventListener('click', function () {
      B.profileService.updatePersonal(ui().formValues(pf));
      ui().toast('Profil mis à jour.', 'success');
    });
    personal.appendChild(savePersonal);
    wrap.appendChild(personal);

    /* Entreprise (#67, #68) */
    const biz = B.el('<div class="card"><div class="card-head"><h3>Entreprise</h3></div><div data-logo></div><form class="form-grid mt-12"></form></div>');
    const bf = B.$('form', biz);
    bf.appendChild(ui().field({ label: 'Nom de l’entreprise', name: 'name', value: business.name, required: true }));
    bf.appendChild(ui().field({ label: 'Nom du responsable', name: 'manager_name', value: business.manager_name || '' }));
    bf.appendChild(ui().field({ label: 'Téléphone', name: 'phone', type: 'tel', value: business.phone || '' }));
    bf.appendChild(ui().field({ label: 'Email', name: 'email', type: 'email', value: business.email || '' }));
    bf.appendChild(ui().field({ label: 'Adresse', name: 'address', value: business.address || '' }));
    bf.appendChild(ui().field({ label: 'Informations additionnelles', name: 'notes', type: 'textarea', value: business.notes || '', hint: 'Ex : numéro RCCM, informations bancaires à afficher.' }));
    function paintLogo() {
      const host = B.$('[data-logo]', biz);
      host.innerHTML = '';
      if (business.logo) {
        host.appendChild(ui().imagePreview(business.logo, {
          title: 'Logo', subtitle: 'Utilisé sur vos devis, factures et PDF.',
          actions: [
            { label: 'Remplacer', onClick: function () { pickLogo(); } },
            { label: 'Supprimer', tone: 'danger', onClick: function () { B.profileService.setLogo(null); ui().toast('Logo supprimé.', 'success'); B.router.refresh(); } }
          ]
        }));
      } else {
        host.appendChild(ui().imagePicker({ icon: 'image', title: 'Ajouter un logo', hint: 'Il apparaîtra sur vos documents', onPick: function (url) { B.profileService.setLogo(url); paintLogo(); ui().toast('Logo enregistré.', 'success'); } }));
      }
    }
    function pickLogo() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.addEventListener('change', async function () {
        if (input.files[0]) { B.profileService.setLogo(await ui().readImage(input.files[0], 400)); paintLogo(); }
      });
      input.click();
    }
    paintLogo();
    const saveBiz = B.el('<button class="btn btn-primary btn-block mt-12">Enregistrer l’entreprise</button>');
    saveBiz.addEventListener('click', function () {
      const v = ui().formValues(bf);
      if (!v.name) { ui().showErrors(bf, { name: 'Indiquez le nom de l’entreprise.' }); return; }
      B.profileService.updateBusiness(v);
      ui().toast('Profil mis à jour.', 'success');
      B.router.refresh();
    });
    biz.appendChild(saveBiz);
    wrap.appendChild(biz);

    /* Activité — le métier (#16, #17, #176) */
    const activity = B.el('<div class="card"><div class="card-head"><h3>Activité</h3><span class="tiny muted">Le métier pilote votre catalogue</span></div>' +
      '<div class="banner banner-info mb-16">' + ui().icon('info', 18) +
      '<span><strong>Changer de métier modifiera le catalogue proposé pour vos futurs devis. Vos anciens documents resteront inchangés.</strong></span></div>' +
      '<div class="row-between"><div><div class="strong">' + h(prof.name) + '</div><div class="tiny muted">' + h(prof.description) + '</div></div>' +
      '<button class="btn btn-ghost btn-sm" data-change>Changer</button></div></div>');
    B.$('[data-change]', activity).addEventListener('click', function () {
      const m = ui().modal({ title: 'Changer de métier', size: 'wide' });
      m.body.innerHTML = '<div class="banner banner-warn mb-16">' + ui().icon('alert', 18) +
        '<span>Changer de métier modifiera le catalogue proposé pour vos <strong>futurs</strong> devis. Vos anciens documents resteront identiques.</span></div><div class="prof-grid" data-grid></div>';
      const grid = B.$('[data-grid]', m.body);
      B.PROFESSIONS.forEach(function (p) {
        const card = B.el('<button class="prof-card' + (p.id === prof.id ? ' active' : '') + '"><div class="il">' + ui().icon(p.icon, 20) + '</div><div class="nm">' + h(p.name) + '</div></button>');
        card.addEventListener('click', async function () {
          const ok = await ui().confirm({
            title: 'Passer au métier « ' + p.name + ' » ?',
            message: 'Le catalogue de vos prochains devis sera celui du métier ' + p.name + '.',
            detail: 'Vos anciens devis, factures et chantiers ne seront pas modifiés.',
            confirmLabel: 'Changer de métier'
          });
          if (!ok) return;
          B.profileService.setProfession(p.id);
          m.close();
          ui().toast('Métier mis à jour : ' + p.name + '. Catalogue adapté pour vos prochains devis.', 'success');
          B.router.refresh();
        });
        grid.appendChild(card);
      });
    });
    wrap.appendChild(activity);

    /* Documents / Sécurité / Données */
    wrap.appendChild(B.el('<div class="card"><div class="card-head"><h3>Documents de l’entreprise</h3></div>' +
      ui().kv('Logo', business.logo ? 'Ajouté' : 'Aucun') +
      ui().kv('Pied de page des documents', B.session.settings().document_footer || '—') +
      ui().kv('Conditions de paiement', B.truncate(B.session.settings().payment_terms || '—', 60)) +
      '<button class="btn btn-ghost btn-block mt-12" data-settings>Ouvrir les paramètres documents</button></div>'));
    B.$('[data-settings]', wrap).addEventListener('click', function () { B.router.go('/settings'); });

    const secu = B.el('<div class="card"><div class="card-head"><h3>Sécurité</h3></div>' +
      ui().kv('Identifiant de connexion', h(user.identifier)) +
      ui().kv('Session ouverte', B.dateTime(B.session.loggedAt())) +
      '<div class="btn-row mt-12"><button class="btn btn-ghost" data-pass>Changer le mot de passe</button>' +
      '<button class="btn btn-ghost" data-logout>' + ui().icon('logout', 16) + ' Se déconnecter</button></div></div>');
    B.$('[data-pass]', secu).addEventListener('click', function () {
      const f = B.el('<form class="form-grid"></form>');
      f.appendChild(ui().field({ label: 'Mot de passe actuel', name: 'old', type: 'password', required: true }));
      f.appendChild(ui().field({ label: 'Nouveau mot de passe', name: 'n1', type: 'password', required: true }));
      const m = ui().modal({ title: 'Changer le mot de passe', body: f });
      const ok = B.el('<button class="btn btn-primary">Enregistrer</button>');
      ok.addEventListener('click', function () {
        const v = ui().formValues(f);
        if (v.old !== user.password) { ui().showErrors(f, { old: 'Mot de passe actuel incorrect.' }); return; }
        if (!v.n1 || v.n1.length < 4) { ui().showErrors(f, { n1: '4 caractères minimum.' }); return; }
        B.DataRepository.local.update('users', user.id, { password: v.n1 });
        m.close(); ui().toast('Mot de passe mis à jour.', 'success');
      });
      m.foot.appendChild(ok);
    });
    B.$('[data-logout]', secu).addEventListener('click', function () {
      ui().confirm({ title: 'Se déconnecter ?', message: 'Vos données restent enregistrées sur cet appareil.', confirmLabel: 'Se déconnecter' })
        .then(function (ok) { if (ok) { B.authService.logout(); B.router.go('/'); } });
    });
    wrap.appendChild(secu);
    return wrap;
  }

  /* =======================================================================
     PARAMÈTRES (#174, #240)
     ======================================================================= */
  function settings() {
    const s = B.session.settings();
    const wrap = B.el('<div class="stack"></div>');
    wrap.appendChild(B.el('<div><h2>Paramètres</h2><div class="small muted">Entreprise, documents, préférences et données</div></div>'));

    /* Documents et taxes (#37) */
    const taxCard = B.el('<div class="card"><div class="card-head"><h3>Documents et taxes</h3></div><form class="form-grid"></form></div>');
    const tf = B.$('form', taxCard);
    tf.appendChild(ui().field({ label: 'Pied de page des documents', name: 'document_footer', value: s.document_footer || '' }));
    tf.appendChild(ui().field({ label: 'Conditions de paiement par défaut', name: 'payment_terms', type: 'textarea', value: s.payment_terms || '' }));
    tf.appendChild(ui().field({ label: 'Durée de validité d’un devis (jours)', name: 'valid_days', type: 'number', value: s.valid_days || 30, min: 1, max: 365 }));
    const taxSwitch = B.el('<label class="switch"><input type="checkbox" name="tax_enabled"' + (s.tax_enabled !== false ? ' checked' : '') + '><span>Activer une taxe sur les documents</span></label>');
    tf.appendChild(taxSwitch);
    tf.appendChild(ui().field({ label: 'Nom de la taxe', name: 'tax_name', value: s.tax_name || 'TVA', hint: 'Ex : TVA, TPS, taxe locale.' }));
    tf.appendChild(ui().field({ label: 'Taux (%)', name: 'tax_rate', type: 'number', value: s.tax_rate || 0, min: 0, max: 100, step: 0.1 }));
    tf.appendChild(ui().field({
      label: 'Mode de calcul', name: 'tax_mode', type: 'select', value: s.tax_mode || 'exclusive',
      options: [{ value: 'exclusive', label: 'Ajoutée au sous-total (prix hors taxe)' }, { value: 'inclusive', label: 'Incluse dans les prix' }, { value: 'none', label: 'Aucune taxe' }],
      hint: 'Aucune règle fiscale n’est imposée : vous configurez vous-même selon votre contexte.'
    }));
    const saveTax = B.el('<button class="btn btn-primary btn-block mt-12">Enregistrer</button>');
    saveTax.addEventListener('click', function () {
      const v = ui().formValues(tf);
      B.session.updateSettings({
        document_footer: v.document_footer, payment_terms: v.payment_terms, valid_days: Number(v.valid_days) || 30,
        tax_enabled: v.tax_enabled, tax_name: v.tax_name, tax_rate: Number(v.tax_rate) || 0, tax_mode: v.tax_mode
      });
      ui().toast('Paramètres enregistrés.', 'success');
      B.router.refresh();
    });
    taxCard.appendChild(saveTax);
    wrap.appendChild(taxCard);

    /* Préférences / devise */
    const prefCard = B.el('<div class="card"><div class="card-head"><h3>Préférences</h3></div><form class="form-grid"></form></div>');
    const prf = B.$('form', prefCard);
    prf.appendChild(ui().field({ label: 'Devise d’affichage', name: 'currency', type: 'select', value: s.currency || 'FCFA', options: [{ value: 'FCFA', label: 'FCFA — Franc CFA' }], hint: 'D’autres devises seront ajoutées pour l’Afrique de l’Ouest.' }));
    prf.appendChild(ui().field({ label: 'Langue', name: 'language', type: 'select', value: 'fr', options: [{ value: 'fr', label: 'Français' }] }));
    prf.appendChild(ui().field({ label: 'Format de date', name: 'date_format', type: 'select', value: s.date_format || 'dd/mm/yyyy', options: [{ value: 'dd/mm/yyyy', label: '29/09/2026' }, { value: 'long', label: '29 septembre 2026' }] }));
    const notifSwitch = B.el('<label class="switch"><input type="checkbox" name="notif_budget"' + ((s.notifications || {}).budget !== false ? ' checked' : '') + '><span>Notifications de budget et d’alertes</span></label>');
    prf.appendChild(notifSwitch);
    const savePref = B.el('<button class="btn btn-primary btn-block mt-12">Enregistrer</button>');
    savePref.addEventListener('click', function () {
      const v = ui().formValues(prf);
      B.session.updateSettings({ currency: 'FCFA', language: 'fr', date_format: v.date_format, notifications: { budget: v.notif_budget, documents: true, assistant: true } });
      ui().toast('Paramètres enregistrés.', 'success');
    });
    prefCard.appendChild(savePref);
    wrap.appendChild(prefCard);

    /* Données et sauvegarde (#158, #137, #84) */
    const info = B.DataRepository.local.storageInfo();
    const dataCard = B.el('<div class="card"><div class="card-head"><h3>Mes données</h3></div>' +
      ui().kv('Stockage local', info.adapter + ' · ' + info.kb + ' Ko utilisés') +
      ui().kv('Opérations en attente de synchronisation', String(B.DataRepository.local.pendingCount())) +
      '<div class="help-text mt-8">Architecture prête pour Supabase : les données sont enregistrées localement d’abord (offline-first), puis une file d’attente permet la synchronisation future.</div>' +
      '<div class="btn-row mt-12">' +
      '<button class="btn btn-ghost" data-export>' + ui().icon('download', 16) + ' Exporter les dépenses (CSV)</button>' +
      '<button class="btn btn-ghost" data-backup>' + ui().icon('download', 16) + ' Sauvegarde complète (JSON)</button>' +
      '</div></div>');
    B.$('[data-export]', dataCard).addEventListener('click', B.screens.exportExpensesCsv);
    B.$('[data-backup]', dataCard).addEventListener('click', function () {
      B.download('batiyo-sauvegarde.json', JSON.stringify(B.DataRepository.local.load(), null, 1), 'application/json');
      ui().toast('Sauvegarde générée.', 'success');
    });
    wrap.appendChild(dataCard);

    /* Déconnexion / cache local */
    const dangerCard = B.el('<div class="card"><div class="card-head"><h3>Sécurité et données locales</h3></div>' +
      '<div class="btn-row"><button class="btn btn-ghost" data-logout>' + ui().icon('logout', 16) + ' Se déconnecter</button>' +
      '<button class="btn btn-danger" data-clear-cache>' + ui().icon('trash', 16) + ' Effacer le cache local</button></div>' +
      '<div class="help-text mt-8">Effacer le cache ne supprime pas vos données dans Supabase. Elles seront rechargées après une prochaine connexion.</div></div>');
    B.$('[data-logout]', dangerCard).addEventListener('click', function () { B.authService.logout(); B.router.go('/'); });
    B.$('[data-clear-cache]', dangerCard).addEventListener('click', function () {
      ui().confirm({
        title: 'Effacer le cache local ?',
        message: 'Le cache enregistré sur cet appareil sera supprimé.',
        detail: 'Vos données Supabase ne seront pas supprimées.',
        confirmLabel: 'Effacer', tone: 'danger'
      }).then(function (ok) {
        if (!ok) return;
        B.authService.logout();
        B.DataRepository.local.reset();
        B.referenceData();
        ui().toast('Cache local effacé. Vos données distantes restent intactes.', 'success');
        B.router.go('/login');
      });
    });
    wrap.appendChild(dangerCard);
    return wrap;
  }

  function notFound(message) { return B.screens.notFound(message); }

  B.screens = B.screens || {};
  Object.assign(B.screens, {
    clientsList: clientsList, clientDetail: clientDetail, catalog: catalog,
    projectsList: projectsList, projectDetail: projectDetail, expenses: expenses,
    documents: documents, assistant: assistant, profile: profile, settings: settings
  });
})(globalThis.BATIYO = globalThis.BATIYO || {});
