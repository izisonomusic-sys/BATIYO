/* =========================================================================
   BATIYO — 16. TABLEAU DE BORD, ANALYSE, NOTIFICATIONS
   Priorités d'affichage (#148) : 1 actions · 2 chiffres · 3 alertes · 4 activité
   ========================================================================= */
(function (B) {
  'use strict';
  const h = B.escape;
  const ui = function () { return B.ui; };
  const C = function () { return B.components; };

  /* ------------------------------- Tableau de bord ------------------------ */
  function dashboard() {
    const data = B.dataScope();
    const stats = B.calc.dashboardStats(data);
    const business = B.session.business();
    const prof = B.session.profession();
    const focus = B.professionService.focus();
    const isEmpty = !stats.clients && !stats.quotes_count && !stats.projects_total && !stats.spent;

    const wrap = B.el('<div class="stack"></div>');
    const hour = new Date().getHours();
    const hello = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

    /* En-tête + actions rapides (#132) */
    wrap.appendChild(B.el(
      '<div class="row-between wrap">' +
        '<div><h2>' + h(hello) + ', ' + h((B.session.user() ? B.session.user().name.split(' ')[0] : '')) + '</h2>' +
        '<div class="small muted">' + h(business ? business.name : '') + ' · ' + h(prof.name) +
        ' · ' + B.dateLong(B.today()) + '</div></div>' +
        '<div class="row" style="gap:8px">' + netPill() + '</div>' +
      '</div>'));

    if (isEmpty) {
      wrap.appendChild(B.el('<div class="card card-pad-lg empty">' +
        '<div class="il">' + ui().icon('rocket', 30) + '</div>' +
        '<h3>Mon activité est encore vide</h3>' +
        '<p>Commencez par ajouter un client puis créez votre premier devis. BATIYO fera les calculs à votre place.</p>' +
        '<div class="btn-row" style="justify-content:center"><button class="btn btn-primary" data-new="client">Créer un client</button>' +
        '<button class="btn btn-ghost" data-new="quote">Créer un devis</button></div></div>'));
    }

    const quick = B.el('<div class="grid grid-4-md" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:10px"></div>');
    [['quote', 'doc', 'Nouveau devis'], ['invoice', 'invoice', 'Nouvelle facture'], ['expense', 'coins', 'Dépense'], ['client', 'users', 'Client']]
      .forEach(function (a) {
        const b = B.el('<button class="card card-hover" style="text-align:left;padding:14px;border:1px solid var(--line)"><div class="row" style="gap:10px">' +
          '<div style="width:36px;height:36px;border-radius:11px;background:var(--primary-soft);color:var(--primary-dark);display:grid;place-items:center">' + ui().icon(a[1], 19) + '</div>' +
          '<span class="strong small">' + h(a[2]) + '</span></div></button>');
        b.addEventListener('click', function () { quickCreate(a[0]); });
        quick.appendChild(b);
      });
    wrap.appendChild(quick);

    /* Cartes principales (#20, #131) */
    const cards = B.el('<div class="grid grid-2 grid-4-md"></div>');
    cards.innerHTML =
      statCard('trending', 'Chiffre d’affaires', B.money(stats.revenue), 'Devis acceptés + factures hors devis', 'primary') +
      statCard('coins', 'Dépenses', B.money(stats.spent), 'Toutes dépenses enregistrées', 'warn') +
      statCard('chart', 'Marge estimée', B.money(stats.margin_estimated), 'Contrat − budget prévisionnel', 'success') +
      statCard('hardhat', 'Chantiers actifs', String(stats.active_projects), stats.projects_total + ' chantier' + (stats.projects_total > 1 ? 's' : '') + ' au total', 'info');
    wrap.appendChild(cards);

    const explain = B.el('<div class="tiny muted">' +
      'Marge estimée : somme des écarts « montant du contrat − budget prévisionnel » de vos chantiers. ' +
      'Résultat provisoire (CA − dépenses) : <strong>' + B.money(stats.margin_actual) + '</strong>. Estimation basée sur vos données enregistrées.</div>');
    wrap.appendChild(explain);

    /* Reste à encaisser + alertes (#270, #57) */
    const alerts = collectAlerts();
    if (stats.unpaid || alerts.length) {
      const block = B.el('<div class="stack-sm"></div>');
      if (stats.unpaid) {
        block.appendChild(B.el('<div class="alert alert-info"><span class="ico">' + ui().icon('wallet', 18) + '</span><div class="grow"><strong>Reste à encaisser : ' + B.money(stats.unpaid) + '</strong>' +
          '<span class="small">Montant payé ≠ revenu contractuel. Suivi manuel des paiements (aucun paiement en ligne).</span></div></div>'));
      }
      alerts.slice(0, 3).forEach(function (a) {
        block.appendChild(alertRow(a));
      });
      wrap.appendChild(block);
    }

    /* Assistant en accès rapide (#193) */
    wrap.appendChild(assistantQuickAsk());

    /* Derniers devis (#21) */
    const quotes = B.quoteService.list({}).slice(0, 4);
    const quotesCard = B.el('<div class="card"></div>');
    quotesCard.innerHTML = '<div class="card-head"><h3>Derniers devis</h3><button class="btn btn-ghost btn-sm" data-all>Voir tout</button></div>' +
      (quotes.length ? '<div class="list" data-list></div>' : '<div class="empty small"><p class="muted">Aucun devis pour le moment.<br>Créez votre premier devis en quelques minutes.</p></div>');
    const ql = B.$('[data-list]', quotesCard);
    quotes.forEach(function (q) {
      const client = B.clientService.get(q.client_id);
      const item = B.el('<button class="list-item"><div class="avatar">' + ui().icon('doc', 18) + '</div>' +
        '<div class="body"><div class="t1">' + h(q.number) + '</div><div class="t2">Client : ' + h(client ? client.name : 'Sans client') + ' · ' + B.dateShort(q.date) + '</div></div>' +
        '<div class="end"><div class="amount mono">' + B.money(q.total) + '</div>' + ui().statusBadge(B.QUOTE_STATUSES, q.status) + '</div></button>');
      item.addEventListener('click', function () { B.router.go('/quotes/' + q.id); });
      ql.appendChild(item);
    });
    B.$('[data-all]', quotesCard).addEventListener('click', function () { B.router.go('/quotes'); });
    wrap.appendChild(quotesCard);

    /* Dernières dépenses (#22) */
    const expenses = B.expenseService.list({}).slice(0, 4);
    const expCard = B.el('<div class="card"></div>');
    expCard.innerHTML = '<div class="card-head"><h3>Dernières dépenses</h3><button class="btn btn-ghost btn-sm" data-all>Voir tout</button></div>' +
      (expenses.length ? '<div class="list" data-list></div>' : '<div class="empty small"><p class="muted">Aucune dépense enregistrée.</p></div>');
    const el2 = B.$('[data-list]', expCard);
    expenses.forEach(function (e) {
      const cat = B.expenseCategory(e.category);
      const item = B.el('<div class="list-item" style="cursor:default"><div class="avatar neutral">' + ui().icon(cat.icon, 18) + '</div>' +
        '<div class="body"><div class="t1">' + h(e.description) + '</div><div class="t2">' + h(cat.label) + ' · ' + B.dateShort(e.date) + (e.project_id ? ' · ' + h(projectName(e.project_id)) : '') + '</div></div>' +
        '<div class="end"><div class="amount mono">' + B.money(e.amount) + '</div></div></div>');
      el2.appendChild(item);
    });
    B.$('[data-all]', expCard).addEventListener('click', function () { B.router.go('/expenses'); });
    wrap.appendChild(expCard);

    /* Chantiers à surveiller (#23) */
    const watch = B.projectService.watchlist(3);
    if (watch.length) {
      const wCard = B.el('<div class="card"></div>');
      wCard.innerHTML = '<div class="card-head"><h3>Chantiers à surveiller</h3><button class="btn btn-ghost btn-sm" data-all>Voir tout</button></div><div class="stack-sm" data-list></div>';
      const wl = B.$('[data-list]', wCard);
      watch.forEach(function (w, i) {
        const s = w.summary;
        const row = B.el('<div class="card card-hover animate-rise" ' + B.stagger(i) + ' style="padding:13px;cursor:pointer">' +
          '<div class="row-between"><strong class="small">' + h(w.project.name) + '</strong>' + budgetBadge(s.status) + '</div>' +
          '<div class="grid" style="grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 8px">' +
            '<div><div class="tiny muted">Budget</div><div class="small strong mono">' + B.money(s.budget_total) + '</div></div>' +
            '<div><div class="tiny muted">Dépenses</div><div class="small strong mono">' + B.money(s.spent) + '</div></div>' +
            '<div><div class="tiny muted">Reste</div><div class="small strong mono ' + (s.budget_remaining < 0 ? 'tone-danger' : 'tone-success') + '">' + B.money(s.budget_remaining) + '</div></div>' +
          '</div>' +
          ui().gauge(s.budget_total, s.spent) +
          '<div class="row-between mt-8"><span class="tiny muted">Avancement ' + w.project.progress + ' %</span><span class="tiny ' + toneClass(s.health.tone) + ' strong">' + h(s.health.label) + '</span></div>' +
          '</div>');
        row.addEventListener('click', function () { B.router.go('/projects/' + w.project.id); });
        wl.appendChild(row);
      });
      B.$('[data-all]', wCard).addEventListener('click', function () { B.router.go('/projects'); });
      wrap.appendChild(wCard);
    }

    /* Analyse automatique simple (#311) */
    const insight = B.analysisService.insight();
    if (insight) {
      wrap.appendChild(B.el('<div class="card" style="border-left:4px solid var(--primary)">' +
        '<div class="row" style="gap:10px;align-items:flex-start">' +
        '<div style="width:34px;height:34px;border-radius:10px;background:var(--primary-soft);color:var(--primary-dark);display:grid;place-items:center">' + ui().icon('sparkles', 18) + '</div>' +
        '<div><div class="strong small">' + h(insight.title) + '</div><div class="tiny muted mt-8">' + h(insight.detail) + '</div></div></div></div>'));
    }

    B.on(wrap, 'click', '[data-new]', function (e, btn) { quickCreate(btn.dataset.new); });
    return wrap;
  }

  function statCard(iconName, label, value, sub, tone) {
    return '<div class="card card-hover stat stat-' + tone + '">' +
      '<div class="row-between"><span class="label">' + ui().icon(iconName, 15) + h(label) + '</span>' +
      '<span class="ico">' + ui().icon(iconName, 18) + '</span></div>' +
      '<div class="value mono">' + h(value) + '</div><div class="sub">' + h(sub) + '</div></div>';
  }
  function budgetBadge(status) {
    const s = B.BUDGET_STATUS[status.id || status] || B.BUDGET_STATUS.normal;
    return ui().badge(s.label, s.tone);
  }
  function toneClass(tone) { return tone === 'danger' ? 'tone-danger' : tone === 'warn' ? 'tone-warn' : tone === 'success' ? 'tone-success' : 'tone-muted'; }
  function alertRow(a) {
    const tone = a.tone === 'danger' ? 'danger' : a.tone === 'warn' ? 'warn' : 'success';
    const el = B.el('<div class="alert alert-' + tone + '" style="cursor:pointer"><span class="ico">' +
      ui().icon(tone === 'success' ? 'checkCircle' : 'alert', 18) + '</span>' +
      '<div class="grow"><strong>' + (tone === 'danger' ? '🔴 ' : tone === 'warn' ? '🟠 ' : '🟢 ') + h(a.level) + '</strong>' +
      '<span class="small">' + h(a.message) + '</span></div>' + ui().icon('chevronRight', 16) + '</div>');
    el.addEventListener('click', function () { if (a.project_id) B.router.go('/projects/' + a.project_id); });
    return el;
  }
  function collectAlerts() {
    const out = [];
    B.projectService.watchlist().forEach(function (w) {
      w.alerts.forEach(function (a) { if (a.tone !== 'success') out.push(a); });
    });
    const rank = { danger: 0, warn: 1, success: 2 };
    return out.sort(function (a, b) { return rank[a.tone] - rank[b.tone]; });
  }
  function projectName(id) { const p = B.projectService.get(id); return p ? p.name : 'Sans chantier'; }
  function netPill() {
    const state = B.network ? B.network.state() : 'online';
    const map = {
      online: ['net-online', 'wifi', 'En ligne'],
      offline: ['net-offline', 'wifiOff', 'Hors connexion'],
      syncing: ['net-syncing', 'sync', 'Synchronisation']
    };
    const m = map[state] || map.online;
    return '<span class="net-pill ' + m[0] + '">' + ui().icon(m[1], 14) + m[2] + '</span>';
  }

  function assistantQuickAsk() {
    const card = B.el('<div class="card" style="background:linear-gradient(135deg,#0F766E 0%,#115E59 100%);color:#fff;border:0">' +
      '<div class="row" style="gap:10px;align-items:flex-start">' +
      '<div style="width:38px;height:38px;border-radius:12px;background:rgba(255,255,255,.16);display:grid;place-items:center">' + ui().icon('sparkles', 20) + '</div>' +
      '<div class="grow"><div class="strong">Demandez à BATIYO</div><div class="small" style="color:rgba(255,255,255,.85)">L’assistant répond avec vos données réelles.</div></div></div>' +
      '<div class="chat-input" style="position:static;margin-top:12px;background:#fff">' +
      '<textarea rows="1" data-ask placeholder="Ex : Combien ai-je dépensé ce mois-ci ?" aria-label="Question à BATIYO"></textarea>' +
      '<button class="btn btn-primary btn-icon" data-send aria-label="Envoyer">' + ui().icon('chevronRight', 18) + '</button></div>' +
      '<div class="row wrap" style="gap:6px;margin-top:10px" data-chips></div></div>');
    const chips = B.$('[data-chips]', card);
    B.assistantService.suggestions().slice(0, 3).forEach(function (s) {
      const c = B.el('<button class="chip" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.25);color:#fff">' + h(s.label) + '</button>');
      c.addEventListener('click', function () { ask(s.text); });
      chips.appendChild(c);
    });
    const ta = B.$('[data-ask]', card);
    function ask(text) {
      if (!text) return;
      B.pendingAsk = text;
      B.router.go('/assistant');
    }
    B.$('[data-send]', card).addEventListener('click', function () { ask(ta.value.trim()); });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(ta.value.trim()); }
    });
    return card;
  }

  /* -------------------------- Création rapide (#132, #191) ---------------- */
  function quickCreate(kind) {
    if (kind === 'quote') B.router.go('/quotes/new');
    else if (kind === 'invoice') B.router.go('/invoices/new');
    else if (kind === 'expense') expenseForm(null, null);
    else if (kind === 'client') C().clientForm(null, null);
  }

  /* ---------------------- Formulaire de dépense (#51, #53, #54) ----------- */
  function expenseForm(expense, preset) {
    const isEdit = !!expense;
    const e = expense || Object.assign({ category: 'materiaux', date: B.today(), project_id: null, supplier_name: '', description: '', receipt: null, notes: '' }, preset || {});
    const form = B.el('<form class="form-grid" novalidate></form>');

    /* Montant d'abord : la dépense rapide doit tenir en 3 champs (#53) */
    form.appendChild(ui().field({ label: 'Montant', name: 'amount', type: 'money', required: true, value: e.amount || '', placeholder: 'Ex : 110 000' }));
    form.appendChild(ui().field({ label: 'Description', name: 'description', required: true, value: e.description || '', placeholder: 'Ex : 20 sacs de ciment' }));
    form.appendChild(ui().field({
      label: 'Catégorie', name: 'category', type: 'select', value: e.category,
      options: B.EXPENSE_CATEGORIES.map(function (c) { return { value: c.id, label: c.label }; })
    }));

    /* Chantier */
    const projField = B.el('<div class="field"><label>Chantier</label><button type="button" class="input row-between" data-proj style="text-align:left"></button>' +
      '<div class="hint" data-hint></div></div>');
    let selectedProject = e.project_id ? B.projectService.get(e.project_id) : null;
    function paintProject() {
      const active = B.projectService.list({ status: 'actifs' });
      B.$('[data-proj]', projField).innerHTML = selectedProject
        ? '<span>' + h(selectedProject.name) + '</span><span class="muted tiny">Changer</span>'
        : '<span class="muted">Aucun chantier (dépense générale)</span><span class="muted tiny">' + active.length + ' actif(s)</span>';
    }
    paintProject();
    B.$('[data-proj]', projField).addEventListener('click', async function () {
      const p = await C().pickProject({});
      if (p !== undefined) { selectedProject = p; paintProject(); paintLine(); }
    });
    form.appendChild(projField);

    /* Poste budgétaire (déduit automatiquement, modifiable) */
    const lineField = ui().field({
      label: 'Poste budgétaire', name: 'budget_line', type: 'select', value: e.budget_line || '',
      options: B.BUDGET_LINES.map(function (l) { return { value: l, label: B.budgetLineLabel(l) }; }),
      hint: 'Déduit automatiquement de la description. Modifiable si besoin.'
    });
    lineField.hidden = true;
    form.appendChild(lineField);
    const toggleLine = B.el('<button type="button" class="btn btn-ghost btn-sm" style="align-self:flex-start">Préciser le poste budgétaire</button>');
    toggleLine.addEventListener('click', function () {
      lineField.hidden = !lineField.hidden;
      toggleLine.textContent = lineField.hidden ? 'Préciser le poste budgétaire' : 'Masquer le poste budgétaire';
    });
    form.appendChild(toggleLine);

    function paintLine() {
      const desc = ui().formValues(form).description || '';
      const cat = ui().formValues(form).category;
      const suggested = B.expenseService.suggestBudgetLine(desc, cat);
      const sel = B.$('[name="budget_line"]', form);
      sel.value = e.budget_line || suggested;
      B.$('[data-hint]', projField).textContent = selectedProject
        ? 'Poste suggéré : ' + B.budgetLineLabel(suggested) + ' — cette dépense modifiera le total réel du chantier.'
        : '';
    }
    B.$('[name="description"]', form).addEventListener('input', B.debounce(paintLine, 250));
    B.$('[name="category"]', form).addEventListener('change', paintLine);
    paintLine();

    const dates = B.el('<div style="display:grid;grid-template-columns:1fr;gap:14px"></div>');
    dates.appendChild(ui().field({ label: 'Date', name: 'date', type: 'date', value: e.date }));
    dates.appendChild(ui().field({ label: 'Fournisseur (facultatif)', name: 'supplier_name', value: e.supplier_name || '', placeholder: 'Ex : Quincaillerie Kodjo', list: 'suppliers-list' }));
    form.appendChild(dates);
    /* Suggestions de fournisseurs déjà utilisés (#200, #201) */
    const dl = B.el('<datalist id="suppliers-list"></datalist>');
    dl.innerHTML = B.supplierService.suggestions().map(function (s) { return '<option value="' + h(s) + '"></option>'; }).join('');
    form.appendChild(dl);

    form.appendChild(ui().field({ label: 'Notes (facultatif)', name: 'notes', type: 'textarea', value: e.notes || '' }));

    /* Justificatif photo (#54, #218) */
    const photoBox = B.el('<div><div class="strong small mb-8">Justificatif</div><div data-photo></div>' +
      '<div class="banner banner-info mt-8 tiny">' + ui().icon('info', 15) + '<span>La lecture automatique des reçus n’est pas encore disponible : la photo est conservée comme justificatif.</span></div></div>');
    let receipt = e.receipt || null;
    function paintPhoto() {
      const host = B.$('[data-photo]', photoBox);
      host.innerHTML = '';
      if (receipt) {
        host.appendChild(ui().imagePreview(receipt, {
          title: 'Justificatif', subtitle: 'Enregistré avec cette dépense.',
          actions: [
            { label: 'Remplacer', onClick: function () { pickPhoto(); } },
            { label: 'Supprimer', tone: 'danger', onClick: function () { receipt = null; paintPhoto(); } }
          ]
        }));
      } else {
        host.appendChild(ui().imagePicker({ title: 'Ajouter une photo', hint: 'Prendre une photo du reçu ou choisir dans la galerie', onPick: function (url) { receipt = url; paintPhoto(); } }));
      }
    }
    function pickPhoto() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
      input.addEventListener('change', async function () {
        if (input.files[0]) { receipt = await ui().readImage(input.files[0], 1100); paintPhoto(); }
      });
      input.click();
    }
    paintPhoto();
    form.appendChild(photoBox);

    const m = ui().modal({ title: isEdit ? 'Modifier la dépense' : 'Ajouter une dépense', body: form, size: 'wide' });
    const save = B.el('<button class="btn btn-primary">' + (isEdit ? 'Enregistrer' : 'Enregistrer la dépense') + '</button>');
    const cancel = B.el('<button class="btn btn-ghost" data-close>Annuler</button>');
    const again = B.el('<button class="btn btn-soft">Enregistrer et ajouter une autre</button>');
    if (!isEdit) m.foot.appendChild(again);
    m.foot.appendChild(cancel); m.foot.appendChild(save);

    function submit(keepOpen) {
      const v = ui().formValues(form);
      if (!v.amount) { ui().showErrors(form, { amount: 'Indiquez le montant.' }); return; }
      if (v.amount <= 0) { ui().showErrors(form, { amount: 'Le montant doit être supérieur à 0.' }); return; }
      if (!v.description) { ui().showErrors(form, { description: 'Indiquez une description.' }); return; }
      const payload = Object.assign({}, v, { project_id: selectedProject ? selectedProject.id : null, receipt: receipt });
      const row = isEdit ? B.expenseService.update(expense.id, payload) : B.expenseService.create(payload);
      ui().toast(isEdit ? 'Dépense mise à jour.' : 'Dépense enregistrée.', 'success');
      if (keepOpen) {
        B.$('[name="amount"]', form).value = '';
        B.$('[name="amount"]', form).dataset.raw = '';
        B.$('[name="description"]', form).value = '';
        receipt = null; paintPhoto();
        B.router.refresh();
      } else { m.close(); B.router.refresh(); }
      return row;
    }
    again.addEventListener('click', function () { submit(true); });
    save.addEventListener('click', function () { submit(false); });
    ui().bindMoneyInputs(form);
    return m;
  }

  /* --------------------------------- Analyse ------------------------------ */
  function analysis() {
    const state = analysis.state || (analysis.state = { period: 'year' });
    const wrap = B.el('<div class="stack"></div>');
    const overview = B.analysisService.overview(state.period);

    wrap.appendChild(B.el('<div class="row-between wrap"><div><h2>Analyse</h2><div class="small muted">' +
      h(overview.range.label) + ' · comparaison prévision / réel</div></div>' +
      '<button class="btn btn-ghost btn-sm" data-export>' + ui().icon('download', 16) + ' Exporter le rapport</button></div>'));
    wrap.appendChild(C().periodChips(state.period, function (p) {
      state.period = p;
      B.router.refresh();
    }));

    const kpis = B.el('<div class="grid grid-2 grid-4-md"></div>');
    kpis.innerHTML =
      statCard('trending', 'Chiffre d’affaires', B.money(overview.revenue), overview.quotes_count + ' devis · ' + overview.invoices_count + ' factures', 'primary') +
      statCard('coins', 'Dépenses', B.money(overview.spent), overview.expenses.length + ' dépense(s) sur la période', 'warn') +
      statCard('chart', 'Résultat provisoire', B.money(overview.margin), overview.margin_rate + ' % du chiffre d’affaires', overview.margin >= 0 ? 'success' : 'danger') +
      statCard('hardhat', 'Chantiers actifs', String(overview.projects_active), B.money(overview.contracts) + ' de contrats au total', 'info');
    wrap.appendChild(kpis);

    /* Dépenses par catégorie (#155) */
    const catCard = B.el('<div class="card"></div>');
    catCard.innerHTML = '<div class="card-head"><h3>Dépenses par catégorie</h3><span class="tiny muted">' + h(overview.range.label) + '</span></div>';
    if (overview.by_category.length) {
      catCard.appendChild(B.el(ui().donut(overview.by_category.map(function (c) { return { label: c.label, value: c.value }; }), {
        centerLabel: 'Total', centerValue: B.moneyShort(overview.spent)
      })));
    } else {
      catCard.appendChild(B.el('<p class="muted small">Aucune dépense enregistrée sur cette période.</p>'));
    }
    wrap.appendChild(catCard);

    /* Évolution */
    const seriesCard = B.el('<div class="card"></div>');
    seriesCard.innerHTML = '<div class="card-head"><h3>Dépenses des 6 derniers mois</h3><span class="tiny muted">par mois</span></div>' +
      ui().bars(overview.expense_series, { accent: true }) +
      '<div class="row-between tiny muted mt-8"><span>Total période affichée : ' + B.money(overview.expense_series.reduce(function (s, x) { return s + x.value; }, 0)) + '</span><span>Chiffre d’affaires : ' + B.money(overview.revenue_series.reduce(function (s, x) { return s + x.value; }, 0)) + '</span></div>';
    wrap.appendChild(seriesCard);

    /* Marge par chantier */
    const projCard = B.el('<div class="card"></div>');
    projCard.innerHTML = '<div class="card-head"><h3>Marge par chantier</h3></div><div class="stack-sm" data-list></div>';
    const pl = B.$('[data-list]', projCard);
    const rows = B.projectService.watchlist();
    if (!rows.length) pl.appendChild(B.el('<p class="muted small">Aucun chantier actif.</p>'));
    rows.forEach(function (w) {
      const s = w.summary;
      const row = B.el('<div class="card card-hover" style="padding:12px;cursor:pointer">' +
        '<div class="row-between"><strong class="small">' + h(w.project.name) + '</strong>' + ui().badge(s.health.label, s.health.tone) + '</div>' +
        '<div class="grid mt-8" style="grid-template-columns:repeat(3,1fr);gap:8px">' +
        '<div><div class="tiny muted">Contrat</div><div class="small strong mono">' + B.money(s.contract) + '</div></div>' +
        '<div><div class="tiny muted">Budget</div><div class="small strong mono">' + B.money(s.budget_total) + '</div></div>' +
        '<div><div class="tiny muted">Résultat provisoire</div><div class="small strong mono ' + (s.actual_result >= 0 ? 'tone-success' : 'tone-danger') + '">' + B.money(s.actual_result) + '</div></div>' +
        '</div>' + ui().progress(w.project.progress) + '<div class="tiny muted mt-8">Avancement ' + w.project.progress + ' %</div></div>');
      row.addEventListener('click', function () { B.router.go('/projects/' + w.project.id); });
      pl.appendChild(row);
    });
    wrap.appendChild(projCard);

    /* Statuts des devis + top clients */
    const two = B.el('<div class="grid grid-2 grid-4-md" style="grid-template-columns:repeat(1,1fr)"></div>');
    const stCard = B.el('<div class="card"></div>');
    stCard.innerHTML = '<div class="card-head"><h3>Devis par statut</h3></div>' +
      (overview.quote_statuses.length
        ? ui().donut(overview.quote_statuses.map(function (s) { return { label: s.label, value: s.value }; }), { format: function (v) { return String(v); }, centerLabel: 'Devis', centerValue: String(overview.quote_statuses.reduce(function (a, s) { return a + s.value; }, 0)) })
        : '<p class="muted small">Aucun devis.</p>');
    const clCard = B.el('<div class="card"></div>');
    const top = B.clientService.list().map(function (c) { return { c: c, d: B.clientService.detail(c.id) }; })
      .sort(function (a, b) { return b.d.stats.total_invoiced - a.d.stats.total_invoiced; }).slice(0, 5);
    clCard.innerHTML = '<div class="card-head"><h3>Meilleurs clients</h3></div>' +
      (top.length ? top.map(function (t) {
        return '<div class="kv"><span class="k">' + h(t.c.name) + '</span><span class="v mono">' + B.money(t.d.stats.total_invoiced) + '</span></div>';
      }).join('') : '<p class="muted small">Aucun client.</p>');
    two.appendChild(stCard); two.appendChild(clCard);
    wrap.appendChild(two);

    wrap.appendChild(B.el('<div class="banner banner-info">' + ui().icon('info', 18) +
      '<span>Analyse basée sur ' + overview.expenses.length + ' dépense(s) et ' + (overview.quotes_count + overview.invoices_count) + ' document(s) enregistrés sur la période. ' +
      'Résultat provisoire : ce n’est pas un bénéfice comptable définitif.</span></div>'));

    const exportBtn = B.$('[data-export]', wrap);
    exportBtn.addEventListener('click', function () {
      ui().toast('Export du rapport en PDF ou Excel disponible prochainement. Vous pouvez déjà exporter la liste des dépenses en CSV.', 'info', {
        actionLabel: 'Exporter en CSV', onAction: exportExpensesCsv
      });
    });
    return wrap;
  }

  function exportExpensesCsv() {
    const rows = B.expenseService.list({}).map(function (e) {
      const p = e.project_id ? B.projectService.get(e.project_id) : null;
      return [e.number, e.date, B.expenseCategory(e.category).label, e.description, p ? p.name : '', e.supplier_name || '', e.amount];
    });
    B.pdf.csv('batiyo-depenses.csv', rows, ['Numéro', 'Date', 'Catégorie', 'Description', 'Chantier', 'Fournisseur', 'Montant']);
    ui().toast('Fichier CSV généré.', 'success');
  }

  /* ----------------------------- Notifications (#82) ---------------------- */
  function notificationsSheet() {
    const m = ui().sheet({ title: 'Notifications', size: 'wide' });
    function paint() {
      m.body.innerHTML = '';
      const rows = B.notificationService.list();
      if (!rows.length) {
        m.body.appendChild(ui().emptyState({ icon: 'bell', title: 'Aucune notification', text: 'Vous serez prévenu ici : devis accepté, budget dépassé, chantier à surveiller.' }));
        return;
      }
      const head = B.el('<div class="row-between mb-12"><span class="tiny muted">' + B.notificationService.unread().length + ' non lue(s)</span>' +
        '<button class="btn btn-ghost btn-sm" data-read>Tout marquer comme lu</button></div>');
      B.$('[data-read]', head).addEventListener('click', function () {
        B.notificationService.markAllRead();
        ui().toast('Toutes les notifications sont lues.', 'success');
        paint();
        B.router.refresh();
      });
      m.body.appendChild(head);
      rows.forEach(function (n) {
        const tone = n.type === 'budget' ? 'danger' : n.type === 'document' ? 'success' : n.type === 'project' ? 'warn' : 'info';
        const item = B.el('<div class="notif-item' + (n.read ? '' : ' unread') + '">' +
          '<div class="ico" style="background:var(--' + (tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : tone === 'warn' ? 'warn' : 'info') + '-soft);color:var(--' + tone + ')">' + ui().icon('bell', 17) + '</div>' +
          '<div class="grow"><div class="strong small">' + h(n.title) + '</div><div class="small muted">' + h(n.message) + '</div>' +
          '<div class="tiny muted mt-8">' + B.relative(n.created_at) + '</div></div></div>');
        item.addEventListener('click', function () {
          B.notificationService.markRead(n.id);
          if (n.project_id) { m.close(); B.router.go('/projects/' + n.project_id); }
          else paint();
        });
        m.body.appendChild(item);
      });
    }
    paint();
    return m;
  }

  B.screens = B.screens || {};
  Object.assign(B.screens, {
    dashboard: dashboard, analysis: analysis, expenseForm: expenseForm,
    notificationsSheet: notificationsSheet, quickCreate: quickCreate,
    collectAlerts: collectAlerts, alertRow: alertRow, statCard: statCard,
    netPill: netPill, budgetBadge: budgetBadge, exportExpensesCsv: exportExpensesCsv
  });
})(globalThis.BATIYO = globalThis.BATIYO || {});
