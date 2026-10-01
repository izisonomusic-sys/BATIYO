/* =========================================================================
   BATIYO — 17. DEVIS ET FACTURES
   Liste, création guidée, modification, duplication, conversion, PDF, partage
   (#24 → #47, #106, #107, #264, #265).
   ========================================================================= */
(function (B) {
  'use strict';
  const h = B.escape;
  const ui = function () { return B.ui; };
  const C = function () { return B.components; };

  /* =======================================================================
     DEVIS — LISTE (#24, #145)
     ======================================================================= */
  function quotesList(ctx) {
    const state = quotesList.state || (quotesList.state = { status: 'all', search: '' });
    const wrap = B.el('<div class="stack"></div>');
    const rows = B.quoteService.list({ status: state.status, search: state.search });

    wrap.appendChild(B.el('<div class="row-between wrap"><div><h2>Mes devis</h2><div class="small muted">' +
      rows.length + ' devis' + (state.status !== 'all' ? ' · ' + h(B.status(B.QUOTE_STATUSES, state.status).label) : '') + '</div></div>' +
      '<button class="btn btn-primary" data-new>' + ui().icon('plus', 18) + ' Nouveau devis</button></div>'));

    const search = B.el('<div class="search">' + ui().icon('search', 18) + '<input placeholder="Rechercher un devis, un client…" value="' + h(state.search) + '" aria-label="Rechercher"></div>');
    wrap.appendChild(search);
    B.$('input', search).addEventListener('input', B.debounce(function () {
      state.search = this.value;
      B.router.refresh();
    }, 220));

    const chips = B.el('<div class="chip-scroll"></div>');
    const list = [['all', 'Tous']].concat(B.QUOTE_STATUSES.map(function (s) { return [s.id, s.label]; }));
    list.forEach(function (s) {
      const c = B.el('<button class="chip' + (state.status === s[0] ? ' active' : '') + '">' + h(s[1]) + '</button>');
      c.addEventListener('click', function () { state.status = s[0]; B.router.refresh(); });
      chips.appendChild(c);
    });
    wrap.appendChild(chips);

    /* Totaux rapides */
    const total = rows.reduce(function (s, q) { return s + q.total; }, 0);
    const accepted = rows.filter(function (q) { return q.status === 'accepte' || q.status === 'converti'; }).reduce(function (s, q) { return s + q.total; }, 0);
    wrap.appendChild(B.el('<div class="grid grid-2" style="gap:10px">' +
      '<div class="card" style="padding:12px"><div class="tiny muted">Montant filtré</div><div class="strong mono">' + B.money(total) + '</div></div>' +
      '<div class="card" style="padding:12px"><div class="tiny muted">Acceptés / convertis</div><div class="strong mono tone-success">' + B.money(accepted) + '</div></div></div>'));

    if (!rows.length) {
      wrap.appendChild(ui().emptyState({
        icon: 'doc', title: 'Aucun devis pour le moment',
        text: state.search ? 'Aucun résultat pour « ' + state.search + ' ».' : 'Créez votre premier devis en quelques minutes.',
        actionLabel: 'Créer un devis', onAction: function () { B.router.go('/quotes/new'); }
      }));
      B.$('[data-new]', wrap).addEventListener('click', function () { B.router.go('/quotes/new'); });
      return wrap;
    }

    /* Mobile : cartes — Desktop : tableau (#145) */
    const mobile = B.el('<div class="stack-sm only-sm"></div>');
    rows.forEach(function (q) {
      const client = B.clientService.get(q.client_id);
      const card = B.el('<div class="card card-hover" style="padding:14px">' +
        '<div class="row-between"><div><div class="strong">' + h(q.number) + '</div>' +
        '<div class="tiny muted">' + h(client ? client.name : 'Sans client') + ' · ' + B.dateShort(q.date) + '</div></div>' +
        '<div class="right"><div class="strong mono">' + B.money(q.total) + '</div>' + ui().statusBadge(B.QUOTE_STATUSES, q.status) + '</div></div>' +
        '<div class="row-between mt-12"><button class="btn btn-soft btn-sm" data-open>Voir</button><span data-menu></span></div></div>');
      B.$('[data-open]', card).addEventListener('click', function () { B.router.go('/quotes/' + q.id); });
      B.$('[data-menu]', card).appendChild(quoteMenu(q));
      mobile.appendChild(card);
    });
    wrap.appendChild(mobile);

    const desktop = B.el('<div class="card hide-sm"><div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Numéro</th><th>Client</th><th>Date</th><th class="num">Montant</th><th>Statut</th><th></th></tr></thead><tbody></tbody></table></div></div>');
    const tbody = B.$('tbody', desktop);
    rows.forEach(function (q) {
      const client = B.clientService.get(q.client_id);
      const tr = B.el('<tr><td><a href="#/quotes/' + q.id + '" class="strong">' + h(q.number) + '</a></td>' +
        '<td>' + h(client ? client.name : '—') + '</td><td>' + B.dateShort(q.date) + '</td>' +
        '<td class="num strong">' + B.money(q.total) + '</td><td>' + ui().statusBadge(B.QUOTE_STATUSES, q.status) + '</td>' +
        '<td class="actions"></td></tr>');
      B.$('td.actions', tr).appendChild(quoteMenu(q));
      tbody.appendChild(tr);
    });
    wrap.appendChild(desktop);

    B.$('[data-new]', wrap).addEventListener('click', function () { B.router.go('/quotes/new'); });
    return wrap;
  }

  function quoteMenu(q) {
    return ui().actionsMenu([
      { label: 'Voir le devis', icon: 'doc', onClick: function () { B.router.go('/quotes/' + q.id); } },
      { label: 'Modifier', icon: 'edit', onClick: function () { B.router.go('/quotes/' + q.id + '/edit'); } },
      { label: 'Dupliquer', icon: 'copy', onClick: function () { duplicateQuote(q); } },
      { label: 'Télécharger le PDF', icon: 'download', onClick: function () { B.pdf.openPreview(B.pdf.quoteHTML(q), { filename: q.number }); } },
      { label: 'Partager', icon: 'share', onClick: function () { B.components.shareDialog('quote', q); } },
      {
        label: 'Convertir en facture', icon: 'invoice', hint: 'Crée une facture à partir de ce devis',
        hidden: q.status === 'converti' || q.status === 'refuse',
        onClick: function () { convertQuote(q); }
      },
      {
        label: 'Créer le chantier', icon: 'hardhat', hidden: !!q.project_id || q.status === 'brouillon',
        onClick: function () { createProjectFromQuote(q); }
      },
      { label: 'Supprimer', icon: 'trash', tone: 'danger', onClick: function () { deleteQuote(q); } }
    ]);
  }

  function duplicateQuote(q) {
    const copy = B.quoteService.duplicate(q.id);
    ui().toast('Devis ' + copy.number + ' créé à partir de ' + q.number + '.', 'success');
    B.router.go('/quotes/' + copy.id + '/edit');
  }
  function deleteQuote(q) {
    C().confirmDelete('le devis ' + q.number, function () {
      B.quoteService.remove(q.id);
      ui().toast('Devis supprimé.', 'success');
      B.router.refresh();
    });
  }
  function convertQuote(q) {
    ui().confirm({
      title: 'Convertir ' + q.number + ' en facture ?',
      message: 'BATIYO va copier le client, le chantier, les lignes, la remise et les totaux dans une nouvelle facture. Le devis restera inchangé et sera marqué « Converti en facture ».',
      confirmLabel: 'Convertir'
    }).then(function (ok) {
      if (!ok) return;
      const inv = B.quoteService.convertToInvoice(q.id);
      ui().toast('Facture créée à partir du devis.', 'success');
      B.router.go('/invoices/' + inv.id);
    });
  }
  function createProjectFromQuote(q) {
    C().projectForm(null, function (p) {
      ui().toast('Chantier « ' + p.name + ' » créé. Budget prévisionnel ' + B.money(B.calc.calculateBudgetTotal(p.budget)) + '.', 'success');
      B.router.go('/projects/' + p.id);
    }, {
      client_id: q.client_id, name: 'Chantier ' + (B.clientService.get(q.client_id) ? B.clientService.get(q.client_id).name : q.number),
      description: 'Travaux issus du devis ' + q.number, quote_total: q.total,
      budget: B.calc.budgetFromQuote(q, q.lines, B.session.profession(), B.session.settings())
    });
  }

  /* =======================================================================
     DEVIS — CRÉATION / MODIFICATION (#27 → #38, #42)
     ======================================================================= */
  function quoteEditor(ctx) {
    const existing = ctx.params.id ? B.quoteService.get(ctx.params.id) : null;
    if (ctx.params.id && !existing) return notFound('Ce devis est introuvable.');

    /* L'éditeur est découpé en étapes (client, chantier, éléments, récapitulatif)
       et chaque changement d'étape re-rend l'écran : l'avancement de la saisie
       est donc conservé sur la fonction elle-même, comme le font les autres
       écrans. Le brouillon en cours est oublié après enregistrement ou retour
       à la liste des devis. */
    const cacheKey = existing ? 'edit:' + existing.id : 'new';
    if (!quoteEditor.state || quoteEditor.state.key !== cacheKey || quoteEditor.state.close) {
      quoteEditor.state = {
        key: cacheKey,
        doc: existing
          ? Object.assign({}, existing, { lines: (existing.lines || []).map(function (l) { return Object.assign({}, l); }), discount: Object.assign({}, existing.discount), deposit: existing.deposit })
          : Object.assign(B.quoteService.empty(), { lines: [] }),
        step: existing ? (ctx.query.step ? Number(ctx.query.step) : 3) : 0,
        dirty: false, saving: false, lastSaved: existing ? existing.updated_at : null, started: !!existing
      };
    }
    const state = quoteEditor.state;

    const wrap = B.el('<div class="stack"></div>');
    if (state.step === 0) { renderStart(); return wrap; }

    /* ------------------------------- Structure -------------------------- */
    const head = B.el('<div class="row-between wrap"></div>');
    const saveState = B.el('<span class="tiny muted" data-save></span>');
    head.innerHTML = '<div class="row" style="gap:10px"><button class="btn btn-ghost btn-sm" data-back>' + ui().icon('arrowLeft', 16) + ' Mes devis</button>' +
      '<div><h2 style="font-size:18px">' + (existing ? 'Devis ' + h(existing.number) : 'Nouveau devis') + '</h2>' +
      '<div class="tiny muted">' + h(B.session.profession().name) + ' · ' + h(B.session.business().name) + '</div></div></div>';
    head.appendChild(saveState);
    wrap.appendChild(head);

    const stepper = B.el('<div class="stepper"></div>');
    const STEPS = [['client', 'Client'], ['project', 'Chantier'], ['items', 'Éléments'], ['summary', 'Récapitulatif']];
    STEPS.forEach(function (s, i) {
      const b = B.el('<button class="st' + (state.step === i + 1 ? ' active' : '') + (state.step > i + 1 ? ' done' : '') + '"><span class="n">' + (i + 1) + '</span>' + h(s[1]) + '</button>');
      b.addEventListener('click', function () { state.step = i + 1; B.router.refresh(); });
      stepper.appendChild(b);
    });
    wrap.appendChild(stepper);

    const body = B.el('<div class="stack"></div>');
    wrap.appendChild(body);

    /* -------------------------- Autosave brouillon (#109) ---------------- */
    const autosave = B.debounce(function () { save(true); }, 1200);
    function markDirty() {
      state.dirty = true;
      saveState.innerHTML = ui().icon('clock', 13) + ' Modification en cours…';
      autosave();
    }
    function save(silent) {
      if (!state.doc.client_id && !state.doc.lines.length) return null;   /* rien à sauvegarder */
      const payload = Object.assign({}, state.doc, { id: existing ? state.doc.id : (state.doc.id || null) });
      const saved = B.quoteService.save(payload, { silent: true });
      state.doc.id = saved.id;
      state.doc.number = saved.number;
      state.dirty = false;
      state.lastSaved = saved.updated_at;
      if (!silent) B.notificationService.add('document', 'Devis enregistré', 'Devis ' + saved.number + ' enregistré.');
      saveState.innerHTML = ui().icon('checkCircle', 13) + ' Enregistré · ' + B.relative(saved.updated_at);
      return saved;
    }

    /* ------------------------------- Étape 0 ----------------------------- */
    function renderStart() {
      const prof = B.session.profession();
      const templates = B.professionService.templates();
      const body0 = B.el('<div class="stack"></div>');
      body0.appendChild(B.el('<div class="card card-pad-lg"><h3>Par où commencer ?</h3>' +
        '<p class="muted small mt-8">BATIYO charge automatiquement le catalogue <strong>' + h(prof.name) + '</strong> : vous n’avez pas à préciser votre métier.</p></div>'));
      const tplCard = B.el('<div class="card"><div class="card-head"><h3>Modèles de devis ' + h(prof.name.toLowerCase()) + '</h3></div><div class="stack-sm" data-list></div></div>');
      const list = B.$('[data-list]', tplCard);
      templates.forEach(function (t) {
        const row = B.el('<button class="list-item"><div class="avatar">' + ui().icon('doc', 18) + '</div>' +
          '<div class="body"><div class="t1">' + h(t.name) + '</div><div class="t2">' + h(t.hint) + '</div></div>' +
          '<div class="end">' + ui().icon('chevronRight', 18) + '</div></button>');
        row.addEventListener('click', function () {
          const draft = B.quoteService.fromTemplate(t.id);
          Object.assign(state.doc, draft);
          state.step = 1;
          B.router.refresh();
        });
        list.appendChild(row);
      });
      body0.appendChild(tplCard);

      const options = B.el('<div class="grid grid-2" style="gap:10px"></div>');
      const blank = B.el('<button class="card card-hover center" style="padding:18px"><div class="il" style="width:44px;height:44px;margin:0 auto 8px;border-radius:14px;background:var(--primary-soft);color:var(--primary-dark);display:grid;place-items:center">' + ui().icon('plus', 22) + '</div><div class="strong small">Devis vide</div><div class="tiny muted">Je choisis moi-même mes éléments</div></button>');
      blank.addEventListener('click', function () { state.step = 1; B.router.refresh(); });
      options.appendChild(blank);
      const dup = B.el('<button class="card card-hover center" style="padding:18px"><div class="il" style="width:44px;height:44px;margin:0 auto 8px;border-radius:14px;background:#F1F5F9;color:#334155;display:grid;place-items:center">' + ui().icon('copy', 22) + '</div><div class="strong small">Partir d’un ancien devis</div><div class="tiny muted">Dupliquer un devis existant</div></button>');
      dup.addEventListener('click', function () {
        const rows = B.quoteService.list({}).slice(0, 20);
        ui().sheetList('Choisir un devis à dupliquer', rows.map(function (q) {
          return {
            icon: 'doc', label: q.number, subtitle: B.money(q.total) + ' · ' + B.dateShort(q.date),
            onClick: function () { duplicateQuote(q); }
          };
        }));
      });
      options.appendChild(dup);
      body0.appendChild(options);
      wrap.innerHTML = '';
      wrap.appendChild(B.el('<button class="btn btn-ghost btn-sm" data-back>' + ui().icon('arrowLeft', 16) + ' Mes devis</button>'));
      wrap.appendChild(body0);
      B.$('[data-back]', wrap).addEventListener('click', function () { B.router.go('/quotes'); });
    }

    /* ------------------------------ Étape 1 : client --------------------- */
    function renderClient() {
      const card = B.el('<div class="card card-pad-lg"></div>');
      const client = state.doc.client_id ? B.clientService.get(state.doc.client_id) : null;
      card.innerHTML = '<h3>Pour quel client ?</h3><p class="muted small mt-8 mb-16">Choisissez un client existant ou créez-en un nouveau.</p>';
      if (client) {
        const box = B.el('<div class="card" style="padding:14px"><div class="row-between"><div class="row" style="gap:12px">' +
          '<div class="avatar-initials">' + h(B.initials(client.name)) + '</div>' +
          '<div><div class="strong">' + h(client.name) + '</div><div class="tiny muted">' + h([client.phone, client.address].filter(Boolean).join(' · ') || 'Aucune coordonnée') + '</div></div></div>' +
          '<button class="btn btn-ghost btn-sm" data-change>Changer</button></div></div>');
        B.$('[data-change]', box).addEventListener('click', async function () {
          const c = await C().pickClient();
          if (c) { state.doc.client_id = c.id; markDirty(); B.router.refresh(); }
        });
        card.appendChild(box);
      } else {
        const row = B.el('<div class="btn-row"></div>');
        const pick = B.el('<button class="btn btn-primary">' + ui().icon('users', 17) + ' Choisir un client</button>');
        pick.addEventListener('click', async function () {
          const c = await C().pickClient();
          if (c) { state.doc.client_id = c.id; markDirty(); B.router.refresh(); }
        });
        const create = B.el('<button class="btn btn-ghost">' + ui().icon('plus', 17) + ' Nouveau client</button>');
        create.addEventListener('click', function () {
          C().clientForm(null, function (c) { state.doc.client_id = c.id; markDirty(); B.router.refresh(); });
        });
        row.appendChild(pick); row.appendChild(create);
        card.appendChild(row);
        card.appendChild(B.el('<div class="help-text mt-12">Un devis peut rester en brouillon sans client (#182), mais il faut un client pour l’envoyer ou le convertir.</div>'));
      }
      body.appendChild(card);
      navButtons(null, 2, function () {
        if (!state.doc.client_id) { ui().toast('Choisissez un client pour continuer.', 'error'); return false; }
        return true;
      });
    }

    /* ----------------------------- Étape 2 : chantier -------------------- */
    function renderProject() {
      const card = B.el('<div class="card card-pad-lg"></div>');
      const project = state.doc.project_id ? B.projectService.get(state.doc.project_id) : null;
      card.innerHTML = '<h3>Associer un chantier ?</h3><p class="muted small mt-8 mb-16">Optionnel : le devis pourra servir à créer ou alimenter un chantier, avec son budget prévisionnel.</p>';
      if (project) {
        const box = B.el('<div class="card" style="padding:14px"><div class="row-between"><div><div class="strong">' + h(project.name) + '</div>' +
          '<div class="tiny muted">' + B.money(project.quote_total) + ' · budget ' + B.money(B.calc.calculateBudgetTotal(project.budget)) + '</div></div>' +
          '<button class="btn btn-ghost btn-sm" data-change>Changer</button></div></div>');
        B.$('[data-change]', box).addEventListener('click', async function () {
          const p = await C().pickProject({ client_id: state.doc.client_id });
          if (p !== undefined) { state.doc.project_id = p ? p.id : null; markDirty(); B.router.refresh(); }
        });
        card.appendChild(box);
      } else {
        const row = B.el('<div class="btn-row"></div>');
        const pick = B.el('<button class="btn btn-ghost">' + ui().icon('hardhat', 17) + ' Choisir un chantier</button>');
        pick.addEventListener('click', async function () {
          const p = await C().pickProject({ client_id: state.doc.client_id });
          if (p) { state.doc.project_id = p.id; markDirty(); B.router.refresh(); }
        });
        const create = B.el('<button class="btn btn-ghost">' + ui().icon('plus', 17) + ' Créer un chantier</button>');
        create.addEventListener('click', function () {
          const client = B.clientService.get(state.doc.client_id);
          C().projectForm(null, function (p) { state.doc.project_id = p.id; markDirty(); B.router.refresh(); }, {
            client_id: state.doc.client_id,
            name: client ? 'Chantier ' + client.name : '',
            quote_total: B.calc.calculateDocumentTotals(state.doc, B.session.settings()).total,
            budget: B.calc.budgetFromQuote({ total: B.calc.calculateDocumentTotals(state.doc, B.session.settings()).total, profession_id: B.session.professionId() }, state.doc.lines, B.session.profession(), B.session.settings())
          });
        });
        row.appendChild(pick); row.appendChild(create);
        card.appendChild(row);
      }
      const skip = B.el('<button class="btn btn-ghost btn-sm" style="align-self:flex-start">Passer cette étape</button>');
      skip.addEventListener('click', function () { state.step = 3; B.router.refresh(); });
      card.appendChild(B.el('<div class="mt-12"></div>'));
      card.appendChild(skip);
      body.appendChild(card);
      navButtons(1, 3);
    }

    /* ----------------------------- Étape 3 : éléments -------------------- */
    function renderItems() {
      const linesCard = B.el('<div class="card"></div>');
      linesCard.innerHTML = '<div class="card-head"><h3>Ajouter des éléments</h3>' +
        '<span class="tiny muted">Catalogue ' + h(B.session.profession().name) + '</span></div>' +
        '<div class="stack-sm" data-lines></div>';
      const list = B.$('[data-lines]', linesCard);
      if (!state.doc.lines.length) {
        list.appendChild(ui().emptyState({ icon: 'box', title: 'Aucun élément', text: 'Ajoutez vos matériaux et services : BATIYO calcule chaque ligne automatiquement.' }));
      }
      state.doc.lines.forEach(function (line) {
        list.appendChild(C().lineEditor(line, { onChange: function () { recalc(); markDirty(); } }));
      });
      const actions = B.el('<div class="btn-row mt-12"></div>');
      const addCatalog = B.el('<button class="btn btn-primary">' + ui().icon('plus', 17) + ' Ajouter un élément</button>');
      addCatalog.addEventListener('click', async function () {
        const picked = await C().catalogPicker();
        if (!picked) return;
        state.doc.lines.push({
          id: B.uid('li'), catalog_item_id: picked.item.id, description: picked.item.name,
          quantity: 1, unit: picked.unit, unit_price: picked.price
        });
        B.catalogService.rememberPrice(picked.item.id, picked.price);
        markDirty(); B.router.refresh();
      });
      const addFree = B.el('<button class="btn btn-ghost">' + ui().icon('edit', 17) + ' Ligne libre</button>');
      addFree.addEventListener('click', function () {
        const f = B.el('<form class="form-grid"><div class="field"><label for="free-desc">Description</label><input class="input" id="free-desc" placeholder="Ex : Déplacement du matériel"></div></form>');
        const m = ui().modal({ title: 'Ajouter une ligne libre', body: f });
        const ok = B.el('<button class="btn btn-primary">Ajouter</button>');
        ok.addEventListener('click', function () {
          const desc = B.$('input', f).value.trim();
          if (!desc) return;
          state.doc.lines.push({ id: B.uid('li'), catalog_item_id: null, description: desc, quantity: 1, unit: 'unite', unit_price: 0 });
          m.close(); markDirty(); B.router.refresh();
        });
        m.foot.appendChild(ok);
      });
      actions.appendChild(addCatalog); actions.appendChild(addFree);
      linesCard.appendChild(actions);
      body.appendChild(linesCard);

      /* Recherche rapide dans le catalogue (#33, #76) */
      const quick = B.el('<div class="card"><div class="card-head"><h3>Ajout rapide</h3><span class="tiny muted">Favoris en premier</span></div>' +
        '<div class="stack-sm" data-quick></div></div>');
      const ql = B.$('[data-quick]', quick);
      const search = B.el('<div class="search">' + ui().icon('search', 18) + '<input placeholder="Rechercher : cim, sable, fer…" aria-label="Recherche rapide"></div>');
      quick.insertBefore(search, quick.children[1]);
      function paintQuick() {
        const term = B.$('input', search).value;
        const items = (term ? B.catalogService.search(term) : B.catalogService.favorites().concat(B.catalogService.mostUsed(6))).slice(0, 8);
        ql.innerHTML = '';
        const seen = {};
        items.forEach(function (it) {
          if (seen[it.id]) return;
          seen[it.id] = 1;
          const sugg = B.catalogService.suggestedPrice(it.id);
          const row = B.el('<button class="picker-item" style="padding:9px 11px"><div class="grow"><div class="small strong">' + h(it.name) + '</div>' +
            '<div class="tiny muted">' + h(B.unitLabel(it.unit)) + (sugg.source === 'last' ? ' · <span class="price-flag">Prix habituel</span>' : '') + '</div></div>' +
            '<div class="price strong small mono">' + B.money(sugg.price) + '</div>' + ui().icon('plus', 16) + '</button>');
          row.addEventListener('click', function () {
            state.doc.lines.push({ id: B.uid('li'), catalog_item_id: it.id, description: it.name, quantity: 1, unit: it.unit, unit_price: sugg.price });
            B.catalogService.rememberPrice(it.id, sugg.price);
            markDirty(); B.router.refresh();
          });
          ql.appendChild(row);
        });
      }
      B.$('input', search).addEventListener('input', B.debounce(paintQuick, 120));
      paintQuick();
      body.appendChild(quick);

      const totals = B.el('<div class="card"></div>');
      totals.innerHTML = '<div class="card-head"><h3>Total du devis</h3></div>';
      const tb = C().totalsBox(state.doc, function () { markDirty(); });
      totals.appendChild(tb);
      totals._box = tb;
      body.appendChild(totals);
      recalc();

      const sticky = B.el('<div class="sticky-actions btn-row"></div>');
      const back = B.el('<button class="btn btn-ghost">' + ui().icon('arrowLeft', 16) + ' Retour</button>');
      back.addEventListener('click', function () { state.step = 2; B.router.refresh(); });
      const next = B.el('<button class="btn btn-primary">Continuer ' + ui().icon('chevronRight', 16) + '</button>');
      next.addEventListener('click', function () {
        if (!state.doc.lines.length) { ui().toast('Ajoutez au moins un élément au devis.', 'error'); return; }
        state.step = 4; B.router.refresh();
      });
      sticky.appendChild(back); sticky.appendChild(next);
      body.appendChild(sticky);
    }

    /* --------------------------- Étape 4 : récapitulatif ----------------- */
    function renderSummary() {
      const t = B.calc.calculateDocumentTotals(state.doc, B.session.settings());
      const client = B.clientService.get(state.doc.client_id);
      const project = state.doc.project_id ? B.projectService.get(state.doc.project_id) : null;

      const head = B.el('<div class="card card-pad-lg"></div>');
      head.innerHTML = '<h3>Récapitulatif du devis</h3>' +
        '<div class="grid grid-2 mt-12" style="gap:10px">' +
        '<div><div class="tiny muted">Client</div><div class="strong">' + h(client ? client.name : 'Non défini') + '</div></div>' +
        '<div><div class="tiny muted">Chantier</div><div class="strong">' + h(project ? project.name : 'Aucun') + '</div></div>' +
        '<div><div class="tiny muted">Date</div><div class="strong">' + B.dateLong(state.doc.date) + '</div></div>' +
        '<div><div class="tiny muted">Validité</div><div class="strong">' + B.dateLong(B.addDays(state.doc.date, B.session.settings().valid_days || 30)) + '</div></div>' +
        '</div>';
      body.appendChild(head);

      const lines = B.el('<div class="card"><div class="card-head"><h3>' + state.doc.lines.length + ' ligne(s)</h3>' +
        '<button class="btn btn-ghost btn-sm" data-editlines>' + ui().icon('edit', 15) + ' Modifier</button></div>' +
        '<div class="table-wrap"><table class="data"><thead><tr><th>Désignation</th><th class="num col-opt">Qté</th><th class="num col-opt">P.U.</th><th class="num">Total</th></tr></thead>' +
        '<tbody>' + t.lines.map(function (l) {
          return '<tr><td>' + h(l.description) + '<div class="tiny muted">' + h(B.unitLabel(l.unit)) + '</div>' +
            '<div class="cell-sub">' + B.num(l.quantity) + ' × ' + B.money(l.unit_price) + '</div></td>' +
            '<td class="num col-opt">' + B.num(l.quantity) + '</td><td class="num col-opt">' + B.money(l.unit_price) + '</td><td class="num strong">' + B.money(l.total) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>');
      B.$('[data-editlines]', lines).addEventListener('click', function () { state.step = 3; B.router.refresh(); });
      body.appendChild(lines);

      const totalsCard = B.el('<div class="card"></div>');
      const tb = C().totalsBox(state.doc, function () { markDirty(); });
      totalsCard.appendChild(tb);
      body.appendChild(totalsCard);

      const meta = B.el('<div class="card"><div class="card-head"><h3>Notes et conditions</h3></div><div class="form-grid"></div></div>');
      const metaForm = B.$('.form-grid', meta);
      metaForm.appendChild(ui().field({ label: 'Notes', name: 'notes', type: 'textarea', value: state.doc.notes || '', placeholder: 'Ex : Chantier Maison Koffi — fourniture et pose.' }));
      metaForm.appendChild(ui().field({ label: 'Conditions de paiement', name: 'conditions', type: 'textarea', value: state.doc.conditions || B.session.settings().payment_terms }));
      metaForm.appendChild(ui().field({ label: 'Référence (facultatif)', name: 'reference', value: state.doc.reference || '', placeholder: 'Ex : Commande n° 12' }));
      metaForm.addEventListener('input', B.debounce(function () {
        const v = ui().formValues(metaForm);
        state.doc.notes = v.notes; state.doc.conditions = v.conditions; state.doc.reference = v.reference;
        markDirty();
      }, 400));
      body.appendChild(meta);

      /* Note sur les taxes (#37) */
      const st = B.session.settings();
      body.appendChild(B.el('<div class="banner banner-info">' + ui().icon('info', 18) +
        '<span>Taxe : ' + (st.tax_enabled !== false && st.tax_rate > 0 ? h(st.tax_name) + ' ' + st.tax_rate + ' % (' + (st.tax_mode === 'inclusive' ? 'incluse' : 'exclue') + ')' : 'aucune taxe appliquée') +
        '. Vous pouvez modifier ces réglages dans Paramètres → Documents.</span></div>'));

      const sticky = B.el('<div class="sticky-actions stack-sm"></div>');
      const row = B.el('<div class="btn-row"></div>');
      const back = B.el('<button class="btn btn-ghost">' + ui().icon('arrowLeft', 16) + ' Retour</button>');
      back.addEventListener('click', function () { state.step = 3; B.router.refresh(); });
      const draft = B.el('<button class="btn btn-ghost">Enregistrer le brouillon</button>');
      draft.addEventListener('click', function () {
        const s = save(false);
        if (s) {
          quoteEditor.state = null;
          ui().toast('Brouillon enregistré. Vous pouvez revenir plus tard.', 'success');
          B.router.go('/quotes/' + s.id);
        }
      });
      const generate = B.el('<button class="btn btn-primary">' + ui().icon('download', 17) + ' Générer le devis</button>');
      generate.addEventListener('click', function () {
        const errs = B.quoteService.validate(state.doc, { strict: true });
        if (!errs.ok) {
          const firstError = Object.keys(errs.errors)[0];
          ui().toast(errs.errors[firstError], 'error');
          if (firstError === 'client_id') { state.step = 1; B.router.refresh(); }
          if (firstError === 'lines') { state.step = 3; B.router.refresh(); }
          return;
        }
        const saved = save(false);
        if (!saved) return;
        quoteEditor.state = null;
        const preview = C().documentPreview('quote', saved);
        const send = B.el('<button class="btn btn-soft">Marquer comme envoyé</button>');
        send.addEventListener('click', function () {
          B.quoteService.setStatus(saved.id, 'envoye');
          preview.close();
          B.router.go('/quotes/' + saved.id);
          ui().toast('Devis ' + saved.number + ' marqué comme envoyé.', 'success');
        });
        preview.foot.appendChild(send);
        ui().toast('Devis ' + saved.number + ' généré avec succès.', 'success');
      });
      row.appendChild(back); row.appendChild(draft); row.appendChild(generate);
      sticky.appendChild(row);
      body.appendChild(sticky);
    }

    function recalc() {
      const boxes = B.$$('.totals-box', body);
      boxes.forEach(function (b) { if (b.repaint) b.repaint(); });
    }

    function navButtons(prevStep, nextStep, validator) {
      const row = B.el('<div class="sticky-actions btn-row"></div>');
      if (prevStep) {
        const back = B.el('<button class="btn btn-ghost">' + ui().icon('arrowLeft', 16) + ' Retour</button>');
        back.addEventListener('click', function () { state.step = prevStep; B.router.refresh(); });
        row.appendChild(back);
      }
      const next = B.el('<button class="btn btn-primary">Continuer ' + ui().icon('chevronRight', 16) + '</button>');
      next.addEventListener('click', function () {
        if (validator && validator() === false) return;
        state.step = nextStep;
        B.router.refresh();
      });
      row.appendChild(next);
      body.appendChild(row);
    }

    /* ------------------------------- Rendu final ------------------------- */
    if (state.step === 1) renderClient();
    else if (state.step === 2) renderProject();
    else if (state.step === 3) renderItems();
    else renderSummary();

    B.$('[data-back]', head).addEventListener('click', function () {
      if (state.doc.id || state.doc.lines.length) {
        const s = save(true);
        quoteEditor.state = null;
        if (s) B.router.go('/quotes/' + s.id);
        else B.router.go('/quotes');
      } else { quoteEditor.state = null; B.router.go('/quotes'); }
    });
    saveState.innerHTML = state.lastSaved ? ui().icon('checkCircle', 13) + ' Enregistré · ' + B.relative(state.lastSaved) : ui().icon('clock', 13) + ' Aucune modification enregistrée';
    return wrap;
  }

  /* =======================================================================
     DEVIS — DÉTAIL
     ======================================================================= */
  function quoteDetail(ctx) {
    const q = B.quoteService.get(ctx.params.id);
    if (!q) return notFound('Ce devis est introuvable.');
    const client = B.clientService.get(q.client_id);
    const project = q.project_id ? B.projectService.get(q.project_id) : null;
    const invoice = B.invoiceService.list({}).find(function (i) { return i.quote_id === q.id; });
    const wrap = B.el('<div class="stack"></div>');

    wrap.appendChild(B.el('<button class="btn btn-ghost btn-sm" data-back>' + ui().icon('arrowLeft', 16) + ' Mes devis</button>'));

    const head = B.el('<div class="card card-pad-lg"></div>');
    head.innerHTML =
      '<div class="row-between wrap" style="gap:10px"><div><div class="row" style="gap:10px">' +
      '<h2>' + h(q.number) + '</h2>' + ui().statusBadge(B.QUOTE_STATUSES, q.status) + '</div>' +
      '<div class="small muted mt-8">' + h(client ? client.name : 'Sans client') + ' · ' + B.dateLong(q.date) +
      ' · version ' + (q.version || 1) + '</div></div>' +
      '<div class="right"><div class="value mono" style="font-size:24px;font-weight:750">' + B.money(q.total) + '</div>' +
      '<div class="tiny muted">' + (q.valid_until ? 'Valable jusqu’au ' + B.dateLong(q.valid_until) : '') + '</div></div></div>';
    const actions = B.el('<div class="btn-row mt-16"></div>');
    [
      ['Télécharger le PDF', 'download', 'btn-primary', function () { B.pdf.openPreview(B.pdf.quoteHTML(q), { filename: q.number }); }],
      ['Partager sur WhatsApp', 'whatsapp', 'btn-soft', function () { C().shareDialog('quote', q); }],
      ['Modifier', 'edit', 'btn-ghost', function () { B.router.go('/quotes/' + q.id + '/edit'); }]
    ].forEach(function (a) {
      const b = B.el('<button class="btn ' + a[2] + '">' + ui().icon(a[1], 17) + ' ' + h(a[0]) + '</button>');
      b.addEventListener('click', a[3]);
      actions.appendChild(b);
    });
    head.appendChild(actions);
    if (q.status !== 'converti') {
      const conv = B.el('<button class="btn btn-ghost btn-block mt-12">' + ui().icon('invoice', 17) + ' Convertir en facture</button>');
      conv.addEventListener('click', function () { convertQuote(q); });
      head.appendChild(conv);
    }
    if (!project && q.status !== 'brouillon') {
      const mk = B.el('<button class="btn btn-ghost btn-block mt-12">' + ui().icon('hardhat', 17) + ' Créer le chantier à partir de ce devis</button>');
      mk.addEventListener('click', function () { createProjectFromQuote(q); });
      head.appendChild(mk);
    }
    wrap.appendChild(head);

    /* Statut du devis (#25) */
    const statusCard = B.el('<div class="card"><div class="card-head"><h3>Statut du devis</h3></div><div class="chip-scroll" data-chips></div>' +
      '<div class="tiny muted mt-8">Chaque changement est enregistré dans l’historique ci-dessous.</div></div>');
    const chips = B.$('[data-chips]', statusCard);
    B.QUOTE_STATUSES.filter(function (s) { return s.id !== 'converti'; }).forEach(function (s) {
      const c = B.el('<button class="chip' + (q.status === s.id ? ' active' : '') + '">' + h(s.label) + '</button>');
      c.addEventListener('click', function () {
        B.quoteService.setStatus(q.id, s.id);
        ui().toast('Statut du devis : ' + s.label + '.', 'success');
        B.router.refresh();
      });
      chips.appendChild(c);
    });
    wrap.appendChild(statusCard);

    /* Lignes + totaux */
    const doc = B.el('<div class="card"><div class="card-head"><h3>Détail</h3><span class="tiny muted">' + q.lines.length + ' ligne(s)</span></div>' +
      '<div class="table-wrap"><table class="data"><thead><tr><th>Désignation</th><th class="num col-opt">Qté</th><th class="num col-opt">P.U.</th><th class="num">Total</th></tr></thead>' +
      '<tbody>' + q.lines.map(function (l) {
        return '<tr><td>' + h(l.description) + '<div class="tiny muted">' + h(B.unitLabel(l.unit)) + '</div>' +
          '<div class="cell-sub">' + B.num(l.quantity) + ' × ' + B.money(l.unit_price) + '</div></td>' +
          '<td class="num col-opt">' + B.num(l.quantity) + '</td><td class="num col-opt">' + B.money(l.unit_price) + '</td><td class="num strong">' + B.money(l.total) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="totals-box mt-16">' +
      '<div class="line"><span>Sous-total</span><span class="pill-num">' + B.money(q.subtotal) + '</span></div>' +
      (q.discount && q.discount.value ? '<div class="line small muted"><span>Remise</span><span class="pill-num">−' + B.money(B.calc.calculateDiscount(q.subtotal, q.discount)) + '</span></div>' : '') +
      (q.tax ? '<div class="line small muted"><span>' + h(q.tax_label || 'Taxe') + '</span><span class="pill-num">' + B.money(q.tax) + '</span></div>' : '') +
      '<div class="line total"><span>Total</span><span class="pill-num">' + B.money(q.total) + '</span></div>' +
      (q.deposit ? '<div class="line small muted"><span>Acompte</span><span class="pill-num">' + B.money(q.deposit) + '</span></div>' +
        '<div class="line small muted"><span>Reste à payer</span><span class="pill-num">' + B.money(q.balance) + '</span></div>' : '') +
      '</div></div>');
    wrap.appendChild(doc);

    /* Informations liées */
    const info = B.el('<div class="card"><div class="card-head"><h3>Informations</h3></div>' +
      ui().kv('Chantier', project ? '<a href="#/projects/' + project.id + '">' + h(project.name) + '</a>' : 'Aucun') +
      ui().kv('Facture liée', invoice ? '<a href="#/invoices/' + invoice.id + '">' + h(invoice.number) + '</a>' : 'Aucune') +
      ui().kv('Référence', h(q.reference || '—')) +
      ui().kv('Créé le', B.dateTime(q.created_at)) +
      ui().kv('Dernière modification', B.dateTime(q.updated_at)) +
      ui().kv('Métier utilisé au moment du devis', h(B.getProfession(q.profession_id || B.session.professionId()).name)) +
      '</div>');
    wrap.appendChild(info);

    /* Notes / conditions */
    if (q.notes || q.conditions) {
      wrap.appendChild(B.el('<div class="grid grid-2" style="gap:14px">' +
        (q.notes ? '<div class="card"><div class="card-title mb-8">Notes</div><p class="small muted">' + h(q.notes) + '</p></div>' : '') +
        (q.conditions ? '<div class="card"><div class="card-title mb-8">Conditions</div><p class="small muted">' + h(q.conditions) + '</p></div>' : '') +
        '</div>'));
    }

    /* Historique (#79, #224) */
    if ((q.timeline || []).length) {
      const tl = B.el('<div class="card"><div class="card-head"><h3>Historique</h3></div><div class="timeline"></div></div>');
      const host = B.$('.timeline', tl);
      q.timeline.slice().reverse().forEach(function (t, i, arr) {
        host.appendChild(B.el('<div class="tl"><div class="dotcol"><div class="dot"></div>' + (i < arr.length - 1 ? '<div class="bar"></div>' : '') + '</div>' +
          '<div class="txt"><div class="small strong">' + h(t.label) + '</div><div class="tiny muted">' + B.dateTime(t.at) + '</div></div></div>'));
      });
      wrap.appendChild(tl);
    }

    /* Danger zone */
    const danger = B.el('<div class="card"><div class="card-head"><h3>Actions sur le devis</h3></div><div class="stack-sm">' +
      '<button class="btn btn-ghost btn-block" data-dup>' + ui().icon('copy', 17) + ' Dupliquer ce devis</button>' +
      '<button class="btn btn-danger btn-block" data-del>' + ui().icon('trash', 17) + ' Supprimer ce devis</button></div></div>');
    B.$('[data-dup]', danger).addEventListener('click', function () { duplicateQuote(q); });
    B.$('[data-del]', danger).addEventListener('click', function () { deleteQuote(q); });
    wrap.appendChild(danger);

    B.$('[data-back]', wrap).addEventListener('click', function () { B.router.go('/quotes'); });
    return wrap;
  }

  /* =======================================================================
     FACTURES (#45 → #47, #183)
     ======================================================================= */
  function invoicesList() {
    const state = invoicesList.state || (invoicesList.state = { status: 'all', search: '' });
    const wrap = B.el('<div class="stack"></div>');
    const rows = B.invoiceService.list({ status: state.status, search: state.search }).map(function (i) {
      return { inv: i, sum: B.calc.invoiceSummary(i) };
    });
    const total = rows.reduce(function (s, r) { return s + r.sum.total; }, 0);
    const paid = rows.reduce(function (s, r) { return s + r.sum.paid; }, 0);
    const remaining = rows.reduce(function (s, r) { return s + r.sum.remaining; }, 0);

    wrap.appendChild(B.el('<div class="row-between wrap"><div><h2>Mes factures</h2><div class="small muted">' + rows.length + ' facture(s)</div></div>' +
      '<button class="btn btn-primary" data-new>' + ui().icon('plus', 18) + ' Nouvelle facture</button></div>'));

    wrap.appendChild(B.el('<div class="grid grid-3-md" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">' +
      '<div class="card" style="padding:12px"><div class="tiny muted">Facturé</div><div class="strong mono">' + B.money(total) + '</div></div>' +
      '<div class="card" style="padding:12px"><div class="tiny muted">Encaissé</div><div class="strong mono tone-success">' + B.money(paid) + '</div></div>' +
      '<div class="card" style="padding:12px"><div class="tiny muted">Reste à encaisser</div><div class="strong mono tone-warn">' + B.money(remaining) + '</div></div></div>'));

    const search = B.el('<div class="search">' + ui().icon('search', 18) + '<input placeholder="Rechercher une facture, un client…" value="' + h(state.search) + '" aria-label="Rechercher"></div>');
    wrap.appendChild(search);
    B.$('input', search).addEventListener('input', B.debounce(function () { state.search = this.value; B.router.refresh(); }, 220));

    const chips = B.el('<div class="chip-scroll"></div>');
    [['all', 'Toutes']].concat(B.INVOICE_STATUSES.map(function (s) { return [s.id, s.label]; })).forEach(function (s) {
      const c = B.el('<button class="chip' + (state.status === s[0] ? ' active' : '') + '">' + h(s[1]) + '</button>');
      c.addEventListener('click', function () { state.status = s[0]; B.router.refresh(); });
      chips.appendChild(c);
    });
    wrap.appendChild(chips);

    if (!rows.length) {
      wrap.appendChild(ui().emptyState({
        icon: 'invoice', title: 'Aucune facture pour le moment',
        text: 'Créez une facture ou convertissez un devis accepté.',
        actionLabel: 'Nouvelle facture', onAction: function () { B.router.go('/invoices/new'); }
      }));
      B.$('[data-new]', wrap).addEventListener('click', function () { B.router.go('/invoices/new'); });
      return wrap;
    }

    const mobile = B.el('<div class="stack-sm only-sm"></div>');
    rows.forEach(function (r) {
      const client = B.clientService.get(r.inv.client_id);
      const card = B.el('<div class="card card-hover" style="padding:14px">' +
        '<div class="row-between"><div><div class="strong">' + h(r.inv.number) + '</div>' +
        '<div class="tiny muted">' + h(client ? client.name : 'Sans client') + ' · ' + B.dateShort(r.inv.date) + '</div></div>' +
        '<div class="right"><div class="strong mono">' + B.money(r.sum.total) + '</div>' + ui().statusBadge(B.INVOICE_STATUSES, r.sum.status) + '</div></div>' +
        (r.sum.remaining > 0 ? '<div class="tiny muted mt-8">Reste à payer : <strong class="tone-warn">' + B.money(r.sum.remaining) + '</strong></div>' : '') +
        '<div class="row-between mt-12"><button class="btn btn-soft btn-sm" data-open>Voir</button><span data-menu></span></div></div>');
      B.$('[data-open]', card).addEventListener('click', function () { B.router.go('/invoices/' + r.inv.id); });
      B.$('[data-menu]', card).appendChild(invoiceMenu(r.inv));
      mobile.appendChild(card);
    });
    wrap.appendChild(mobile);

    const desktop = B.el('<div class="card hide-sm"><div class="table-wrap"><table class="data"><thead><tr><th>Numéro</th><th>Client</th><th>Date</th>' +
      '<th class="num">Montant</th><th class="num">Payé</th><th>Statut</th><th></th></tr></thead><tbody></tbody></table></div></div>');
    const tbody = B.$('tbody', desktop);
    rows.forEach(function (r) {
      const client = B.clientService.get(r.inv.client_id);
      const tr = B.el('<tr><td><a class="strong" href="#/invoices/' + r.inv.id + '">' + h(r.inv.number) + '</a></td>' +
        '<td>' + h(client ? client.name : '—') + '</td><td>' + B.dateShort(r.inv.date) + '</td>' +
        '<td class="num strong">' + B.money(r.sum.total) + '</td><td class="num">' + B.money(r.sum.paid) + '</td>' +
        '<td>' + ui().statusBadge(B.INVOICE_STATUSES, r.sum.status) + '</td><td class="actions"></td></tr>');
      B.$('td.actions', tr).appendChild(invoiceMenu(r.inv));
      tbody.appendChild(tr);
    });
    wrap.appendChild(desktop);
    B.$('[data-new]', wrap).addEventListener('click', function () { B.router.go('/invoices/new'); });
    return wrap;
  }

  function invoiceMenu(inv) {
    const sum = B.calc.invoiceSummary(inv);
    return ui().actionsMenu([
      { label: 'Voir la facture', icon: 'invoice', onClick: function () { B.router.go('/invoices/' + inv.id); } },
      { label: 'Enregistrer un paiement', icon: 'wallet', hidden: sum.remaining <= 0, onClick: function () { paymentForm(inv); } },
      { label: 'Télécharger le PDF', icon: 'download', onClick: function () { B.pdf.openPreview(B.pdf.invoiceHTML(inv), { filename: inv.number }); } },
      { label: 'Partager', icon: 'share', onClick: function () { B.components.shareDialog('invoice', inv); } },
      { label: 'Dupliquer', icon: 'copy', onClick: function () {
          const copy = B.invoiceService.duplicate(inv.id);
          ui().toast('Facture ' + copy.number + ' créée.', 'success');
          B.router.go('/invoices/' + copy.id);
        } },
      { label: 'Supprimer', icon: 'trash', tone: 'danger', onClick: function () {
          C().confirmDelete('la facture ' + inv.number, function () {
            B.invoiceService.remove(inv.id); ui().toast('Facture supprimée.', 'success'); B.router.refresh();
          });
        } }
    ]);
  }

  function paymentForm(inv) {
    const sum = B.calc.invoiceSummary(inv);
    const form = B.el('<form class="form-grid"></form>');
    form.appendChild(ui().field({ label: 'Montant reçu', name: 'amount', type: 'money', required: true, value: sum.remaining, hint: 'Reste à payer : ' + B.money(sum.remaining) }));
    form.appendChild(ui().field({ label: 'Date', name: 'date', type: 'date', value: B.today() }));
    form.appendChild(ui().field({
      label: 'Moyen de paiement (facultatif)', name: 'method', type: 'select', value: 'Espèces',
      options: ['Espèces', 'Mobile Money', 'Virement', 'Chèque', 'Autre'].map(function (m) { return { value: m, label: m }; })
    }));
    form.appendChild(ui().field({ label: 'Note (facultatif)', name: 'note', type: 'text', placeholder: 'Ex : acompte de démarrage' }));
    const m = ui().modal({ title: 'Enregistrer un paiement', body: form });
    const ok = B.el('<button class="btn btn-primary">Enregistrer</button>');
    ok.addEventListener('click', function () {
      const v = ui().formValues(form);
      const amount = ui().moneyValue(B.$('[name="amount"]', form));
      if (!amount || amount <= 0) { ui().showErrors(form, { amount: 'Indiquez un montant valide.' }); return; }
      B.invoiceService.addPayment(inv.id, Object.assign(v, { amount: amount }));
      m.close();
      ui().toast('Paiement enregistré.', 'success');
      B.router.refresh();
    });
    m.foot.appendChild(ok);
    ui().bindMoneyInputs(form);
    return m;
  }

  function invoiceDetail(ctx) {
    const inv = B.invoiceService.get(ctx.params.id);
    if (!inv) return notFound('Cette facture est introuvable.');
    const data = B.invoiceService.context(inv.id);
    const client = data.invoice.client_id ? B.clientService.get(data.invoice.client_id) : null;
    const sum = data.summary;
    const wrap = B.el('<div class="stack"></div>');

    wrap.appendChild(B.el('<button class="btn btn-ghost btn-sm" data-back>' + ui().icon('arrowLeft', 16) + ' Mes factures</button>'));

    const head = B.el('<div class="card card-pad-lg"></div>');
    head.innerHTML = '<div class="row-between wrap" style="gap:10px"><div><div class="row" style="gap:10px"><h2>' + h(inv.number) + '</h2>' +
      ui().statusBadge(B.INVOICE_STATUSES, sum.status) + '</div>' +
      '<div class="small muted mt-8">' + h(client ? client.name : 'Sans client') + ' · ' + B.dateLong(inv.date) +
      ' · échéance ' + B.dateLong(inv.due_date) + '</div></div>' +
      '<div class="right"><div class="value mono" style="font-size:24px;font-weight:750">' + B.money(sum.total) + '</div>' +
      '<div class="tiny muted">Payé : ' + B.money(sum.paid) + '</div></div></div>';
    const actions = B.el('<div class="btn-row mt-16"></div>');
    [
      ['Télécharger le PDF', 'download', 'btn-primary', function () { B.pdf.openPreview(B.pdf.invoiceHTML(inv), { filename: inv.number }); }],
      ['Partager sur WhatsApp', 'whatsapp', 'btn-soft', function () { C().shareDialog('invoice', inv); }],
      [sum.remaining > 0 ? 'Enregistrer un paiement' : 'Paiement complet', 'wallet', 'btn-ghost', function () {
        if (sum.remaining > 0) paymentForm(inv); else ui().toast('Cette facture est entièrement payée.', 'info');
      }]
    ].forEach(function (a) {
      const b = B.el('<button class="btn ' + a[2] + '">' + ui().icon(a[1], 17) + ' ' + h(a[0]) + '</button>');
      b.addEventListener('click', a[3]);
      actions.appendChild(b);
    });
    head.appendChild(actions);
    wrap.appendChild(head);

    /* Suivi des paiements (#270, #271) */
    const pay = B.el('<div class="card"><div class="card-head"><h3>Suivi du paiement</h3><span class="tiny muted">Enregistrement manuel — aucun paiement en ligne</span></div>' +
      '<div class="grid grid-3-md" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">' +
      '<div><div class="tiny muted">Montant facturé</div><div class="strong mono">' + B.money(sum.total) + '</div></div>' +
      '<div><div class="tiny muted">Montant payé</div><div class="strong mono tone-success">' + B.money(sum.paid) + '</div></div>' +
      '<div><div class="tiny muted">Reste</div><div class="strong mono ' + (sum.remaining > 0 ? 'tone-warn' : 'tone-success') + '">' + B.money(sum.remaining) + '</div></div>' +
      '</div>' + ui().progress(sum.total ? (sum.paid / sum.total) * 100 : 0, 'success') +
      ((inv.payments && inv.payments.length) ? '<div class="mt-12">' + inv.payments.map(function (p) {
        return ui().kv(B.dateLong(p.date) + (p.method ? ' · ' + p.method : ''), B.money(p.amount) + (p.note ? ' <span class="tiny muted">' + h(p.note) + '</span>' : ''));
      }).join('') + '</div>' : '<p class="muted small mt-12">Aucun paiement enregistré pour le moment.</p>') +
      '</div>');
    wrap.appendChild(pay);

    /* Lignes */
    wrap.appendChild(B.el('<div class="card"><div class="card-head"><h3>Détail</h3><span class="tiny muted">' + inv.lines.length + ' ligne(s)</span></div>' +
      '<div class="table-wrap"><table class="data"><thead><tr><th>Désignation</th><th class="num col-opt">Qté</th><th class="num col-opt">P.U.</th><th class="num">Total</th></tr></thead><tbody>' +
      inv.lines.map(function (l) {
        return '<tr><td>' + h(l.description) + '<div class="tiny muted">' + h(B.unitLabel(l.unit)) + '</div>' +
          '<div class="cell-sub">' + B.num(l.quantity) + ' × ' + B.money(l.unit_price) + '</div></td>' +
          '<td class="num col-opt">' + B.num(l.quantity) + '</td><td class="num col-opt">' + B.money(l.unit_price) + '</td><td class="num strong">' + B.money(l.total) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="totals-box mt-16"><div class="line"><span>Sous-total</span><span class="pill-num">' + B.money(inv.subtotal) + '</span></div>' +
      (inv.discount && inv.discount.value ? '<div class="line small muted"><span>Remise</span><span class="pill-num">−' + B.money(B.calc.calculateDiscount(inv.subtotal, inv.discount)) + '</span></div>' : '') +
      (inv.tax ? '<div class="line small muted"><span>Taxe</span><span class="pill-num">' + B.money(inv.tax) + '</span></div>' : '') +
      '<div class="line total"><span>Total</span><span class="pill-num">' + B.money(inv.total) + '</span></div></div></div>'));

    /* Contexte chantier (#47) */
    if (data.project) {
      const ps = data.project_summary;
      const pc = B.el('<div class="card"><div class="card-head"><h3>Chantier associé</h3>' +
        '<button class="btn btn-ghost btn-sm" data-proj>Voir la fiche</button></div>' +
        ui().kv('Chantier', h(data.project.name)) +
        ui().kv('Montant du contrat', B.money(ps.contract)) +
        ui().kv('Dépenses enregistrées', B.money(ps.spent)) +
        ui().kv('Résultat provisoire', B.money(ps.actual_result), ps.actual_result >= 0 ? 'tone-success' : 'tone-danger') +
        '<div class="help-text mt-8">Estimation basée sur les données enregistrées.</div></div>');
      B.$('[data-proj]', pc).addEventListener('click', function () { B.router.go('/projects/' + data.project.id); });
      wrap.appendChild(pc);
    }

    const info = B.el('<div class="card"><div class="card-head"><h3>Informations</h3></div>' +
      ui().kv('Devis d’origine', data.quote ? '<a href="#/quotes/' + data.quote.id + '">' + h(data.quote.number) + '</a>' : 'Aucun (facture directe)') +
      ui().kv('Référence', h(inv.reference || '—')) +
      ui().kv('Créée le', B.dateTime(inv.created_at)) +
      ui().kv('Dernière modification', B.dateTime(inv.updated_at)) +
      ui().kv('Version', String(inv.version || 1)) + '</div>');
    wrap.appendChild(info);

    const danger = B.el('<div class="card"><div class="card-head"><h3>Actions</h3></div><div class="stack-sm">' +
      '<button class="btn btn-ghost btn-block" data-edit>' + ui().icon('edit', 17) + ' Modifier la facture</button>' +
      '<button class="btn btn-ghost btn-block" data-cancel>' + ui().icon('archive', 17) + ' Annuler la facture</button>' +
      '<button class="btn btn-danger btn-block" data-del>' + ui().icon('trash', 17) + ' Supprimer la facture</button></div></div>');
    B.$('[data-edit]', danger).addEventListener('click', function () { B.router.go('/invoices/' + inv.id + '/edit'); });
    B.$('[data-cancel]', danger).addEventListener('click', function () {
      ui().confirm({ title: 'Annuler la facture ' + inv.number + ' ?', message: 'La facture sera marquée comme annulée mais restera dans votre historique.', confirmLabel: 'Annuler la facture' })
        .then(function (ok) { if (ok) { B.invoiceService.setStatus(inv.id, 'annulee'); ui().toast('Facture annulée.', 'success'); B.router.refresh(); } });
    });
    B.$('[data-del]', danger).addEventListener('click', function () {
      C().confirmDelete('la facture ' + inv.number, function () { B.invoiceService.remove(inv.id); ui().toast('Facture supprimée.', 'success'); B.router.go('/invoices'); });
    });
    wrap.appendChild(danger);

    B.$('[data-back]', wrap).addEventListener('click', function () { B.router.go('/invoices'); });
    return wrap;
  }

  /* ------------------------------ Éditeur de facture ---------------------- */
  function invoiceEditor(ctx) {
    const existing = ctx.params.id ? B.invoiceService.get(ctx.params.id) : null;
    if (ctx.params.id && !existing) return notFound('Cette facture est introuvable.');
    const wrap = B.el('<div class="stack"></div>');
    const state = existing
      ? Object.assign({}, existing, { lines: existing.lines.map(function (l) { return Object.assign({}, l); }), discount: Object.assign({}, existing.discount) })
      : Object.assign(B.invoiceService.empty(), { lines: [] });

    wrap.appendChild(B.el('<div class="row-between wrap"><div><h2>' + (existing ? 'Facture ' + h(existing.number) : 'Nouvelle facture') + '</h2>' +
      '<div class="small muted">' + h(B.session.business().name) + '</div></div></div>'));

    const card = B.el('<div class="card card-pad-lg"></div>');
    const form = B.el('<form class="form-grid"></form>');
    form.appendChild(ui().field({ label: 'Date', name: 'date', type: 'date', value: state.date, required: true }));
    form.appendChild(ui().field({ label: 'Échéance', name: 'due_date', type: 'date', value: state.due_date || B.addDays(state.date, 30) }));
    form.appendChild(ui().field({
      label: 'Statut', name: 'status', type: 'select', value: state.status || 'emise',
      options: B.INVOICE_STATUSES.map(function (s) { return { value: s.id, label: s.label }; })
    }));
    card.appendChild(form);

    const clientField = B.el('<div class="field mt-16"><label>Client <span style="color:#DC2626">*</span></label><button type="button" class="input row-between" data-client style="text-align:left"></button></div>');
    let client = state.client_id ? B.clientService.get(state.client_id) : null;
    function paintClient() {
      B.$('[data-client]', clientField).innerHTML = client
        ? '<span>' + h(client.name) + '</span><span class="muted tiny">Changer</span>'
        : '<span class="muted">Choisir un client</span><span class="muted tiny">Sélectionner</span>';
    }
    paintClient();
    B.$('[data-client]', clientField).addEventListener('click', async function () {
      const c = await C().pickClient();
      if (c) { client = c; paintClient(); }
    });
    card.appendChild(clientField);

    const projField = B.el('<div class="field mt-16"><label>Chantier (facultatif)</label><button type="button" class="input row-between" data-proj style="text-align:left"></button></div>');
    let project = state.project_id ? B.projectService.get(state.project_id) : null;
    function paintProject() {
      B.$('[data-proj]', projField).innerHTML = project
        ? '<span>' + h(project.name) + '</span><span class="muted tiny">Changer</span>'
        : '<span class="muted">Aucun chantier</span><span class="muted tiny">Sélectionner</span>';
    }
    paintProject();
    B.$('[data-proj]', projField).addEventListener('click', async function () {
      const p = await C().pickProject({ client_id: client ? client.id : null });
      if (p !== undefined) { project = p; paintProject(); }
    });
    card.appendChild(projField);
    wrap.appendChild(card);

    /* Lignes */
    const linesCard = B.el('<div class="card"><div class="card-head"><h3>Lignes de la facture</h3></div><div class="stack-sm" data-lines></div></div>');
    const linesHost = B.$('[data-lines]', linesCard);
    function paintLines() {
      linesHost.innerHTML = '';
      if (!state.lines.length) linesHost.appendChild(ui().emptyState({ icon: 'box', title: 'Aucune ligne', text: 'Ajoutez vos matériaux ou prestations.' }));
      state.lines.forEach(function (l) {
        linesHost.appendChild(C().lineEditor(l, { onChange: function () { repaintTotals(); } }));
      });
    }
    const addBtn = B.el('<button class="btn btn-primary btn-block mt-12">' + ui().icon('plus', 17) + ' Ajouter un élément</button>');
    addBtn.addEventListener('click', async function () {
      const picked = await C().catalogPicker();
      if (!picked) return;
      state.lines.push({ id: B.uid('li'), catalog_item_id: picked.item.id, description: picked.item.name, quantity: 1, unit: picked.unit, unit_price: picked.price });
      B.catalogService.rememberPrice(picked.item.id, picked.price);
      paintLines(); repaintTotals();
    });
    linesCard._add = addBtn;
    paintLines();
    linesCard.appendChild(addBtn);
    wrap.appendChild(linesCard);

    const totalsCard = B.el('<div class="card"><div class="card-head"><h3>Totaux</h3></div></div>');
    const tb = C().totalsBox(state, function () { });
    totalsCard.appendChild(tb);
    wrap.appendChild(totalsCard);
    function repaintTotals() { tb.repaint(); }

    const notesCard = B.el('<div class="card"><div class="card-head"><h3>Notes et conditions</h3></div><div class="form-grid"></div></div>');
    const nf = B.$('.form-grid', notesCard);
    nf.appendChild(ui().field({ label: 'Notes', name: 'notes', type: 'textarea', value: state.notes || '' }));
    nf.appendChild(ui().field({ label: 'Conditions de paiement', name: 'conditions', type: 'textarea', value: state.conditions || B.session.settings().payment_terms }));
    nf.appendChild(ui().field({ label: 'Référence', name: 'reference', value: state.reference || '' }));
    wrap.appendChild(notesCard);

    const actions = B.el('<div class="sticky-actions btn-row"></div>');
    const back = B.el('<button class="btn btn-ghost">' + ui().icon('arrowLeft', 16) + ' Mes factures</button>');
    back.addEventListener('click', function () { B.router.go('/invoices'); });
    const saveBtn = B.el('<button class="btn btn-primary">' + (existing ? 'Enregistrer' : 'Créer la facture') + '</button>');
    saveBtn.addEventListener('click', function () {
      if (!client) { ui().toast('Choisissez un client.', 'error'); return; }
      const v = ui().formValues(form);
      const n = ui().formValues(nf);
      if (!state.lines.length) { ui().toast('Ajoutez au moins une ligne.', 'error'); return; }
      const payload = Object.assign({}, v, n, {
        client_id: client.id, project_id: project ? project.id : null, lines: state.lines,
        discount: state.discount, deposit: 0
      });
      const row = existing ? B.invoiceService.update(existing.id, payload) : B.invoiceService.create(payload);
      ui().toast(existing ? 'Facture mise à jour.' : 'Facture ' + row.number + ' créée avec succès.', 'success');
      B.router.go('/invoices/' + row.id);
    });
    actions.appendChild(back); actions.appendChild(saveBtn);
    wrap.appendChild(actions);
    return wrap;
  }

  function notFound(message) {
    const wrap = B.el('<div class="card card-pad-lg center"></div>');
    wrap.innerHTML = '<div class="il" style="width:60px;height:60px;margin:0 auto 12px;border-radius:18px;background:var(--warn-soft);color:#92400E;display:grid;place-items:center">' + ui().icon('alert', 28) + '</div>' +
      '<h3>Document introuvable</h3><p class="muted mt-8">' + h(message || 'Cet élément n’existe plus dans vos données.') + '</p>';
    const b = B.el('<button class="btn btn-primary mt-16">Retour aux documents</button>');
    b.addEventListener('click', function () { B.router.go('/documents'); });
    wrap.appendChild(b);
    return wrap;
  }

  B.screens = B.screens || {};
  Object.assign(B.screens, {
    quotesList: quotesList, quoteEditor: quoteEditor, quoteDetail: quoteDetail,
    invoicesList: invoicesList, invoiceDetail: invoiceDetail, invoiceEditor: invoiceEditor,
    notFound: notFound, quoteMenu: quoteMenu, invoiceMenu: invoiceMenu, paymentForm: paymentForm
  });
})(globalThis.BATIYO = globalThis.BATIYO || {});
