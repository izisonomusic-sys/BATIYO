/* =========================================================================
   BATIYO — 10. ASSISTANT BATIYO
   ---------------------------------------------------------------------------
   Principe : les CALCULS sont faits par le moteur applicatif déterministe
   (#63, #306). L'assistant comprend la demande, lit les données, formule la
   réponse. Il n'invente jamais (#116) et demande confirmation avant toute
   création ou modification (#61, #62, #310).
   L'API est prête pour un LLM futur (#307, #308) : il suffira de remplacer
   `intent()` par un appel modèle recevant des données structurées.
   ========================================================================= */
(function (B) {
  'use strict';

  B.CAVEAT = 'Estimation basée sur vos données enregistrées — ce résultat peut évoluer.';

  /* ----------------------------- Helpers texte ---------------------------- */
  function cleanNumbers(t) {
    return String(t || '')
      .replace(/(\d)[\s\u00a0\u202f](?=\d{3}(\D|$))/g, '$1')
      .replace(/\b(\d+)[.,](\d{3})\b/g, '$1$2');
  }
  function findAmounts(t) {
    const m = cleanNumbers(t).match(/\d+(?:[.,]\d+)?/g) || [];
    return m.map(function (x) { return B.parseNumber(x.replace(',', '.')); });
  }
  const UNIT_WORDS = {
    sac: 'sac', sacs: 'sac', barre: 'barre', barres: 'barre', voyage: 'voyage', voyages: 'voyage',
    kg: 'kg', tonne: 'tonne', tonnes: 'tonne', metre: 'm', mètre: 'm', metres: 'm', mètres: 'm',
    m2: 'm2', m3: 'm3', litre: 'litre', litres: 'litre', heure: 'heure', heures: 'heure',
    jour: 'jour', jours: 'jour', forfait: 'forfait', unite: 'unite', unité: 'unite', unités: 'unite',
    piece: 'piece', pièce: 'piece', pieces: 'piece', pièces: 'piece', carton: 'carton', cartons: 'carton',
    rouleau: 'rouleau', rouleaux: 'rouleau', pot: 'unite', sachet: 'sac'
  };
  function detectUnit(word) { return UNIT_WORDS[B.normalize(word)] || null; }

  function findProject(text) {
    const t = B.normalize(text);
    const projects = B.projectService.list({ hide_archived: true }).concat(B.projectService.list({ hide_archived: false })).filter(function (p, i, a) {
      return a.findIndex(function (x) { return x.id === p.id; }) === i;
    });
    /* correspondance directe par nom complet puis par mot-clé */
    let found = projects.find(function (p) { return t.indexOf(B.normalize(p.name)) >= 0; });
    if (found) return found;
    /* Sinon : on retient le chantier le plus important dont un mot du nom apparaît */
    const scored = projects.map(function (p) {
      const words = B.normalize(p.name).split(/\s+/).filter(function (w) { return w.length > 3; });
      const hits = words.filter(function (w) { return t.indexOf(w) >= 0; }).length;
      return { p: p, hits: hits, score: hits * 1000000000 + (Number(p.quote_total) || 0) };
    }).filter(function (x) { return x.hits > 0; })
      .sort(function (a, b) { return b.score - a.score; });
    if (scored.length) return scored[0].p;
    /* « chantier Koffi » → recherche côté client */
    const m = t.match(/chantier\s+(?:de\s+|d')?([a-z0-9'’\-]+)/);
    if (m) {
      const client = B.clientService.list().find(function (c) { return B.normalize(c.name).indexOf(m[1]) >= 0; });
      if (client) return projects.find(function (p) { return p.client_id === client.id; });
    }
    return null;
  }
  function findClient(text) {
    const t = B.normalize(text);
    const clients = B.clientService.list();
    let found = clients.find(function (c) { return t.indexOf(B.normalize(c.name)) >= 0; });
    if (found) return found;
    const m = String(text).match(/(?:pour|client|cliente|à|a)\s+(?:le\s+|la\s+|monsieur\s+|madame\s+)?([A-ZÀ-Ý][\w'’-]{2,})/);
    if (m) {
      const name = B.normalize(m[1]);
      found = clients.find(function (c) { return B.normalize(c.name).indexOf(name) >= 0; });
      if (found) return found;
      return { name: m[1], is_new: true, phone: '', address: '' };
    }
    return null;
  }
  function categoryFromText(text) {
    const t = B.normalize(text);
    if (/carburant|essence|gasoil|fuel/.test(t)) return 'carburant';
    if (/transport|livraison|camion|deplacement|voyage/.test(t)) return 'transport';
    if (/main.?d.?oeuvre|salaire|macon|ouvrier|equipe|paye/.test(t)) return 'main_oeuvre';
    if (/outillage|outil|marteau|truelle|brouette|meuleuse/.test(t)) return 'outillage';
    if (/fourniture|carnet|papier|gant|bureau/.test(t)) return 'fournitures';
    if (/ciment|sable|fer|gravier|agglo|brique|carrelage|peinture|pvc|cable|planche|materiaux|materiel|bois|tuyau/.test(t)) return 'materiaux';
    return 'autres';
  }
  function periodFromText(text) {
    const t = B.normalize(text);
    if (/aujourd|ce jour/.test(t)) return 'today';
    if (/cette semaine|semaine/.test(t)) return 'week';
    if (/ce mois|ce mois-ci|mois en cours|ce mois ci/.test(t)) return 'month';
    if (/cette annee|annee|annuel/.test(t)) return 'year';
    return 'all';
  }

  /* ------------------------------- Inventaire ----------------------------- */
  function dataInventory() {
    return {
      stats: B.calc.dashboardStats(B.DataRepository.local.load()),
      expenses: B.expenseService.list({}),
      quotes: B.quoteService.list({}),
      invoices: B.invoiceService.list({}),
      projects: B.projectService.list({ status: 'all', hide_archived: false }),
      clients: B.clientService.list()
    };
  }

  /* -------------------------------- Réponses ------------------------------ */
  function expenseReport(text) {
    const period = periodFromText(text);
    const project = findProject(text);
    const r = B.periodRange(period);
    const rows = B.expenseService.list({ project_id: project ? project.id : undefined, from: r.from, to: r.to });
    if (!rows.length) {
      return {
        text: 'Je ne trouve aucune dépense enregistrée' + (project ? ' sur « ' + project.name + ' »' : '') +
          (period === 'all' ? '' : ' sur la période « ' + r.label + ' »') + '.'
      };
    }
    const total = B.calc.calculateSums(rows);
    const cats = B.calc.expensesByCategory(rows);
    let msg = 'Vous avez enregistré ' + B.money(total) + ' de dépenses' +
      (period === 'all' ? '' : ' ' + r.label.toLowerCase()) +
      (project ? ' sur le chantier « ' + project.name + ' »' : '') + '.';
    if (cats.length) {
      msg += '\n\nLes principales catégories sont :\n' + cats.slice(0, 4).map(function (c) {
        return '• ' + c.label + ' : ' + B.money(c.value);
      }).join('\n');
    }
    return { text: msg, meta: { intent: 'expenses', total: total } };
  }

  function revenueReport(text) {
    const period = periodFromText(text);
    const r = B.periodRange(period);
    const quotes = B.quoteService.list({ from: r.from, to: r.to });
    const invoices = B.invoiceService.list({}).filter(function (i) { return B.inRange(i.date, r.from, r.to); });
    const revenue = B.calc.calculateRevenue(quotes, invoices);
    const spent = B.calc.calculateSums(B.expenseService.list({ from: r.from, to: r.to }));
    return {
      text: 'Votre chiffre d’affaires enregistré' + (period === 'all' ? '' : ' sur la période « ' + r.label + ' »') + ' est de ' + B.money(revenue) + '.\n\n' +
        'Il correspond aux devis acceptés et aux factures émises hors devis.\n' +
        'Dépenses enregistrées : ' + B.money(spent) + '\n' +
        'Résultat provisoire : ' + B.money(revenue - spent) + '\n\n' + B.CAVEAT,
      meta: { intent: 'revenue', revenue: revenue }
    };
  }

  function marginReport(text) {
    const project = findProject(text);
    if (project) {
      const d = B.projectService.detail(project.id);
      const s = d.summary;
      let msg = 'Chantier « ' + project.name +' » :\n\n' +
        'Montant du contrat : ' + B.money(s.contract) + '\n' +
        'Budget prévu : ' + B.money(s.budget_total) + '\n' +
        'Marge prévisionnelle : ' + B.money(s.estimated_margin) + '\n' +
        'Dépenses réelles : ' + B.money(s.spent) + '\n' +
        'Résultat provisoire : ' + B.money(s.actual_result) + ' (' + s.actual_margin_rate + ' % du contrat)\n' +
        'Indicateur : ' + s.health.label + '\n\n';
      if (s.spent === 0) msg += 'Aucune dépense n’a encore été enregistrée sur ce chantier.\n\n';
      msg += B.CAVEAT;
      return { text: msg, meta: { intent: 'margin', project_id: project.id } };
    }
    const rows = B.projectService.list({ status: 'actifs' }).map(function (p) {
      const expenses = B.expenseService.list({ project_id: p.id });
      return { project: p, summary: B.calc.projectSummary(p, expenses, B.session.settings()) };
    });
    if (!rows.length) return { text: 'Je ne trouve aucun chantier actif dans vos données enregistrées.' };
    let msg = 'Voici la situation par chantier actif :\n\n' + rows.map(function (r) {
      return '• ' + r.project.name + ' : contrat ' + B.money(r.summary.contract) +
        ' · dépenses ' + B.money(r.summary.spent) +
        ' · résultat provisoire ' + B.money(r.summary.actual_result);
    }).join('\n');
    msg += '\n\n' + B.CAVEAT;
    return { text: msg, meta: { intent: 'margin' } };
  }

  function budgetReport(text) {
    const project = findProject(text);
    if (project) {
      const d = B.projectService.detail(project.id);
      const s = d.summary;
      return {
        text: 'Sur « ' + project.name +' » :\n\n' +
          'Budget prévu : ' + B.money(s.budget_total) + '\n' +
          'Dépenses réelles : ' + B.money(s.spent) + '\n' +
          'Il reste : ' + B.money(s.budget_remaining) + '\n\n' +
          d.alerts.map(function (a) { return (a.tone === 'danger' ? '🔴 ' : a.tone === 'warn' ? '🟠 ' : '🟢 ') + a.message; }).join('\n'),
        meta: { intent: 'budget', project_id: project.id }
      };
    }
    const rows = B.projectService.watchlist();
    const totalBudget = rows.reduce(function (s, r) { return s + r.summary.budget_total; }, 0);
    const totalSpent = rows.reduce(function (s, r) { return s + r.summary.spent; }, 0);
    return {
      text: 'Sur vos ' + rows.length + ' chantiers actifs :\n\n' +
        'Budget prévu total : ' + B.money(totalBudget) + '\n' +
        'Dépenses réelles : ' + B.money(totalSpent) + '\n' +
        'Budget restant : ' + B.money(totalBudget - totalSpent) + '\n\n' +
        B.CAVEAT,
      meta: { intent: 'budget' }
    };
  }

  function costlyProjectReport() {
    const rows = B.projectService.watchlist();
    if (!rows.length) return { text: 'Je ne trouve aucun chantier enregistré.' };
    const withExpenses = rows.filter(function (r) { return r.summary.spent > 0; });
    if (!withExpenses.length) return { text: 'Aucune dépense n’est encore enregistrée sur vos chantiers.' };
    const top = withExpenses.slice().sort(function (a, b) { return b.summary.spent - a.summary.spent; })[0];
    return {
      text: 'Le chantier qui vous coûte le plus cher est « ' + top.project.name + ' » avec ' + B.money(top.summary.spent) + ' de dépenses enregistrées.\n\n' +
        'Contrat : ' + B.money(top.summary.contract) + '\n' +
        'Budget prévu : ' + B.money(top.summary.budget_total) + '\n' +
        'Budget restant : ' + B.money(top.summary.budget_remaining) + '\n' +
        'Résultat provisoire : ' + B.money(top.summary.actual_result) + '\n\n' + B.CAVEAT,
      meta: { intent: 'project_cost' }
    };
  }

  function projectListReport() {
    const rows = B.projectService.watchlist();
    if (!rows.length) return { text: 'Je ne trouve aucun chantier actif dans vos données enregistrées.' };
    return {
      text: 'Vos chantiers actifs :\n\n' + rows.map(function (r) {
        return '• ' + r.project.name + ' — ' + r.project.progress + ' % · ' +
          B.money(r.summary.spent) + ' dépensés sur ' + B.money(r.summary.budget_total) + ' · ' + r.summary.health.label;
      }).join('\n'),
      meta: { intent: 'projects' }
    };
  }

  function unpaidInvoicesReport() {
    const rows = B.invoiceService.list({}).map(function (i) {
      return { invoice: i, summary: B.calc.invoiceSummary(i) };
    }).filter(function (r) { return r.summary.remaining > 0 && r.invoice.status !== 'brouillon' && r.invoice.status !== 'annulee'; });
    if (!rows.length) return { text: 'Aucune facture en attente de paiement dans vos données enregistrées.' };
    const total = rows.reduce(function (s, r) { return s + r.summary.remaining; }, 0);
    return {
      text: 'Il reste ' + B.money(total) + ' à encaisser sur ' + rows.length + ' facture' + (rows.length > 1 ? 's' : '') + ' :\n\n' +
        rows.slice(0, 6).map(function (r) {
          const c = B.clientService.get(r.invoice.client_id);
          return '• ' + r.invoice.number + ' — ' + (c ? c.name : 'Sans client') + ' : ' + B.money(r.summary.remaining) + ' restant';
        }).join('\n') + '\n\n' + B.CAVEAT,
      meta: { intent: 'unpaid' }
    };
  }

  function clientsReport() {
    const rows = B.clientService.list();
    if (!rows.length) return { text: 'Je ne trouve aucun client enregistré.' };
    const valuable = rows.map(function (c) {
      const d = B.clientService.detail(c.id);
      return { client: c, total: d.stats.total_invoiced };
    }).sort(function (a, b) { return b.total - a.total; });
    return {
      text: 'Vous avez ' + rows.length + ' clients enregistrés' + (rows.length > 1 ? '' : '') + '.\n\n' +
        'Principaux par montant facturé :\n' + valuable.slice(0, 4).map(function (r) {
          return '• ' + r.client.name + ' : ' + B.money(r.total);
        }).join('\n'),
      meta: { intent: 'clients' }
    };
  }

  /* ---------------------- Devis en langage naturel (#59, #118) ----------- */
  function parseQuoteRequest(text) {
    const items = [];
    const body = cleanNumbers(text)
      .replace(/^(fais|fait|cr[ée]e|cr[ée]er|prepare|prépare|g[ée]n[èe]re|etablis|établis)\s+(moi\s+)?(un|le)\s+devis\s*/i, '')
      .replace(/\s*pour\s+(?:le\s+client\s+|la\s+cliente\s+)?[A-ZÀ-Ý][\w'’-]+/g, ' ')
      .replace(/fcfa|f cfa|francs?/gi, ' ')
      .trim();
    const segments = body.split(/\s+et\s+|\s*,\s*|\s*;\s*/).filter(function (s) { return s.trim().length; });
    segments.forEach(function (seg) {
      const words = seg.trim().split(/\s+/);
      let qty = null, unit = null, price = null, nameWords = [], priceSeen = false;
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const wl = B.normalize(w.replace(/[.,;:!?]+$/, ''));
        if (/^\d+([.,]\d+)?$/.test(w.replace(/[.,;:!?]+$/, ''))) {
          if (qty == null) qty = B.parseNumber(w);
          else { price = B.parseNumber(w); priceSeen = true; }
          continue;
        }
        if (wl === 'à' || wl === 'a' || wl === 'pour') {
          /* « à 5 500 » = prix · « pour 30 sacs » = quantité */
          const next = words[i + 1];
          const isNum = next && /^\d+([.,]\d+)?$/.test(next.replace(/[.,;:!?]+$/, ''));
          if (isNum && qty == null) { qty = B.parseNumber(next); i++; continue; }
          if (isNum) { price = B.parseNumber(next); priceSeen = true; i++; continue; }
          continue;
        }
        if (detectUnit(w) && unit == null) { unit = detectUnit(w); continue; }
        if (wl === 'de' || wl === 'd' || wl === 'du' || wl === 'des') continue;
        nameWords.push(w);
      }
      let name = nameWords.join(' ').replace(/[.,;:!?]+$/, '').trim();
      if (!name) return;
      items.push({ name: name, qty: qty == null ? 1 : qty, unit: unit, price: priceSeen ? price : null });
    });
    const client = findClient(text);
    return { items: items, client: client };
  }

  function quoteDraft(text) {
    const parsed = parseQuoteRequest(text);
    if (!parsed.items.length) {
      return { text: 'Je n’ai pas réussi à identifier les éléments du devis. Essayez par exemple : « Fais un devis pour 30 sacs de ciment à 5 500. »' };
    }
    const lines = parsed.items.map(function (it) {
      const match = B.catalogService.search(it.name)[0];
      const price = it.price != null ? it.price : (match ? (match.last_price != null ? match.last_price : match.default_price) : 0);
      return {
        id: B.uid('li'),
        catalog_item_id: match ? match.id : null,
        description: match ? match.name : it.name,
        quantity: it.qty,
        unit: it.unit || (match ? match.unit : 'unite'),
        unit_price: price,
        total: B.calc.calculateLineTotal({ quantity: it.qty, unit_price: price }),
        matched: !!match
      };
    });
    const totals = B.calc.calculateDocumentTotals({ lines: lines, discount: { mode: 'amount', value: 0 } }, B.session.settings());
    const clientLabel = parsed.client ? parsed.client.name : 'aucun client sélectionné';
    return {
      text: 'Voici ce que je vais préparer :\n\n' + lines.map(function (l) {
        return '• ' + l.description + ' — ' + B.num(l.quantity) + ' ' + B.unitLabel(l.unit) + ' × ' + B.money(l.unit_price) + ' = ' + B.money(l.total);
      }).join('\n') + '\n\nTotal estimé : ' + B.money(totals.total) + '\nClient : ' + clientLabel + '\n\nVoulez-vous créer ce devis ? Vous pourrez modifier les prix et les quantités ensuite.',
      pending: {
        type: 'create_quote',
        label: 'Créer le devis',
        payload: { lines: lines, client: parsed.client || null, total: totals.total }
      }
    };
  }

  /* --------------------- Dépense en langage naturel (#61, #119) ---------- */
  function expenseDraft(text) {
    const project = findProject(text);
    const amounts = findAmounts(text);
    if (!amounts.length) {
      return { text: 'Je n’ai pas trouvé de montant. Essayez par exemple : « Ajoute une dépense de 120 000 FCFA pour le sable sur le chantier Koffi. »' };
    }
    /* le montant le plus grand est en général le montant dépensé */
    const amount = amounts.slice().sort(function (a, b) { return b - a; })[0];
    let description = text
      .replace(/^(ajoute|ajouter|enregistre|enregistrer|note|noter|j'ai achet[ée]|jai achet[ée])\s*/i, '')
      .replace(/(une\s+)?(d[ée]pense|achat|facture|re[çc]u)\s*(de\s*)?/gi, ' ')
      .replace(/\d[\d\s.,]*/g, ' ')
      .replace(/fcfa|f cfa|francs?/gi, ' ')
      .replace(/sur le chantier\s+\S+|pour le chantier\s+\S+|au chantier\s+\S+/gi, ' ')
      .trim();
    /* Retire les articles en tête (pour le sable → sable) */
    for (let i = 0; i < 3; i++) {
      const before = description;
      description = description.replace(/^(pour|de|du|des|la|le|les|l'|sur|au|aux|d'|en|a|à)\s*/i, '').trim();
      if (description === before) break;
    }
    description = description.replace(/[.,;:!?]+$/, '').replace(/\s+/g, ' ').trim();
    /* Retire le nom du chantier / du client pour garder une description claire */
    if (project) description = description.replace(new RegExp(B.escapeRegex(project.name), 'gi'), ' ');
    const clientHit = B.clientService.list().find(function (c) { return B.normalize(description).indexOf(B.normalize(c.name)) >= 0 || B.normalize(c.name).split(/\s+/).some(function (w) { return w.length > 3 && B.normalize(description).indexOf(w) >= 0; }); });
    if (clientHit) {
      description = description.replace(new RegExp(B.escapeRegex(clientHit.name), 'gi'), ' ');
      B.normalize(clientHit.name).split(/\s+/).forEach(function (w) {
        if (w.length > 3) description = description.replace(new RegExp('\\b' + B.escapeRegex(w) + '\\b', 'gi'), ' ');
      });
    }
    description = description
      .replace(/\bchantier\b/gi, ' ')
      .replace(/\b(pour|sur|au|aux|dans|avec|et|de|du|des|la|le|les)\s*$/i, '')
      .replace(/\b(pour|sur|au|aux|dans|avec|et|de|du|des|la|le|les)\s*$/i, '')
      .replace(/\s+/g, ' ').trim();
    if (!description) description = 'Dépense';
    description = description.charAt(0).toUpperCase() + description.slice(1);
    const category = categoryFromText(text);
    const budgetLine = B.expenseService.suggestBudgetLine(description + ' ' + text, category);
    return {
      text: 'Je vais enregistrer :\n\n' + B.money(amount) + '\nCatégorie : ' + B.expenseCategory(category).label +
        '\nPoste budgétaire : ' + B.budgetLineLabel(budgetLine) +
        '\nChantier : ' + (project ? project.name : 'aucun (dépense générale)') +
        '\nDescription : ' + description + '\n\nConfirmer ?',
      pending: {
        type: 'create_expense',
        label: 'Enregistrer la dépense',
        payload: { amount: amount, category: category, description: description, project_id: project ? project.id : null, budget_line: budgetLine }
      }
    };
  }

  function clientDraft(text) {
    const client = findClient(text);
    const phoneMatch = String(text).match(/(\+?\d[\d\s]{6,})/);
    if (!client || !client.name) {
      return { text: 'Indiquez le nom du client. Par exemple : « Ajoute le client Jean au 90 12 34 56. »' };
    }
    const existing = B.clientService.list().find(function (c) { return B.normalize(c.name) === B.normalize(client.name); });
    if (existing) return { text: 'Le client « ' + existing.name + ' » existe déjà dans vos clients.' };
    return {
      text: 'Je vais créer le client :\n\n' + client.name + (phoneMatch ? '\nTéléphone : ' + phoneMatch[1].trim() : '') + '\n\nConfirmer ?',
      pending: {
        type: 'create_client',
        label: 'Créer le client',
        payload: { name: client.name, phone: phoneMatch ? phoneMatch[1].trim() : '' }
      }
    };
  }

  /* ------------------------------ Routeur d'intentions -------------------- */
  function intent(text) {
    const t = B.normalize(text);
    return {
      createQuote: /(fais|fait|cr[ée]e|cr[ée]er|prepare|prépare|generer|générer|etablir|établir).*(devis)|devis.*(pour|avec)/.test(t) && /\d/.test(t),
      createExpense: /(ajoute|ajouter|enregistre|enregistrer|note|noter|j'ai acheté|jai achete|depense de|achat de|achet[eé])/.test(t) && /\d/.test(t),
      createClient: /(ajoute|ajouter|cr[ée]e|cr[ée]er|nouveau)\s+(un\s+)?client/.test(t),
      expenses: /(d[ée]pens|depens|achat|achats|combi en ai-je|combien ai-je depense|combien j'ai depense)/.test(t),
      budget: /(budget|reste-t-il|reste t il|reste dans)/.test(t),
      margin: /(marge|rentab|benefice|b[ée]n[ée]fice|resultat|b[ée]n[ée]fice|gain|je gagne)/.test(t),
      costlyProject: /(plus cher|plus co[ûu]teux|co[ûu]te le plus)/.test(t),
      projects: /(chantier|chantiers|projet|projets)/.test(t),
      unpaid: /(impay|non pay|pas encore pay|reste [aà] encaisser|qui me doit)/.test(t),
      invoices: /(facture|factures)/.test(t),
      quotes: /(devis)/.test(t),
      clients: /(client|clients)/.test(t),
      revenue: /(chiffre d.?affaire|ca |ca\?|revenu|chiffre)/.test(t),
      profession: /(m[ée]tier|profession|activit[ée])/.test(t),
      help: /(aide|que peux-tu|que sais-tu|bonjour|salut|merci)/.test(t)
    };
  }

  /* -------------------------------- Répondre ------------------------------ */
  function respond(text) {
    const raw = String(text || '').trim();
    if (!raw) return { text: 'Posez-moi une question sur votre activité.' };
    const i = intent(raw);

    /* 1. Actions (avec confirmation obligatoire) */
    if (i.createExpense) return Object.assign(expenseDraft(raw), { meta: { intent: 'create_expense' } });
    if (i.createQuote) return Object.assign(quoteDraft(raw), { meta: { intent: 'create_quote' } });
    if (i.createClient) return Object.assign(clientDraft(raw), { meta: { intent: 'create_client' } });

    /* 2. Questions analytiques — toujours via le moteur de calcul */
    if (i.profession) {
      const p = B.session.profession();
      return { text: 'Votre profil est enregistré avec le métier « ' + p.name + ' ». Vos nouveaux devis utilisent donc automatiquement le catalogue ' + p.name.toLowerCase() + '. Vous pouvez modifier ce métier dans Profil → Activité (vos anciens documents resteront inchangés).', meta: { intent: 'profession' } };
    }
    if (i.costlyProject) return costlyProjectReport();
    if (i.budget) return budgetReport(raw);
    if (i.margin) return marginReport(raw);
    if (i.expenses) return expenseReport(raw);
    if (i.unpaid) return unpaidInvoicesReport();
    if (i.revenue) return revenueReport(raw);
    if (i.projects) return projectListReport();
    if (i.clients) return clientsReport();
    if (i.invoices) {
      const rows = B.invoiceService.list({});
      if (!rows.length) return { text: 'Je ne trouve aucune facture dans vos données enregistrées.' };
      const total = rows.reduce(function (s, x) { return s + (Number(x.total) || 0); }, 0);
      return {
        text: 'Vous avez ' + rows.length + ' facture' + (rows.length > 1 ? 's' : '') + ' pour un total de ' + B.money(total) + '.\n\n' +
          rows.slice(0, 5).map(function (x) {
            const s = B.calc.invoiceSummary(x);
            const c = B.clientService.get(x.client_id);
            return '• ' + x.number + ' — ' + (c ? c.name : 'Sans client') + ' : ' + B.money(s.total) + ' (' + B.status(B.INVOICE_STATUSES, s.status).label + ')';
          }).join('\n'),
        meta: { intent: 'invoices' }
      };
    }
    if (i.quotes) {
      const rows = B.quoteService.list({});
      if (!rows.length) return { text: 'Je ne trouve aucun devis dans vos données enregistrées.' };
      return {
        text: 'Vous avez ' + rows.length + ' devis enregistrés :\n\n' + rows.slice(0, 5).map(function (q) {
          const c = B.clientService.get(q.client_id);
          return '• ' + q.number + ' — ' + (c ? c.name : 'Sans client') + ' : ' + B.money(q.total) + ' (' + B.status(B.QUOTE_STATUSES, q.status).label + ')';
        }).join('\n') + '\n\nVous pouvez me demander : « Fais un devis pour 30 sacs de ciment à 5 500. »',
        meta: { intent: 'quotes' }
      };
    }
    if (i.help) {
      return {
        text: 'Je peux vous aider sur votre activité :\n\n' +
          '• « Combien ai-je dépensé ce mois-ci ? »\n' +
          '• « Quelle est ma marge ? »\n' +
          '• « Combien reste-t-il dans mon budget ? »\n' +
          '• « Quel chantier me coûte le plus cher ? »\n' +
          '• « Combien ai-je dépensé sur le chantier Koffi ? »\n' +
          '• « Fais un devis pour 30 sacs de ciment à 5 500. »\n' +
          '• « Ajoute une dépense de 80 000 FCFA pour le transport sur le chantier Maison Koffi. »\n\n' +
          'Pour les actions, je vous demanderai toujours de confirmer avant d’enregistrer.',
        meta: { intent: 'help' }
      };
    }
    /* 3. Rien trouvé : jamais d'invention (#116) */
    return {
      text: 'Je ne trouve pas cette information dans vos données enregistrées.\n\nJe peux par exemple répondre à : « Combien ai-je dépensé ? », « Quelle est ma marge ? », « Combien reste-t-il dans mon budget ? », ou préparer un devis et une dépense.',
      meta: { intent: 'unknown' }
    };
  }

  /* ---------------------- Exécution après confirmation -------------------- */
  function execute(pending) {
    if (!pending || !pending.payload) return { ok: false, text: 'Action impossible.' };
    const p = pending.payload;
    if (pending.type === 'create_expense') {
      const e = B.expenseService.create({
        amount: p.amount, category: p.category, description: p.description,
        project_id: p.project_id, budget_line: p.budget_line, date: B.today()
      });
      let extra = '';
      if (e.project_id) {
        const d = B.projectService.detail(e.project_id);
        extra = '\n\nBudget restant sur « ' + d.project.name + ' » : ' + B.money(d.summary.budget_remaining) + '.';
      }
      return { ok: true, text: 'Dépense enregistrée : ' + B.money(e.amount) + ' — ' + e.description + ' (' + e.number + ').' + extra, entity: e };
    }
    if (pending.type === 'create_quote') {
      let clientId = p.client && !p.client.is_new ? p.client.id : null;
      if (!clientId && p.client && p.client.name) {
        clientId = B.clientService.create({ name: p.client.name, phone: p.client.phone || '' }).id;
      }
      const q = B.quoteService.save({
        client_id: clientId,
        lines: p.lines,
        discount: { mode: 'amount', value: 0 },
        notes: 'Devis préparé avec l’assistant BATIYO.',
        status: 'brouillon'
      });
      /* mémoire des prix (#34) */
      p.lines.forEach(function (l) {
        if (l.catalog_item_id) B.catalogService.rememberPrice(l.catalog_item_id, l.unit_price);
      });
      return {
        ok: true,
        text: 'Devis ' + q.number + ' créé avec succès (' + B.money(q.total) + ').\n\nOuvrez-le pour ajouter un client, une remise ou générer le PDF.',
        entity: q, route: '#/quotes/' + q.id
      };
    }
    if (pending.type === 'create_client') {
      const c = B.clientService.create({ name: p.name, phone: p.phone });
      return { ok: true, text: 'Client « ' + c.name +' » créé avec succès.' + (p.phone ? ' Téléphone : ' + p.phone + '.' : ''), entity: c, route: '#/clients/' + c.id };
    }
    return { ok: false, text: 'Action non reconnue.' };
  }

  B.assistant = {
    respond: respond,
    execute: execute,
    intent: intent,
    parseQuoteRequest: parseQuoteRequest,
    findProject: findProject,
    findClient: findClient,
    findAmounts: findAmounts,
    categoryFromText: categoryFromText,
    periodFromText: periodFromText,
    inventory: dataInventory
  };
})(globalThis.BATIYO = globalThis.BATIYO || {});
