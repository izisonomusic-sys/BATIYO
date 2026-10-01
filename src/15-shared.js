/* =========================================================================
   BATIYO — 15. COMPOSANTS MÉTIER PARTAGÉS
   Sélecteurs (client, chantier, article), éditeur de lignes, récapitulatif,
   aperçu de document. Réutilisés par les devis, factures, dépenses, chantiers.
   ========================================================================= */
(function (B) {
  'use strict';
  const h = B.escape;
  const ui = function () { return B.ui; };

  /* ---------------------------- Sélection client -------------------------- */
  function pickClient(opts) {
    const o = opts || {};
    return new Promise(function (resolve) {
      const m = ui().modal({ title: 'Choisir un client', size: 'wide' });
      const body = B.el('<div class="stack"></div>');
      const search = B.el('<div class="search">' + ui().icon('search', 18) + '<input placeholder="Rechercher un client…" aria-label="Rechercher un client"></div>');
      const list = B.el('<div class="list"></div>');
      body.appendChild(search);
      body.appendChild(list);
      const createBtn = B.el('<button class="btn btn-primary btn-block">' + ui().icon('plus', 18) + ' Nouveau client</button>');
      body.appendChild(createBtn);
      m.body.appendChild(body);
      if (m.foot) m.foot.remove();

      function paint() {
        const term = B.$('input', search).value;
        const rows = B.clientService.search(term);
        list.innerHTML = '';
        if (!rows.length) {
          list.appendChild(ui().emptyState({ icon: 'users', title: 'Aucun client trouvé', text: term ? 'Essayez un autre nom.' : 'Ajoutez votre premier client pour commencer.' }));
          return;
        }
        rows.forEach(function (c) {
          const row = B.el('<button class="list-item"></button>');
          row.innerHTML = '<div class="avatar">' + ui().icon('user', 18) + '</div>' +
            '<div class="body"><div class="t1">' + h(c.name) + (c.favorite ? ' ' + ui().badge('Favori', 'accent') : '') + '</div>' +
            '<div class="t2">' + h([c.phone, c.address].filter(Boolean).join(' · ') || 'Aucune coordonnée') + '</div></div>' +
            '<div class="end">' + ui().icon('chevronRight', 18) + '</div>';
          row.addEventListener('click', function () { m.close(); resolve(c); });
          list.appendChild(row);
        });
      }
      B.$('input', search).addEventListener('input', B.debounce(paint, 120));
      paint();

      createBtn.addEventListener('click', function () {
        m.close();
        clientForm(null, function (created) { resolve(created || null); });
      });
      m.onClose = function () { resolve(o.cancelToNull === false ? undefined : null); };
    });
  }

  /* ---------------------------- Formulaire client ------------------------- */
  function clientForm(client, done) {
    const isEdit = !!client;
    const form = B.el('<form class="form-grid" novalidate></form>');
    const fields = [
      { label: 'Nom', name: 'name', required: true, value: client ? client.name : '', placeholder: 'Ex : Koffi Adjé' },
      { label: 'Téléphone', name: 'phone', type: 'tel', value: client ? client.phone : '', placeholder: 'Ex : +228 90 12 34 56' },
      { label: 'Adresse', name: 'address', value: client ? client.address : '', placeholder: 'Ex : Agoè-Nyivé, Lomé' },
      { label: 'Email (facultatif)', name: 'email', type: 'email', value: client ? client.email : '' },
      { label: 'Notes (facultatif)', name: 'notes', type: 'textarea', value: client ? client.notes : '' }
    ];
    fields.forEach(function (f) { form.appendChild(ui().field(f)); });
    const fav = B.el('<label class="switch"><input type="checkbox" name="favorite"' + (client && client.favorite ? ' checked' : '') + '><span>Client favori</span></label>');
    form.appendChild(fav);

    const m = ui().modal({
      title: isEdit ? 'Modifier le client' : 'Nouveau client',
      body: form, size: 'wide'
    });
    const save = B.el('<button class="btn btn-primary">' + (isEdit ? 'Enregistrer' : 'Créer le client') + '</button>');
    const cancel = B.el('<button class="btn btn-ghost" data-close>Annuler</button>');
    m.foot.appendChild(cancel); m.foot.appendChild(save);
    save.addEventListener('click', function () {
      const v = ui().formValues(form);
      if (!v.name) { ui().showErrors(form, { name: 'Indiquez le nom du client.' }); return; }
      const row = isEdit ? B.clientService.update(client.id, v) : B.clientService.create(v);
      m.close();
      ui().toast(isEdit ? 'Client mis à jour.' : 'Client créé avec succès.', 'success');
      if (done) done(row);
      B.router.refresh();
    });
    return m;
  }

  /* --------------------------- Sélection chantier ------------------------- */
  function pickProject(opts) {
    const o = opts || {};
    return new Promise(function (resolve) {
      const rows = B.projectService.list({ status: 'actifs', client_id: o.client_id });
      const m = ui().modal({ title: 'Associer un chantier', size: 'wide' });
      const body = B.el('<div class="stack"></div>');
      if (o.allowNone !== false) {
        const none = B.el('<button class="list-item"><div class="avatar neutral">' + ui().icon('x', 18) + '</div><div class="body"><div class="t1">Aucun chantier</div><div class="t2">Le document ne sera lié à aucun chantier</div></div></button>');
        none.addEventListener('click', function () { m.close(); resolve(null); });
        body.appendChild(none);
      }
      const list = B.el('<div class="list"></div>');
      if (!rows.length) {
        list.appendChild(ui().emptyState({ icon: 'hardhat', title: 'Aucun chantier actif', text: 'Créez un chantier pour suivre son budget et ses dépenses.', actionLabel: 'Créer un chantier', onAction: function () { m.close(); projectForm(null, function (p) { resolve(p); }); } }));
      }
      rows.forEach(function (p) {
        const exp = B.expenseService.totals({ project_id: p.id });
        const row = B.el('<button class="list-item"></button>');
        row.innerHTML = '<div class="avatar">' + ui().icon('hardhat', 18) + '</div>' +
          '<div class="body"><div class="t1">' + h(p.name) + '</div><div class="t2">' + B.money(p.quote_total) + ' · ' + B.money(exp) + ' dépensés</div></div>' +
          '<div class="end">' + ui().statusBadge(B.PROJECT_STATUSES, p.status) + '</div>';
        row.addEventListener('click', function () { m.close(); resolve(p); });
        list.appendChild(row);
      });
      body.appendChild(list);
      m.body.appendChild(body);
      if (m.foot) m.foot.remove();
    });
  }

  /* ---------------------------- Formulaire chantier ----------------------- */
  function projectForm(project, done, preset) {
    const isEdit = !!project;
    const p = project || Object.assign({ status: 'planifie', progress: 0, budget: {} }, preset || {});
    const form = B.el('<form class="form-grid" novalidate></form>');
    const clientPick = B.el('<div class="field"><label>Client <span style="color:#DC2626">*</span></label><button type="button" class="input row-between" data-client style="text-align:left"></button><div class="error" data-error hidden></div></div>');
    let selectedClient = p.client_id ? B.clientService.get(p.client_id) : null;
    function paintClient() {
      B.$('[data-client]', clientPick).innerHTML = selectedClient
        ? '<span>' + h(selectedClient.name) + '</span><span class="muted tiny">Changer</span>'
        : '<span class="muted">Choisir un client</span><span class="muted tiny">Sélectionner</span>';
    }
    paintClient();
    B.$('[data-client]', clientPick).addEventListener('click', async function () {
      const c = await pickClient();
      if (c) { selectedClient = c; paintClient(); }
    });
    form.appendChild(clientPick);
    form.appendChild(ui().field({ label: 'Nom du chantier', name: 'name', required: true, value: p.name || '', placeholder: 'Ex : Maison Koffi' }));
    form.appendChild(ui().field({ label: 'Adresse', name: 'address', value: p.address || '', placeholder: 'Ex : Agoè-Nyivé, Lomé' }));
    form.appendChild(ui().field({ label: 'Description', name: 'description', type: 'textarea', value: p.description || '', placeholder: 'Travaux prévus, lots, remarques…' }));
    form.appendChild(ui().field({
      label: 'Statut', name: 'status', type: 'select', value: p.status,
      options: B.PROJECT_STATUSES.map(function (s) { return { value: s.id, label: s.label }; })
    }));
    form.appendChild(ui().field({ label: 'Montant du contrat', name: 'quote_total', type: 'money', value: p.quote_total || '', hint: 'Montant total prévu avec le client.' }));
    const dates = B.el('<div class="grid grid-2-sm" style="grid-template-columns:repeat(2,minmax(0,1fr))"></div>');
    dates.appendChild(ui().field({ label: 'Début', name: 'start_date', type: 'date', value: p.start_date || B.today() }));
    dates.appendChild(ui().field({ label: 'Fin prévue', name: 'end_date', type: 'date', value: p.end_date || B.addDays(B.today(), 60) }));
    form.appendChild(dates);
    form.appendChild(ui().field({ label: 'Notes', name: 'notes', type: 'textarea', value: p.notes || '' }));

    /* Budget par poste */
    const budgetBox = B.el('<div class="card"><div class="card-head"><div class="card-title">Budget prévisionnel</div><div class="tiny muted" data-total></div></div><div class="stack-sm" data-budget></div></div>');
    const budget = Object.assign({}, p.budget || B.calc.budgetFromQuote({ profession_id: B.session.professionId(), total: B.parseNumber(p.quote_total) || 0 }, [], B.session.profession(), B.session.settings()));
    function paintBudget() {
      const host = B.$('[data-budget]', budgetBox);
      host.innerHTML = '';
      B.BUDGET_LINES.forEach(function (line) {
        const row = B.el('<div class="row" style="gap:10px"><div class="grow small strong">' + h(B.budgetLineLabel(line)) + '</div><div style="width:150px"><div class="input-group"><input class="input money-input" inputmode="numeric" data-b="' + line + '" value="' + (budget[line] ? B.num(budget[line]) : '') + '" data-raw="' + (budget[line] || '') + '" placeholder="0"><span class="suffix">FCFA</span></div></div></div>');
        host.appendChild(row);
      });
      ui().bindMoneyInputs(host);
      const total = B.calc.calculateBudgetTotal(budget);
      const contract = ui().moneyValue(B.$('[name="quote_total"]', form));
      B.$('[data-total]', budgetBox).innerHTML = 'Total : <strong>' + B.money(total) + '</strong>' +
        (contract ? ' · Marge prévisionnelle : <strong class="' + (contract - total >= 0 ? 'tone-success' : 'tone-danger') + '">' + B.money(contract - total) + '</strong>' : '');
    }
    form.appendChild(budgetBox);
    B.$('[name="quote_total"]', form).addEventListener('input', paintBudget);
    paintBudget();
    setTimeout(function () { paintBudget(); }, 30);

    if (isEdit) {
      const prog = B.el('<div class="field"><label>Avancement : <strong data-prog>' + (p.progress || 0) + ' %</strong></label>' +
        '<input type="range" min="0" max="100" step="25" value="' + (p.progress || 0) + '" name="progress" style="width:100%"></div>');
      B.$('input', prog).addEventListener('input', function () { B.$('[data-prog]', prog).textContent = this.value; });
      form.appendChild(prog);
    }

    const m = ui().modal({ title: isEdit ? 'Modifier le chantier' : 'Nouveau chantier', body: form, size: 'wide' });
    const save = B.el('<button class="btn btn-primary">' + (isEdit ? 'Enregistrer' : 'Créer le chantier') + '</button>');
    const cancel = B.el('<button class="btn btn-ghost" data-close>Annuler</button>');
    m.foot.appendChild(cancel); m.foot.appendChild(save);
    save.addEventListener('click', function () {
      const v = ui().formValues(form);
      if (!selectedClient) { const e = B.$('.error', clientPick); e.textContent = 'Choisissez un client.'; e.hidden = false; return; }
      if (!v.name) { ui().showErrors(form, { name: 'Indiquez le nom du chantier.' }); return; }
      B.$$('[data-b]', budgetBox).forEach(function (i) { budget[i.dataset.b] = ui().moneyValue(i); });
      const payload = Object.assign({}, v, {
        client_id: selectedClient.id, budget: budget,
        quote_total: ui().moneyValue(B.$('[name="quote_total"]', form))
      });
      const row = isEdit ? B.projectService.update(project.id, Object.assign(payload, { progress: Number(payload.progress || project.progress || 0) }))
        : B.projectService.create(payload);
      m.close();
      ui().toast(isEdit ? 'Chantier mis à jour.' : 'Chantier créé avec succès.', 'success');
      if (done) done(row);
      B.router.refresh();
    });
    return m;
  }

  /* --------------------------- Sélection d'article ------------------------ */
  function catalogPicker(opts) {
    const o = opts || {};
    return new Promise(function (resolve) {
      const m = ui().modal({ title: "Ajouter un élément", size: 'wide' });
      const body = B.el('<div class="stack"></div>');
      const prof = B.session.profession();
      const head = B.el('<div class="banner banner-info">' + ui().icon('sparkles', 18) +
        '<span>Catalogue <strong>' + h(prof.name) + '</strong> — adapté à votre métier.</span></div>');
      body.appendChild(head);
      const search = B.el('<div class="search">' + ui().icon('search', 18) + '<input placeholder="Rechercher : ciment, sable, fer…" aria-label="Rechercher un article"></div>');
      body.appendChild(search);
      const chips = B.el('<div class="chip-scroll"></div>');
      chips.innerHTML = '<button class="chip active" data-cat="all">Tous</button>' +
        '<button class="chip" data-cat="favoris">' + ui().icon('star', 14) + ' Favoris</button>' +
        B.CATALOG_CATEGORIES.map(function (c) { return '<button class="chip" data-cat="' + c.id + '">' + h(c.label) + '</button>'; }).join('');
      body.appendChild(chips);
      const list = B.el('<div class="stack-sm"></div>');
      body.appendChild(list);
      const createBtn = B.el('<button class="btn btn-ghost btn-block">' + ui().icon('plus', 18) + ' Créer un nouvel article</button>');
      body.appendChild(createBtn);
      m.body.appendChild(body);
      if (m.foot) m.foot.remove();

      let cat = 'all';
      function paint() {
        const term = B.$('input', search).value;
        let rows = term ? B.catalogService.search(term) : B.catalogService.list();
        if (cat === 'favoris') rows = rows.filter(function (r) { return r.favorite; });
        else if (cat !== 'all') rows = rows.filter(function (r) { return r.category === cat; });
        rows = rows.slice(0, 60);
        list.innerHTML = '';
        if (!rows.length) {
          list.appendChild(ui().emptyState({ icon: 'box', title: 'Aucun article', text: 'Essayez un autre mot ou créez votre propre article.' }));
          return;
        }
        rows.forEach(function (it) {
          const sugg = B.catalogService.suggestedPrice(it.id);
          const row = B.el('<button class="picker-item"></button>');
          row.innerHTML = '<div class="avatar" style="width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:var(--primary-soft);color:var(--primary-dark)">' + ui().icon(it.favorite ? 'star' : 'box', 17) + '</div>' +
            '<div class="grow"><div class="strong small">' + h(it.name) + '</div>' +
            '<div class="tiny muted">' + h(B.catalogCategory(it.category).label) + ' · ' + h(B.unitLabel(it.unit)) +
            (sugg.source === 'last' ? ' · <span class="price-flag">Prix habituel</span>' : '') + '</div></div>' +
            '<div class="price"><div class="strong mono">' + B.money(sugg.price) + '</div><div class="tiny muted">' + (sugg.source === 'last' ? 'dernier prix' : 'prix catalogue') + '</div></div>';
          row.addEventListener('click', function () {
            m.close();
            resolve({ item: it, price: sugg.price, unit: it.unit, name: it.name, source: sugg.source });
          });
          list.appendChild(row);
        });
      }
      B.$('input', search).addEventListener('input', B.debounce(paint, 110));
      B.on(chips, 'click', '.chip', function (e, btn) {
        cat = btn.dataset.cat;
        B.$$('.chip', chips).forEach(function (c) { c.classList.remove('active'); });
        btn.classList.add('active');
        paint();
      });
      paint();

      createBtn.addEventListener('click', function () {
        m.close();
        catalogItemForm(null, function (created) {
          if (created) resolve({ item: created, price: created.last_price != null ? created.last_price : created.default_price, unit: created.unit, name: created.name, source: 'catalog' });
        });
      });
      m.onClose = function () { resolve(null); };
    });
  }

  function catalogItemForm(item, done) {
    const isEdit = !!item;
    const form = B.el('<form class="form-grid" novalidate></form>');
    form.appendChild(ui().field({ label: 'Nom de l’article', name: 'name', required: true, value: item ? item.name : '', placeholder: 'Ex : Ciment CPJ 45' }));
    form.appendChild(ui().field({ label: 'Prix unitaire', name: 'default_price', type: 'money', value: item ? item.default_price : '' }));
    form.appendChild(ui().field({
      label: 'Unité', name: 'unit', type: 'select', value: item ? item.unit : 'unité',
      options: B.UNITS.map(function (u) { return { value: u.id, label: u.label }; })
    }));
    form.appendChild(ui().field({
      label: 'Catégorie', name: 'category', type: 'select', value: item ? item.category : 'materiaux',
      options: B.CATALOG_CATEGORIES.map(function (c) { return { value: c.id, label: c.label }; })
    }));
    form.appendChild(ui().field({ label: 'Mots-clés (facultatif)', name: 'keywords', value: item ? item.keywords : '', hint: 'Pour retrouver l’article facilement dans la recherche.' }));
    const fav = B.el('<label class="switch"><input type="checkbox" name="favorite"' + (item && item.favorite ? ' checked' : '') + '><span>Marquer comme favori</span></label>');
    form.appendChild(fav);
    const m = ui().modal({ title: isEdit ? 'Modifier l’article' : 'Nouvel article', body: form, size: 'wide' });
    const save = B.el('<button class="btn btn-primary">' + (isEdit ? 'Enregistrer' : 'Créer l’article') + '</button>');
    const cancel = B.el('<button class="btn btn-ghost" data-close>Annuler</button>');
    m.foot.appendChild(cancel); m.foot.appendChild(save);
    save.addEventListener('click', function () {
      const v = ui().formValues(form);
      if (!v.name) { ui().showErrors(form, { name: 'Indiquez le nom de l’article.' }); return; }
      v.default_price = ui().moneyValue(B.$('[name="default_price"]', form));
      const row = isEdit ? B.catalogService.update(item.id, v) : B.catalogService.create(v);
      m.close();
      ui().toast(isEdit ? 'Article mis à jour.' : 'Article ajouté au catalogue.', 'success');
      if (done) done(row);
      B.router.refresh();
    });
    return m;
  }

  /* ------------------------------ Éditeur de lignes ----------------------- */
  function lineEditor(line, opts) {
    const o = opts || {};
    const row = B.el('<div class="line-row"></div>');
    const sugg = line.catalog_item_id ? B.catalogService.suggestedPrice(line.catalog_item_id) : null;
    row.innerHTML = `
      <div class="top">
        <div class="grow">
          <div class="desc">${h(line.description || 'Nouvel élément')}</div>
          <div class="tiny muted">${line.catalog_item_id ? 'Article du catalogue' : 'Élément libre'}
            ${sugg && sugg.source === 'last' && line.unit_price === sugg.price ? ' · <span class="price-flag">Prix habituel</span>' : ''}</div>
        </div>
        <button class="iconbtn" data-del aria-label="Supprimer la ligne">${ui().icon('trash', 17)}</button>
      </div>
      <div class="qty-grid">
        <div><label class="tiny muted" for="q_${line.id}">Quantité</label>
          <input class="input" id="q_${line.id}" data-q type="number" min="0" step="0.01" value="${line.quantity != null ? line.quantity : 1}" inputmode="decimal"></div>
        <div><label class="tiny muted" for="u_${line.id}">Unité</label>
          <select class="select" id="u_${line.id}" data-u>${B.UNITS.map(function (u) { return '<option value="' + u.id + '"' + (line.unit === u.id ? ' selected' : '') + '>' + h(u.label) + '</option>'; }).join('')}</select></div>
        <div><label class="tiny muted" for="p_${line.id}">Prix unitaire (FCFA)</label>
          <input class="input money-input" id="p_${line.id}" data-p inputmode="numeric" value="${line.unit_price ? B.num(line.unit_price) : ''}" data-raw="${line.unit_price || ''}"></div>
      </div>
      <div class="row-between">
        <button class="btn btn-ghost btn-sm" data-edit>${ui().icon('edit', 15)} Modifier la description</button>
        <div class="total" data-total>${B.money(B.calc.calculateLineTotal(line))}</div>
      </div>`;
    const qty = B.$('[data-q]', row), unit = B.$('[data-u]', row), price = B.$('[data-p]', row), total = B.$('[data-total]', row);
    ui().bindMoneyInputs(row);
    function sync() {
      line.quantity = B.parseNumber(qty.value);
      line.unit = unit.value;
      line.unit_price = ui().moneyValue(price);
      line.total = B.calc.calculateLineTotal(line);
      total.textContent = B.money(line.total);
      if (o.onChange) o.onChange();
    }
    qty.addEventListener('input', sync);
    unit.addEventListener('change', sync);
    price.addEventListener('input', sync);
    B.$('[data-del]', row).addEventListener('click', async function () {
      const ok = await ui().confirm({ title: 'Supprimer cette ligne ?', message: line.description, confirmLabel: 'Supprimer', tone: 'danger' });
      if (ok) { row.remove(); if (o.onRemove) o.onRemove(line); }
    });
    B.$('[data-edit]', row).addEventListener('click', function () {
      const f = B.el('<form class="form-grid"><div class="field"><label for="desc_' + line.id + '">Description</label><input class="input" id="desc_' + line.id + '" value="' + h(line.description) + '"></div></form>');
      const m = ui().modal({ title: 'Description de la ligne', body: f });
      const ok = B.el('<button class="btn btn-primary">Valider</button>');
      ok.addEventListener('click', function () {
        line.description = B.$('input', f).value.trim() || line.description;
        B.$('.desc', row).textContent = line.description;
        m.close();
        if (o.onChange) o.onChange();
      });
      m.foot.appendChild(ok);
    });
    return row;
  }

  /* ------------------------------ Récapitulatif --------------------------- */
  function totalsBox(doc, onChange) {
    const settings = B.session.settings();
    const box = B.el('<div class="totals-box"></div>');
    function paint() {
      const t = B.calc.calculateDocumentTotals(doc, settings);
      const taxOn = settings.tax_enabled !== false && Number(settings.tax_rate) > 0 && settings.tax_mode !== 'none';
      box.innerHTML = '';
      box.appendChild(B.el('<div class="line"><span>Sous-total</span><span class="pill-num">' + B.money(t.subtotal) + '</span></div>'));

      /* Remise */
      const discountRow = B.el('<div class="row" style="gap:8px"><span class="grow small muted">Remise</span>' +
        '<select class="select" style="width:92px;min-height:38px;padding:6px 8px" data-dmode>' +
        '<option value="amount"' + (doc.discount.mode === 'amount' ? ' selected' : '') + '>FCFA</option>' +
        '<option value="percent"' + (doc.discount.mode === 'percent' ? ' selected' : '') + '>%</option></select>' +
        '<input class="input" style="width:110px;min-height:38px;padding:6px 8px" data-dvalue inputmode="numeric" value="' + (doc.discount.value || '') + '"></div>');
      B.$('[data-dmode]', discountRow).addEventListener('change', function () { doc.discount.mode = this.value; paint(); onChange && onChange(); });
      B.$('[data-dvalue]', discountRow).addEventListener('input', function () {
        doc.discount.value = B.parseNumber(this.value);
        const t2 = B.calc.calculateDocumentTotals(doc, settings);
        B.$('[data-dtotal]', box).textContent = B.money(t2.discount);
        onChange && onChange();
      });
      box.appendChild(discountRow);
      if (t.discount) box.appendChild(B.el('<div class="line small muted"><span>Remise appliquée</span><span data-dtotal>' + B.money(t.discount) + '</span></div>'));

      if (taxOn) box.appendChild(B.el('<div class="line small muted"><span>' + h(settings.tax_name || 'Taxe') + ' (' + settings.tax_rate + ' %)' + (settings.tax_mode === 'inclusive' ? ' incluse' : '') + '</span><span>' + B.money(t.tax) + '</span></div>'));

      /* Acompte */
      const depRow = B.el('<div class="row" style="gap:8px"><span class="grow small muted">Acompte demandé</span>' +
        '<div class="input-group" style="width:170px"><input class="input money-input" style="min-height:38px;padding:6px 10px" data-deposit inputmode="numeric" value="' + (doc.deposit ? B.num(doc.deposit) : '') + '" data-raw="' + (doc.deposit || '') + '" placeholder="0"><span class="suffix">FCFA</span></div></div>');
      ui().bindMoneyInputs(depRow);
      B.$('[data-deposit]', depRow).addEventListener('input', function () {
        doc.deposit = ui().moneyValue(this);
        const t3 = B.calc.calculateDocumentTotals(doc, settings);
        B.$('[data-balance]', box).textContent = B.money(t3.balance);
        onChange && onChange();
      });
      box.appendChild(depRow);

      box.appendChild(B.el('<div class="line total"><span>Total</span><span class="pill-num">' + B.money(t.total) + '</span></div>'));
      box.appendChild(B.el('<div class="line small muted"><span>Reste à payer après acompte</span><span class="pill-num" data-balance>' + B.money(t.balance) + '</span></div>'));
      if (settings.tax_enabled === false || Number(settings.tax_rate) === 0) {
        box.appendChild(B.el('<div class="tiny muted">Aucune taxe appliquée. Vous pouvez activer la taxe dans Paramètres → Documents.</div>'));
      }
      ui().bindMoneyInputs(box);
    }
    paint();
    box.repaint = paint;
    return box;
  }

  /* --------------------------- Aperçu avant génération -------------------- */
  function documentPreview(entity, doc, opts) {
    const o = opts || {};
    const html = entity === 'quote' ? B.pdf.quoteHTML(doc) : B.pdf.invoiceHTML(doc);
    const body = B.el('<div></div>');
    const frame = document.createElement('iframe');
    frame.style.width = '100%';
    frame.style.height = '58vh';
    frame.style.border = '1px solid var(--line)';
    frame.style.borderRadius = '12px';
    frame.style.background = '#EEF2F6';
    frame.setAttribute('title', 'Aperçu du document');
    frame.srcdoc = html.replace(/<div class="no-print"[\s\S]*?<\/div>/, '');
    body.appendChild(frame);
    const m = ui().modal({ title: 'Aperçu du document', body: body, size: 'wide' });
    const print = B.el('<button class="btn btn-primary">' + ui().icon('download', 17) + ' Télécharger / Imprimer le PDF</button>');
    const share = B.el('<button class="btn btn-ghost">' + ui().icon('whatsapp', 17) + ' Partager</button>');
    const close = B.el('<button class="btn btn-ghost" data-close>Fermer</button>');
    m.foot.appendChild(close); m.foot.appendChild(share); m.foot.appendChild(print);
    print.addEventListener('click', function () { B.pdf.openPreview(html, { filename: doc.number || 'document' }); });
    share.addEventListener('click', function () { shareDialog(entity, doc); });
    return m;
  }

  /* --------------------------------- Partage ------------------------------ */
  function shareDialog(entity, doc) {
    const msg = B.pdf.shareMessage(entity, doc);
    const client = B.clientService.get(doc.client_id);
    const body = B.el('<div class="stack"></div>');
    body.innerHTML =
      '<div class="field"><label>Message préparé</label><textarea class="textarea" data-msg rows="5">' + h(msg) + '</textarea>' +
      '<div class="hint">Vous pouvez modifier le message avant de l’envoyer.</div></div>' +
      '<div class="banner banner-info">' + ui().icon('info', 18) + '<span>BATIYO prépare le message et ouvre WhatsApp si l’application est disponible sur cet appareil. Le PDF doit être joint manuellement depuis votre téléphone.</span></div>';
    const m = ui().modal({ title: 'Partager le document', body: body });
    const wa = B.el('<button class="btn btn-primary">' + ui().icon('whatsapp', 17) + ' Partager sur WhatsApp</button>');
    const copy = B.el('<button class="btn btn-ghost">' + ui().icon('copy', 17) + ' Copier le message</button>');
    const close = B.el('<button class="btn btn-ghost" data-close>Fermer</button>');
    m.foot.appendChild(close); m.foot.appendChild(copy); m.foot.appendChild(wa);
    wa.addEventListener('click', function () {
      const text = B.$('[data-msg]', body).value;
      const phone = client && client.phone ? client.phone : '';
      window.open(B.waLink(phone, text), '_blank', 'noopener');
      B.pdf.openPreview(entity === 'quote' ? B.pdf.quoteHTML(doc) : B.pdf.invoiceHTML(doc), { filename: doc.number });
      ui().toast('Message prêt. Pensez à joindre le PDF.', 'info');
      m.close();
    });
    copy.addEventListener('click', function () {
      B.copy(B.$('[data-msg]', body).value);
      ui().toast('Message copié.', 'success');
    });
    return m;
  }

  /* ------------------------- Confirmation de suppression ------------------ */
  function confirmDelete(label, onConfirm) {
    return ui().confirm({
      title: 'Supprimer ' + label + ' ?',
      message: 'Cette action ne pourra pas être annulée.',
      detail: 'L’historique de vos autres documents n’est pas modifié.',
      confirmLabel: 'Supprimer',
      tone: 'danger'
    }).then(function (ok) { if (ok && onConfirm) onConfirm(); return ok; });
  }

  /* ------------------------- Sélecteur de période (#153) ------------------ */
  function periodChips(current, onChange) {
    const el = B.el('<div class="chip-scroll"></div>');
    [['today', 'Aujourd’hui'], ['week', 'Cette semaine'], ['month', 'Ce mois'], ['year', 'Cette année'], ['all', 'Tout']].forEach(function (p) {
      const c = B.el('<button class="chip' + (current === p[0] ? ' active' : '') + '">' + h(p[1]) + '</button>');
      c.addEventListener('click', function () { onChange(p[0]); });
      el.appendChild(c);
    });
    return el;
  }

  B.components = {
    pickClient: pickClient, clientForm: clientForm,
    pickProject: pickProject, projectForm: projectForm,
    catalogPicker: catalogPicker, catalogItemForm: catalogItemForm,
    lineEditor: lineEditor, totalsBox: totalsBox,
    documentPreview: documentPreview, shareDialog: shareDialog,
    confirmDelete: confirmDelete, periodChips: periodChips
  };
})(globalThis.BATIYO = globalThis.BATIYO || {});
