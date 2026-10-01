/* =========================================================================
   BATIYO — 09. SERVICES (#90, #305)
   L'interface ne parle jamais directement aux données : elle passe par ici.
   Chaque service a une API stable qui restera identique avec Supabase.
   ========================================================================= */
(function (B) {
  'use strict';

  const repo = function () { return B.DataRepository.local; };
  const bid = function () { return B.session.businessId(); };
  const mine = function (rows) {
    const b = bid();
    return (rows || []).filter(function (r) { return !r.deleted_at && (!r.business_id || r.business_id === b); });
  };

  /* -------------------------------------------------------------------------
     dataScope — données strictement limitées à l'entreprise courante (#226, #243)
     ------------------------------------------------------------------------- */
  B.dataScope = function () {
    const b = bid();
    const scoped = function (table) {
      return repo().query(table, function (r) { return !r.business_id || r.business_id === b; });
    };
    return {
      business_id: b,
      clients: scoped('clients'),
      quotes: scoped('quotes'),
      invoices: scoped('invoices'),
      projects: scoped('projects'),
      expenses: scoped('expenses'),
      notifications: scoped('notifications')
    };
  };

  /* -------------------------------------------------------------------------
     professionService — le métier pilote l'expérience (#244)
     ------------------------------------------------------------------------- */
  B.professionService = {
    list: function () { return B.PROFESSIONS.filter(function (p) { return p.active; }); },
    flagship: function () { return B.FLAGSHIP_PROFESSIONS; },
    current: function () { return B.session.profession(); },
    get: function (id) { return B.getProfession(id); },
    templates: function (id) { return B.templatesFor(id || B.session.professionId()); },
    /* Résumé produit adapté au métier (#248, #249) */
    focus: function () {
      const p = B.session.profession();
      return {
        mode: p.mode,
        labels: p.mode === 'commerce'
          ? { quotes: 'Devis', projects: 'Ventes', expenses: 'Achats' }
          : { quotes: 'Devis', projects: 'Chantiers', expenses: 'Dépenses' },
        dashboard_focus: p.dashboard_focus
      };
    }
  };

  /* -------------------------------------------------------------------------
     catalogService — catalogue par métier (#72 → #76)
     ------------------------------------------------------------------------- */
  B.catalogService = {
    /* Articles visibles : catalogue du métier (global) + produits propres à l'entreprise */
    list: function (opts) {
      const o = opts || {};
      const prof = o.profession_id || B.session.professionId();
      const rows = repo().table('catalog_items').filter(function (it) {
        if (it.deleted_at || it.active === false) return false;
        if (it.business_id) return it.business_id === bid();
        return it.profession_id === prof;
      });
      return rows;
    },
    custom: function () {
      return repo().table('catalog_items').filter(function (it) {
        return !it.deleted_at && it.business_id === bid() && it.active !== false;
      });
    },
    byCategory: function (opts) {
      const groups = {};
      B.catalogService.list(opts).forEach(function (it) {
        (groups[it.category] = groups[it.category] || []).push(it);
      });
      return B.CATALOG_CATEGORIES
        .map(function (c) { return { category: c, items: (groups[c.id] || []).sort(sortItems) }; })
        .filter(function (g) { return g.items.length; });
    },
    search: function (q, opts) {
      const term = B.normalize(q);
      if (!term) return B.catalogService.list(opts).sort(sortItems);
      return B.catalogService.list(opts).filter(function (it) {
        return B.normalize(it.name).indexOf(term) >= 0 ||
          B.normalize(it.keywords || '').indexOf(term) >= 0 ||
          B.normalize(B.catalogCategory(it.category).label).indexOf(term) >= 0;
      }).sort(function (a, b) {
        const sa = B.normalize(a.name).indexOf(term) === 0 ? 0 : 1;
        const sb = B.normalize(b.name).indexOf(term) === 0 ? 0 : 1;
        return sa - sb || sortItems(a, b);
      });
    },
    get: function (id) { return repo().find('catalog_items', id); },
    create: function (data) {
      return repo().insert('catalog_items', {
        profession_id: B.session.professionId(),
        business_id: bid(),
        name: data.name,
        description: data.description || '',
        unit: data.unit || 'unité',
        default_price: B.parseNumber(data.default_price),
        category: data.category || 'materiaux',
        favorite: !!data.favorite,
        keywords: data.keywords || '',
        usage_count: 0,
        last_price: null,
        active: true
      });
    },
    update: function (id, patch) { return repo().update('catalog_items', id, patch); },
    remove: function (id) {
      const it = B.catalogService.get(id);
      if (it && it.business_id === bid()) return repo().remove('catalog_items', id, true);
      /* Les articles du catalogue métier sont désactivés, pas supprimés */
      return repo().update('catalog_items', id, { active: false });
    },
    toggleFavorite: function (id) {
      const it = B.catalogService.get(id);
      if (!it) return null;
      return repo().update('catalog_items', id, { favorite: !it.favorite });
    },
    /* Mémoire des prix (#34, #35) : ne s'applique jamais automatiquement,
       l'utilisateur voit une suggestion qu'il peut modifier. */
    rememberPrice: function (itemId, price) {
      const it = B.catalogService.get(itemId);
      if (!it) return null;
      return repo().update('catalog_items', it.id, {
        last_price: B.parseNumber(price),
        usage_count: (it.usage_count || 0) + 1,
        updated_usage_at: new Date().toISOString()
      });
    },
    /* Prix suggéré : dernier prix utilisé, sinon prix du catalogue */
    suggestedPrice: function (itemId) {
      const it = B.catalogService.get(itemId);
      if (!it) return null;
      if (it.last_price != null) return { price: it.last_price, source: 'last' };
      return { price: it.default_price, source: 'catalog' };
    },
    favorites: function () {
      return B.catalogService.list().filter(function (it) { return it.favorite; }).sort(sortItems);
    },
    /* Articles les plus utilisés (intelligence du métier, #209) */
    mostUsed: function (n) {
      return B.catalogService.list().slice().sort(function (a, b) {
        return (b.usage_count || 0) - (a.usage_count || 0) || sortItems(a, b);
      }).slice(0, n || 8);
    },
    categories: function () { return B.CATALOG_CATEGORIES; }
  };
  function sortItems(a, b) {
    if (!!b.favorite !== !!a.favorite) return b.favorite ? 1 : -1;
    return String(a.name).localeCompare(String(b.name), 'fr');
  }

  /* -------------------------------------------------------------------------
     clientService
     ------------------------------------------------------------------------- */
  B.clientService = {
    list: function () {
      return mine(repo().table('clients')).sort(function (a, b) {
        if (!!b.favorite !== !!a.favorite) return b.favorite ? 1 : -1;
        return String(a.name).localeCompare(String(b.name), 'fr');
      });
    },
    get: function (id) { return repo().find('clients', id); },
    create: function (data) {
      return repo().insert('clients', {
        business_id: bid(), name: (data.name || '').trim(), phone: data.phone || '', email: data.email || '',
        address: data.address || '', notes: data.notes || '', favorite: !!data.favorite
      });
    },
    update: function (id, patch) { return repo().update('clients', id, patch); },
    remove: function (id) { return repo().remove('clients', id, true); },
    toggleFavorite: function (id) {
      const c = B.clientService.get(id);
      return repo().update('clients', id, { favorite: !c.favorite });
    },
    search: function (q) {
      const t = B.normalize(q);
      if (!t) return B.clientService.list();
      return B.clientService.list().filter(function (c) {
        return B.normalize(c.name).indexOf(t) >= 0 || B.normalize(c.phone || '').indexOf(t) >= 0 || B.normalize(c.address || '').indexOf(t) >= 0;
      });
    },
    /* Fiche client : totaux + historique (#77, #78, #79) */
    detail: function (id) {
      const client = B.clientService.get(id);
      if (!client) return null;
      const quotes = mine(repo().table('quotes')).filter(function (q) { return q.client_id === id; })
        .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
      const invoices = mine(repo().table('invoices')).filter(function (i) { return i.client_id === id; })
        .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
      const projects = mine(repo().table('projects')).filter(function (p) { return p.client_id === id; });
      const expenses = mine(repo().table('expenses')).filter(function (e) {
        return projects.some(function (p) { return p.id === e.project_id; });
      });
      return {
        client: client, quotes: quotes, invoices: invoices, projects: projects, expenses: expenses,
        stats: {
          quotes_count: quotes.length,
          invoices_count: invoices.length,
          total_quoted: B.round(quotes.reduce(function (s, q) { return s + (Number(q.total) || 0); }, 0)),
          total_invoiced: B.round(invoices.reduce(function (s, i) { return s + (Number(i.total) || 0); }, 0)),
          total_paid: B.round(invoices.reduce(function (s, i) { return s + (Number(i.paid_amount) || 0); }, 0)),
          projects_count: projects.length,
          active_projects: projects.filter(function (p) { return B.ACTIVE_PROJECT_STATUSES.indexOf(p.status) >= 0; }).length
        }
      };
    },
    history: function (id) {
      const d = B.clientService.detail(id);
      if (!d) return [];
      const items = [];
      d.quotes.forEach(function (q) { items.push({ type: 'devis', id: q.id, number: q.number, date: q.date, amount: q.total, status: q.status, route: '#/quotes/' + q.id }); });
      d.invoices.forEach(function (i) { items.push({ type: 'facture', id: i.id, number: i.number, date: i.date, amount: i.total, status: i.status, route: '#/invoices/' + i.id }); });
      d.projects.forEach(function (p) { items.push({ type: 'chantier', id: p.id, number: p.name, date: p.start_date, amount: p.quote_total, status: p.status, route: '#/projects/' + p.id }); });
      return items.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    }
  };

  /* -------------------------------------------------------------------------
     quoteService
     ------------------------------------------------------------------------- */
  B.quoteService = {
    list: function (filters) {
      const f = filters || {};
      let rows = mine(repo().table('quotes'));
      if (f.status && f.status !== 'all') rows = rows.filter(function (q) { return q.status === f.status; });
      if (f.client_id) rows = rows.filter(function (q) { return q.client_id === f.client_id; });
      if (f.project_id) rows = rows.filter(function (q) { return q.project_id === f.project_id; });
      if (f.search) {
        const t = B.normalize(f.search);
        rows = rows.filter(function (q) {
          const c = B.clientService.get(q.client_id);
          return B.normalize(q.number).indexOf(t) >= 0 || (c && B.normalize(c.name).indexOf(t) >= 0);
        });
      }
      if (f.from || f.to) rows = rows.filter(function (q) { return B.inRange(q.date, f.from, f.to); });
      return rows.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)) || String(b.number).localeCompare(String(a.number)); });
    },
    get: function (id) { return repo().find('quotes', id); },
    empty: function () {
      return {
        client_id: null, project_id: null, date: B.today(),
        lines: [], discount: { mode: 'amount', value: 0 }, deposit: 0,
        notes: '', conditions: B.session.settings().payment_terms, status: 'brouillon',
        profession_id: B.session.professionId(), reference: ''
      };
    },
    /* Création / mise à jour avec recalcul complet côté logique métier (#261) */
    save: function (data, opts) {
      const o = opts || {};
      const settings = B.session.settings();
      const totals = B.calc.calculateDocumentTotals(data, settings);
      const payload = {
        business_id: bid(),
        client_id: data.client_id || null,
        project_id: data.project_id || null,
        profession_id: data.profession_id || B.session.professionId(),
        status: data.status || 'brouillon',
        date: data.date || B.today(),
        valid_until: B.addDays(data.date || B.today(), settings.valid_days || 30),
        lines: totals.lines.map(function (l) { return snapshotLine(l); }),
        subtotal: totals.subtotal,
        discount: data.discount || { mode: 'amount', value: 0 },
        tax: totals.tax,
        tax_label: totals.taxLabel,
        total: totals.total,
        deposit: totals.deposit,
        balance: totals.balance,
        notes: data.notes || '',
        conditions: data.conditions || settings.payment_terms,
        reference: data.reference || ''
      };
      if (data.id) {
        const prev = B.quoteService.get(data.id);
        const timeline = (prev.timeline || []).slice();
        if (payload.status !== prev.status) timeline.push({ at: new Date().toISOString(), label: 'Statut : ' + B.status(B.QUOTE_STATUSES, payload.status).label });
        payload.timeline = timeline;
        const updated = repo().update('quotes', data.id, payload, { versioned: true });
        B.bus.emit('quote:saved', updated);
        return updated;
      }
      payload.number = data.number || B.session.nextNumber('quote', payload.date);
      payload.timeline = [{ at: new Date().toISOString(), label: 'Devis créé' }];
      payload.version = 1;
      const created = repo().insert('quotes', payload);
      if (o.silent !== true) B.notificationService.add('document', 'Devis créé', 'Devis ' + created.number + ' créé avec succès.');
      B.bus.emit('quote:created', created);
      return created;
    },
    /* Un brouillon peut rester incomplet (#182) ; un devis validé exige un client (#259) */
    validate: function (data, opts) {
      const errors = {};
      const strict = !opts || opts.strict !== false;
      if (strict) {
        if (!data.client_id) errors.client_id = 'Choisissez un client.';
        if (!data.lines || !data.lines.length) errors.lines = 'Ajoutez au moins un élément au devis.';
        (data.lines || []).forEach(function (l, i) {
          if (!(Number(l.quantity) > 0)) errors['qty' + i] = 'La quantité doit être supérieure à 0.';
          if (!(Number(l.unit_price) >= 0)) errors['price' + i] = 'Le prix ne peut pas être négatif.';
        });
      }
      return { ok: Object.keys(errors).length === 0, errors: errors };
    },
    setStatus: function (id, status) {
      const q = B.quoteService.get(id);
      if (!q) return null;
      const timeline = (q.timeline || []).slice();
      timeline.push({ at: new Date().toISOString(), label: 'Statut : ' + B.status(B.QUOTE_STATUSES, status).label });
      const updated = repo().update('quotes', id, { status: status, timeline: timeline });
      if (status === 'accepte') B.notificationService.add('document', 'Devis accepté', 'Votre devis ' + q.number + ' a été accepté.');
      if (status === 'refuse') B.notificationService.add('document', 'Devis refusé', 'Votre devis ' + q.number + ' a été refusé.');
      B.bus.emit('quote:status', updated);
      return updated;
    },
    duplicate: function (id) {
      const q = B.quoteService.get(id);
      if (!q) return null;
      const copy = JSON.parse(JSON.stringify(q));
      delete copy.id;
      copy.number = B.session.nextNumber('quote', B.today());
      copy.date = B.today();
      copy.status = 'brouillon';
      copy.version = 1;
      copy.timeline = [{ at: new Date().toISOString(), label: 'Devis dupliqué depuis ' + q.number }];
      copy.lines.forEach(function (l) { l.id = B.uid('li'); });
      return repo().insert('quotes', copy);
    },
    remove: function (id) { return repo().remove('quotes', id, true); },
    /* Conversion devis → facture : copie complète, aucun lien dynamique (#44, #265) */
    convertToInvoice: function (quoteId, opts) {
      const o = opts || {};
      const q = B.quoteService.get(quoteId);
      if (!q) return null;
      const invoice = B.invoiceService.create({
        client_id: q.client_id,
        project_id: q.project_id,
        quote_id: q.id,
        lines: JSON.parse(JSON.stringify(q.lines)).map(function (l) { l.id = B.uid('li'); return l; }),
        discount: q.discount,
        notes: o.notes || ('Facture issue du devis ' + q.number + '.'),
        conditions: q.conditions,
        deposit: 0,
        reference: q.number,
        due_days: o.due_days || 30,
        status: 'emise'
      });
      B.quoteService.setStatus(q.id, 'converti');
      B.notificationService.add('document', 'Facture créée', 'Facture ' + invoice.number + ' créée à partir du devis ' + q.number + '.');
      B.bus.emit('invoice:created', invoice);
      return invoice;
    },
    /* Devis depuis un modèle du métier (#189, #190) */
    fromTemplate: function (templateId, data) {
      const prof = B.session.profession();
      const tpl = (prof.templates || []).find(function (t) { return t.id === templateId; });
      if (!tpl) return null;
      const lines = tpl.items.map(function (ti) {
        const found = B.catalogService.search(ti.name)[0] || B.catalogService.list().find(function (i) { return B.normalize(i.name).indexOf(B.normalize(ti.name)) >= 0; });
        return {
          id: B.uid('li'),
          catalog_item_id: found ? found.id : null,
          description: ti.name,
          quantity: ti.qty,
          unit: ti.unit || (found ? found.unit : 'unité'),
          unit_price: found ? (found.last_price != null ? found.last_price : found.default_price) : 0
        };
      });
      const draft = Object.assign(B.quoteService.empty(), data || {}, { lines: lines });
      if (data && data.project_id) {
        const p = B.projectService.get(data.project_id);
        if (p && p.budget) draft.template_budget = p.budget;
      }
      draft.template_name = tpl.name;
      draft.template_budget = tpl.budget;
      return draft;
    },
    templates: function () { return B.professionService.templates(); },
    /* Dernier prix utilisé pour un article, pour suggérer sans imposer (#35) */
    priceSuggestion: function (catalogItemId) { return B.catalogService.suggestedPrice(catalogItemId); }
  };
  function snapshotLine(l) {  /* #263 : le devis garde sa propre copie */
    return {
      id: l.id || B.uid('li'),
      catalog_item_id: l.catalog_item_id || null,
      description: l.description || '',
      quantity: Number(l.quantity) || 0,
      unit: l.unit || 'unité',
      unit_price: Number(l.unit_price) || 0,
      total: B.calc.calculateLineTotal(l),
      note: l.note || ''
    };
  }

  /* -------------------------------------------------------------------------
     invoiceService
     ------------------------------------------------------------------------- */
  B.invoiceService = {
    list: function (filters) {
      const f = filters || {};
      let rows = mine(repo().table('invoices'));
      if (f.status && f.status !== 'all') {
        rows = rows.filter(function (i) { return B.calc.invoiceSummary(i).status === f.status; });
      }
      if (f.client_id) rows = rows.filter(function (i) { return i.client_id === f.client_id; });
      if (f.project_id) rows = rows.filter(function (i) { return i.project_id === f.project_id; });
      if (f.search) {
        const t = B.normalize(f.search);
        rows = rows.filter(function (i) {
          const c = B.clientService.get(i.client_id);
          return B.normalize(i.number).indexOf(t) >= 0 || (c && B.normalize(c.name).indexOf(t) >= 0);
        });
      }
      return rows.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    },
    get: function (id) { return repo().find('invoices', id); },
    empty: function () {
      return {
        client_id: null, project_id: null, date: B.today(), lines: [],
        discount: { mode: 'amount', value: 0 }, notes: '', conditions: B.session.settings().payment_terms, status: 'brouillon'
      };
    },
    create: function (data) {
      const settings = B.session.settings();
      const totals = B.calc.calculateDocumentTotals({
        lines: data.lines || [],
        discount: data.discount || { mode: 'amount', value: 0 },
        deposit: data.deposit || 0
      }, settings);
      const invoice = repo().insert('invoices', {
        business_id: bid(),
        client_id: data.client_id || null,
        project_id: data.project_id || null,
        quote_id: data.quote_id || null,
        number: data.number || B.session.nextNumber('invoice', data.date || B.today()),
        date: data.date || B.today(),
        due_date: B.addDays(data.date || B.today(), data.due_days || 30),
        status: data.status || 'emise',
        lines: totals.lines.map(snapshotLine),
        subtotal: totals.subtotal,
        discount: data.discount || { mode: 'amount', value: 0 },
        tax: totals.tax,
        total: totals.total,
        paid_amount: 0,
        payments: [],
        notes: data.notes || '',
        conditions: data.conditions || settings.payment_terms,
        reference: data.reference || '',
        version: 1
      });
      B.bus.emit('invoice:created', invoice);
      return invoice;
    },
    update: function (id, data) {
      const settings = B.session.settings();
      const totals = B.calc.calculateDocumentTotals(data, settings);
      return repo().update('invoices', id, {
        client_id: data.client_id, project_id: data.project_id, date: data.date,
        due_date: data.due_date || B.addDays(data.date, 30),
        lines: totals.lines.map(snapshotLine), subtotal: totals.subtotal,
        discount: data.discount, tax: totals.tax, total: totals.total,
        notes: data.notes, conditions: data.conditions, status: data.status
      }, { versioned: true });
    },
    duplicate: function (id) {
      const i = B.invoiceService.get(id);
      if (!i) return null;
      const copy = JSON.parse(JSON.stringify(i));
      delete copy.id;
      copy.number = B.session.nextNumber('invoice', B.today());
      copy.date = B.today();
      copy.due_date = B.addDays(B.today(), 30);
      copy.status = 'brouillon';
      copy.paid_amount = 0;
      copy.payments = [];
      copy.lines.forEach(function (l) { l.id = B.uid('li'); });
      return repo().insert('invoices', copy);
    },
    remove: function (id) { return repo().remove('invoices', id, true); },
    setStatus: function (id, status) {
      const updated = repo().update('invoices', id, { status: status });
      B.bus.emit('invoice:status', updated);
      return updated;
    },
    /* Suivi manuel des paiements (#271, #272) — aucun paiement en ligne */
    addPayment: function (id, payment) {
      const inv = B.invoiceService.get(id);
      if (!inv) return null;
      const payments = (inv.payments || []).concat([{
        id: B.uid('pay'), date: payment.date || B.today(),
        amount: B.parseNumber(payment.amount), method: payment.method || 'Espèces', note: payment.note || ''
      }]);
      const paid = B.round(payments.reduce(function (s, p) { return s + p.amount; }, 0));
      const updated = repo().update('invoices', id, { payments: payments, paid_amount: paid });
      B.notificationService.add('payment', 'Paiement enregistré', 'Paiement de ' + B.money(payment.amount) + ' enregistré sur la facture ' + inv.number + '.');
      B.bus.emit('invoice:payment', updated);
      return updated;
    },
    summary: function (invoice) { return B.calc.invoiceSummary(invoice, B.session.settings()); },
    /* Facture connectée au chantier (#47) */
    context: function (id) {
      const inv = B.invoiceService.get(id);
      if (!inv) return null;
      const project = inv.project_id ? B.projectService.get(inv.project_id) : null;
      const quote = inv.quote_id ? B.quoteService.get(inv.quote_id) : null;
      const expenses = project ? B.expenseService.list({ project_id: project.id }) : [];
      const projectData = project ? B.projectService.detail(project.id) : null;
      return { invoice: inv, project: project, quote: quote, expenses: expenses, summary: B.calc.invoiceSummary(inv), project_summary: projectData ? projectData.summary : null };
    }
  };

  /* -------------------------------------------------------------------------
     projectService — chantiers
     ------------------------------------------------------------------------- */
  B.projectService = {
    list: function (filters) {
      const f = filters || {};
      let rows = mine(repo().table('projects'));
      if (f.status && f.status !== 'all') {
        rows = rows.filter(function (p) {
          if (f.status === 'actifs') return B.ACTIVE_PROJECT_STATUSES.indexOf(p.status) >= 0;
          return p.status === f.status;
        });
      }
      if (f.client_id) rows = rows.filter(function (p) { return p.client_id === f.client_id; });
      if (f.search) {
        const t = B.normalize(f.search);
        rows = rows.filter(function (p) { return B.normalize(p.name).indexOf(t) >= 0 || B.normalize(p.address || '').indexOf(t) >= 0; });
      }
      if (f.hide_archived !== false) rows = rows.filter(function (p) { return !p.archived; });
      return rows.sort(function (a, b) { return String(b.start_date || '').localeCompare(String(a.start_date || '')); });
    },
    get: function (id) { return repo().find('projects', id); },
    create: function (data) {
      const budget = data.budget || {};
      const contract = B.parseNumber(data.quote_total);
      const p = repo().insert('projects', {
        business_id: bid(),
        client_id: data.client_id || null,
        name: (data.name || '').trim(),
        address: data.address || '',
        description: data.description || '',
        status: data.status || 'planifie',
        quote_total: contract,
        budget: budget,
        baseline_margin: contract - B.calc.calculateBudgetTotal(budget),
        progress: B.clamp(Number(data.progress) || 0, 0, 100),
        start_date: data.start_date || B.today(),
        end_date: data.end_date || B.addDays(data.start_date || B.today(), 60),
        notes: data.notes || '',
        payments: [],
        archived: false,
        photos: []
      });
      B.notificationService.add('project', 'Chantier créé', 'Le chantier « ' + p.name + ' » a été créé.');
      B.bus.emit('project:created', p);
      return p;
    },
    update: function (id, patch) { return repo().update('projects', id, patch); },
    remove: function (id) { return repo().remove('projects', id, true); },
    archive: function (id, archived) { return repo().update('projects', id, { archived: archived !== false }); },
    setProgress: function (id, progress) { return repo().update('projects', id, { progress: B.clamp(Number(progress) || 0, 0, 100) }); },
    /* Création du chantier à partir d'un devis accepté (#111, #112) */
    createFromQuote: function (quoteId, opts) {
      const o = opts || {};
      const q = B.quoteService.get(quoteId);
      if (!q) return null;
      const prof = B.getProfession(q.profession_id || B.session.professionId());
      const budget = o.budget || B.calc.budgetFromQuote(q, q.lines, prof, B.session.settings());
      const client = B.clientService.get(q.client_id);
      const project = B.projectService.create({
        client_id: q.client_id,
        name: o.name || ('Chantier ' + (client ? client.name : q.number)),
        address: o.address || (client ? client.address : ''),
        description: o.description || q.notes || ('Travaux issus du devis ' + q.number),
        status: 'en_cours',
        quote_total: q.total,
        budget: budget,
        progress: 0,
        start_date: o.start_date || B.today(),
        end_date: o.end_date || B.addDays(o.start_date || B.today(), 60),
        notes: 'Budget prévisionnel généré depuis le devis ' + q.number + '.'
      });
      repo().update('quotes', q.id, { project_id: project.id });
      B.notificationService.add('project', 'Chantier créé depuis un devis', 'Le chantier « ' + project.name + ' » a été créé à partir du devis ' + q.number + '.');
      return project;
    },
    /* Détail complet d'un chantier (#313) */
    detail: function (id) {
      const project = B.projectService.get(id);
      if (!project) return null;
      const expenses = B.expenseService.list({ project_id: id });
      const quotes = B.quoteService.list({ project_id: id });
      const invoices = B.invoiceService.list({ project_id: id });
      const photos = B.photoService.list({ project_id: id });
      const summary = B.calc.projectSummary(project, expenses, B.session.settings());
      const alerts = B.calc.buildAlerts(project, summary);
      return {
        project: project, expenses: expenses, quotes: quotes, invoices: invoices, photos: photos,
        summary: summary, alerts: alerts,
        client: B.clientService.get(project.client_id),
        documents: B.documentService.list({ project_id: id })
      };
    },
    /* Chantiers nécessitant une attention particulière (#23, #57) */
    watchlist: function (limit) {
      const rows = B.projectService.list({ status: 'actifs' }).map(function (p) {
        const expenses = B.expenseService.list({ project_id: p.id });
        const summary = B.calc.projectSummary(p, expenses, B.session.settings());
        return { project: p, summary: summary, alerts: B.calc.buildAlerts(p, summary) };
      });
      const rank = { depassement: 0, attention: 1, normal: 2 };
      rows.sort(function (a, b) {
        return rank[a.summary.status.id] - rank[b.summary.status.id] ||
          (a.summary.budget_total ? b.summary.spent / b.summary.budget_total - a.summary.spent / a.summary.budget_total : 0);
      });
      return limit ? rows.slice(0, limit) : rows;
    },
    addPayment: function (id, payment) {
      const p = B.projectService.get(id);
      const payments = (p.payments || []).concat([{
        id: B.uid('pay'), date: payment.date || B.today(), amount: B.parseNumber(payment.amount),
        method: payment.method || 'Espèces', note: payment.note || ''
      }]);
      return repo().update('projects', id, { payments: payments });
    }
  };

  /* -------------------------------------------------------------------------
     expenseService
     ------------------------------------------------------------------------- */
  B.expenseService = {
    list: function (filters) {
      const f = filters || {};
      let rows = mine(repo().table('expenses'));
      if (f.project_id) rows = rows.filter(function (e) { return e.project_id === f.project_id; });
      if (f.category && f.category !== 'all') rows = rows.filter(function (e) { return e.category === f.category; });
      if (f.line && f.line !== 'all') rows = rows.filter(function (e) { return B.calc.budgetLineOf(e) === f.line; });
      if (f.from || f.to) rows = rows.filter(function (e) { return B.inRange(e.date, f.from, f.to); });
      if (f.search) {
        const t = B.normalize(f.search);
        rows = rows.filter(function (e) {
          return B.normalize(e.description).indexOf(t) >= 0 || B.normalize(e.supplier_name || '').indexOf(t) >= 0 || B.normalize(e.number).indexOf(t) >= 0;
        });
      }
      return rows.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)) || String(b.number).localeCompare(String(a.number)); });
    },
    get: function (id) { return repo().find('expenses', id); },
    empty: function () { return { category: 'materiaux', amount: '', date: B.today(), project_id: null, supplier_name: '', description: '', receipt: null, notes: '' }; },
    /* Suggestion de poste budgétaire (déterministe, jamais bloquante) */
    suggestBudgetLine: function (description, category) {
      return B.calc.budgetLineOf({ description: description, category: category });
    },
    create: function (data) {
      const e = repo().insert('expenses', {
        business_id: bid(),
        number: B.session.nextNumber('expense', data.date || B.today()),
        project_id: data.project_id || null,
        category: data.category || 'autres',
        budget_line: data.budget_line || B.expenseService.suggestBudgetLine(data.description, data.category),
        amount: B.parseNumber(data.amount),
        description: data.description || '',
        date: data.date || B.today(),
        supplier_name: data.supplier_name || '',
        supplier_id: data.supplier_id || null,
        receipt: data.receipt || null,
        notes: data.notes || ''
      });
      B.notificationService.add('budget', 'Dépense enregistrée', 'Dépense de ' + B.money(e.amount) + ' enregistrée.');
      B.bus.emit('expense:created', e);
      B.budgetWatch.check(e.project_id);
      return e;
    },
    update: function (id, patch) {
      if (patch.amount != null) patch.amount = B.parseNumber(patch.amount);
      if (patch.description != null && !patch.budget_line) patch.budget_line = B.expenseService.suggestBudgetLine(patch.description, patch.category);
      const e = repo().update('expenses', id, patch);
      B.bus.emit('expense:updated', e);
      B.budgetWatch.check(e.project_id);
      return e;
    },
    remove: function (id) {
      const e = B.expenseService.get(id);
      const projectId = e ? e.project_id : null;
      const res = repo().remove('expenses', id, true);
      B.bus.emit('expense:removed', { id: id });
      B.budgetWatch.check(projectId);
      return res;
    },
    totals: function (filters) { return B.calc.calculateSums(B.expenseService.list(filters)); },
    byCategory: function (filters) { return B.calc.expensesByCategory(B.expenseService.list(filters)); },
    categories: function () { return B.EXPENSE_CATEGORIES; }
  };

  /* -------------------------------------------------------------------------
     budgetWatch — alertes de dépassement (#57, #206)
     ------------------------------------------------------------------------- */
  B.budgetWatch = {
    check: function (projectId) {
      if (!projectId) return;
      const p = B.projectService.get(projectId);
      if (!p) return;
      const expenses = B.expenseService.list({ project_id: projectId });
      const summary = B.calc.projectSummary(p, expenses, B.session.settings());
      const alerts = B.calc.buildAlerts(p, summary);
      const serious = alerts.filter(function (a) { return a.tone === 'danger'; })[0];
      if (serious) {
        const key = 'alert_' + projectId + '_' + serious.line;
        const already = B.notificationService.list().some(function (n) { return n.key === key; });
        if (!already) B.notificationService.add('budget', serious.level + ' — budget', serious.message, { key: key, project_id: projectId });
      }
      if (summary.margin_alert) {
        const key = 'margin_' + projectId;
        const already = B.notificationService.list().some(function (n) { return n.key === key; });
        if (!already) {
          B.notificationService.add('budget', 'Marge prévue en baisse',
            'La marge prévue a diminué en raison des dépenses supplémentaires sur « ' + p.name + ' ».',
            { key: key, project_id: projectId });
        }
      }
    },
    scanAll: function () {
      B.projectService.list({ status: 'actifs' }).forEach(function (p) { B.budgetWatch.check(p.id); });
    }
  };

  /* -------------------------------------------------------------------------
     photoService & documentService (#69, #70, #71, #217 → #223, #236, #238)
     ------------------------------------------------------------------------- */
  B.photoService = {
    list: function (filters) {
      const f = filters || {};
      return mine(repo().table('photos')).filter(function (p) {
        if (f.project_id && p.project_id !== f.project_id) return false;
        if (f.type && p.type !== f.type) return false;
        return true;
      }).sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
    },
    add: function (data) {
      return repo().insert('photos', {
        business_id: bid(), project_id: data.project_id || null, type: data.type || 'chantier',
        title: data.title || 'Photo', file_url: data.file_url, date: data.date || B.today(), notes: data.notes || ''
      });
    },
    replace: function (id, fileUrl) { return repo().update('photos', id, { file_url: fileUrl, date: B.today() }); },
    remove: function (id) { return repo().remove('photos', id, true); }
  };

  B.documentService = {
    list: function (filters) {
      const f = filters || {};
      const docs = [];
      mine(repo().table('quotes')).forEach(function (q) {
        docs.push({
          id: 'q_' + q.id, entity: 'quote', entity_id: q.id, type: 'Devis', number: q.number,
          title: 'Devis ' + (B.clientService.get(q.client_id) ? B.clientService.get(q.client_id).name : ''),
          client_id: q.client_id, project_id: q.project_id, date: q.date, amount: q.total,
          status: q.status, status_list: 'quotes', route: '#/quotes/' + q.id, version: q.version || 1
        });
      });
      mine(repo().table('invoices')).forEach(function (i) {
        const s = B.calc.invoiceSummary(i);
        docs.push({
          id: 'i_' + i.id, entity: 'invoice', entity_id: i.id, type: 'Facture', number: i.number,
          title: 'Facture ' + (B.clientService.get(i.client_id) ? B.clientService.get(i.client_id).name : ''),
          client_id: i.client_id, project_id: i.project_id, date: i.date, amount: i.total,
          status: s.status, status_list: 'invoices', paid: i.paid_amount, remaining: s.remaining,
          route: '#/invoices/' + i.id, version: i.version || 1
        });
      });
      mine(repo().table('expenses')).filter(function (e) { return !!e.receipt; }).forEach(function (e) {
        docs.push({
          id: 'e_' + e.id, entity: 'expense', entity_id: e.id, type: 'Justificatif', number: e.number,
          title: e.description, project_id: e.project_id, date: e.date, amount: e.amount,
          status: 'recu', status_list: 'expenses', route: '#/expenses', version: 1
        });
      });
      let rows = docs;
      if (f.project_id) rows = rows.filter(function (d) { return d.project_id === f.project_id; });
      if (f.type && f.type !== 'all') rows = rows.filter(function (d) { return d.type === f.type; });
      if (f.tab && f.tab !== 'all') {
        if (f.tab === 'brouillons') rows = rows.filter(function (d) { return d.status === 'brouillon'; });
        else if (f.tab === 'acceptes') rows = rows.filter(function (d) { return d.status === 'accepte' || d.status === 'converti'; });
        else if (f.tab === 'payes') rows = rows.filter(function (d) { return d.status === 'payee' || (d.paid && d.amount && d.paid >= d.amount); });
      }
      if (f.search) {
        const t = B.normalize(f.search);
        rows = rows.filter(function (d) {
          const c = d.client_id ? B.clientService.get(d.client_id) : null;
          return B.normalize(d.number).indexOf(t) >= 0 || B.normalize(d.title).indexOf(t) >= 0 || (c && B.normalize(c.name).indexOf(t) >= 0);
        });
      }
      return rows.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    },
    register: function (data) {
      return repo().insert('documents', Object.assign({ business_id: bid(), generated: true }, data));
    }
  };

  /* -------------------------------------------------------------------------
     notificationService (#82)
     ------------------------------------------------------------------------- */
  B.notificationService = {
    list: function () {
      return mine(repo().table('notifications')).sort(function (a, b) {
        return String(b.created_at || '').localeCompare(String(a.created_at || ''));
      });
    },
    add: function (type, title, message, meta) {
      const n = repo().insert('notifications', Object.assign({
        business_id: bid(), type: type || 'info', title: title, message: message,
        read: false, date: B.today(), created_at: new Date().toISOString()
      }, meta || {}));
      B.bus.emit('notification:new', n);
      return n;
    },
    unread: function () { return B.notificationService.list().filter(function (n) { return !n.read; }); },
    markRead: function (id) { return repo().update('notifications', id, { read: true }); },
    markAllRead: function () { B.notificationService.list().forEach(function (n) { if (!n.read) repo().update('notifications', n.id, { read: true }); }); }
  };

  /* -------------------------------------------------------------------------
     analysisService (#154, #155, #156)
     ------------------------------------------------------------------------- */
  B.analysisService = {
    range: function (period, from, to) { return B.periodRange(period, from, to); },
    overview: function (period, from, to) {
      const r = B.periodRange(period, from, to);
      const quotes = mine(repo().table('quotes')).filter(function (q) { return B.inRange(q.date, r.from, r.to); });
      const invoices = mine(repo().table('invoices')).filter(function (i) { return B.inRange(i.date, r.from, r.to); });
      const expenses = mine(repo().table('expenses')).filter(function (e) { return B.inRange(e.date, r.from, r.to); });
      const revenue = B.calc.calculateRevenue(quotes, invoices);
      const spent = B.calc.calculateSums(expenses);
      const projects = mine(repo().table('projects'));
      const activeProjects = projects.filter(function (p) { return B.ACTIVE_PROJECT_STATUSES.indexOf(p.status) >= 0; });
      const contracts = B.round(projects
        .filter(function (p) { return B.ACTIVE_PROJECT_STATUSES.indexOf(p.status) >= 0 || p.status === 'termine'; })
        .reduce(function (s, p) { return s + (Number(p.quote_total) || 0); }, 0));
      const estimated = B.round(activeProjects.reduce(function (s, p) {
        return s + B.calc.calculateEstimatedMargin(p.quote_total, B.calc.calculateBudgetTotal(p.budget));
      }, 0));
      return {
        range: r,
        revenue: revenue,
        spent: spent,
        margin: B.round(revenue - spent),
        margin_rate: B.calc.marginRate(revenue - spent, revenue),
        quotes_count: quotes.length,
        invoices_count: invoices.length,
        invoices_unpaid: B.round(invoices.reduce(function (s, i) {
          const sum = B.calc.invoiceSummary(i);
          return s + (i.status === 'annulee' ? 0 : sum.remaining);
        }, 0)),
        projects_active: activeProjects.length,
        projects_total: projects.length,
        contracts: contracts,
        estimated_margin: estimated,
        expenses: expenses,
        by_category: B.calc.expensesByCategory(expenses),
        expense_series: B.calc.seriesByMonth(expenses, 'date', function (e) { return e.amount; }, 6),
        revenue_series: B.calc.seriesByMonth(invoices.filter(function (i) { return i.status !== 'brouillon' && i.status !== 'annulee'; }), 'date', function (i) { return i.total; }, 6),
        quote_statuses: B.calc.quotesByStatus(mine(repo().table('quotes'))),
        projects_ranking: B.projectService.watchlist()
      };
    },
    /* Insight automatique simple, uniquement si les données le permettent (#311) */
    insight: function () {
      const expenses = B.expenseService.list({});
      if (expenses.length < 3) return null;
      const cats = B.calc.expensesByCategory(expenses);
      if (!cats.length) return null;
      const top = cats[0];
      const total = cats.reduce(function (s, c) { return s + c.value; }, 0);
      const share = total ? Math.round((top.value / total) * 100) : 0;
      return {
        title: 'Vos dépenses sont principalement concentrées dans les ' + top.label.toLowerCase() + '.',
        detail: 'Catégorie « ' + top.label + ' » : ' + B.money(top.value) + ' (' + share + ' % du total des dépenses enregistrées).',
        category: top.id
      };
    }
  };

  /* -------------------------------------------------------------------------
     searchService — recherche globale (#81)
     ------------------------------------------------------------------------- */
  B.searchService = {
    search: function (q) {
      const t = B.normalize(q);
      if (!t || t.length < 2) return [];
      const out = [];
      const push = function (group, icon, title, subtitle, route, meta) {
        out.push({ group: group, icon: icon, title: title, subtitle: subtitle, route: route, meta: meta });
      };
      B.clientService.list().forEach(function (c) {
        if (B.normalize(c.name).indexOf(t) >= 0 || B.normalize(c.phone || '').indexOf(t) >= 0) {
          push('Clients', 'users', c.name, B.truncate((c.phone || '') + ' · ' + (c.address || ''), 46), '#/clients/' + c.id);
        }
      });
      B.quoteService.list().forEach(function (q) {
        const c = B.clientService.get(q.client_id);
        if (B.normalize(q.number).indexOf(t) >= 0 || B.normalize(c ? c.name : '').indexOf(t) >= 0 || (q.lines || []).some(function (l) { return B.normalize(l.description).indexOf(t) >= 0; })) {
          push('Devis', 'doc', q.number + ' — ' + (c ? c.name : 'Sans client'), B.money(q.total) + ' · ' + B.status(B.QUOTE_STATUSES, q.status).label, '#/quotes/' + q.id);
        }
      });
      B.invoiceService.list().forEach(function (i) {
        const c = B.clientService.get(i.client_id);
        if (B.normalize(i.number).indexOf(t) >= 0 || B.normalize(c ? c.name : '').indexOf(t) >= 0 || (i.lines || []).some(function (l) { return B.normalize(l.description).indexOf(t) >= 0; })) {
          push('Factures', 'doc', i.number + ' — ' + (c ? c.name : 'Sans client'), B.money(i.total), '#/invoices/' + i.id);
        }
      });
      B.projectService.list().forEach(function (p) {
        if (B.normalize(p.name).indexOf(t) >= 0 || B.normalize(p.address || '').indexOf(t) >= 0 || B.normalize(p.description || '').indexOf(t) >= 0) {
          push('Chantiers', 'hardhat', p.name, B.money(p.quote_total) + ' · ' + B.status(B.PROJECT_STATUSES, p.status).label, '#/projects/' + p.id);
        }
      });
      B.expenseService.list().forEach(function (e) {
        if (B.normalize(e.description).indexOf(t) >= 0 || B.normalize(e.supplier_name || '').indexOf(t) >= 0) {
          push('Dépenses', 'coins', e.description, B.money(e.amount) + ' · ' + B.dateShort(e.date), '#/expenses');
        }
      });
      B.catalogService.list().forEach(function (it) {
        if (B.normalize(it.name).indexOf(t) >= 0 || B.normalize(it.keywords || '').indexOf(t) >= 0) {
          push('Catalogue', 'box', it.name, B.money(it.last_price != null ? it.last_price : it.default_price) + ' / ' + B.unitLabel(it.unit), '#/catalog');
        }
      });
      return out.slice(0, 24);
    }
  };

  /* -------------------------------------------------------------------------
     supplierService — préparé pour les versions futures (#201)
     ------------------------------------------------------------------------- */
  B.supplierService = {
    list: function () { return mine(repo().table('suppliers')); },
    create: function (data) { return repo().insert('suppliers', Object.assign({ business_id: bid() }, data)); },
    /* Fournisseurs déjà rencontrés dans les dépenses (suggestion progressive) */
    suggestions: function () {
      const names = {};
      B.expenseService.list().forEach(function (e) {
        if (e.supplier_name) names[e.supplier_name] = (names[e.supplier_name] || 0) + 1;
      });
      return Object.keys(names).sort(function (a, b) { return names[b] - names[a]; });
    }
  };

  /* -------------------------------------------------------------------------
     assistantService (#307) — interface unique, brancher un LLM plus tard
     ------------------------------------------------------------------------- */
  B.assistantService = {
    history: function () {
      return mine(repo().table('assistant_messages')).sort(function (a, b) {
        return String(a.created_at).localeCompare(String(b.created_at));
      });
    },
    addMessage: function (role, content, meta) {
      return repo().insert('assistant_messages', {
        business_id: bid(), role: role, content: content,
        created_at: new Date().toISOString(), meta: meta || null
      });
    },
    clear: function () {
      repo().table('assistant_messages').slice().forEach(function (m) {
        if (!m.business_id || m.business_id === bid()) repo().remove('assistant_messages', m.id, true);
      });
    },
    suggestions: function () {
      return [
        { label: 'Voir mes dépenses', text: 'Combien ai-je dépensé ce mois-ci ?' },
        { label: 'Voir ma marge', text: 'Quelle est ma marge ?' },
        { label: 'Voir mes chantiers', text: 'Quel chantier me coûte le plus cher ?' },
        { label: 'Créer un devis', text: 'Fais un devis pour 30 sacs de ciment à 5 500 et 10 voyages de sable à 35 000.' },
        { label: 'Voir mes factures', text: 'Quelles factures ne sont pas encore payées ?' }
      ];
    }
  };
})(globalThis.BATIYO = globalThis.BATIYO || {});
