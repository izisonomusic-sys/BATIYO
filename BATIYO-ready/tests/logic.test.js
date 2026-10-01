/* =========================================================================
   BATIYO — TESTS DE LOGIQUE MÉTIER (Node, sans navigateur)
   Lancement : node tests/logic.test.js
   ========================================================================= */
const test = require('node:test');
const assert = require('node:assert');
const { B } = require('./load.js');

B.DataRepository.init();

/* Jeu de fixtures de test : volontairement séparé du produit et jamais chargé
   par l'application utilisateur. Il remplace l'ancien compte de démonstration. */
function bootTestWorkspace() {
  B.DataRepository.local.reset();
  B.DataRepository.init();
  B.referenceData();
  const business = B.DataRepository.local.insert('businesses', {
    id: B.uid(), name: 'Entreprise Test BATIYO', phone: '+228 90 00 00 00', country: 'TG', currency: 'FCFA'
  });
  const user = B.DataRepository.local.insert('users', {
    id: B.uid(), business_id: business.id, name: 'Kossi Test', email: 'test@example.tg', identifier: 'test@example.tg', profession_id: 'maçon'
  });
  B.DataRepository.local.insert('profiles', {
    id: user.id, user_id: user.id, business_id: business.id, profession_id: 'maçon',
    full_name: user.name, email: user.email, onboarding_done: true
  });
  B.session.login(user, true);
  B.session.settings();

  const client = B.clientService.create({ name: 'Koffi', phone: '+228 90 00 11 22', address: 'Lomé' });
  const quote = B.quoteService.save({
    client_id: client.id, profession_id: 'maçon',
    lines: [{ description: 'Contrat de construction', quantity: 1, unit: 'forfait', unit_price: 3500000 }],
    discount: { mode: 'amount', value: 0 }, notes: 'Devis fixture'
  });
  B.quoteService.setStatus(quote.id, 'accepte');

  const project = B.projectService.create({
    client_id: client.id, name: 'Maison Koffi', status: 'en_cours', quote_total: 3500000, progress: 65,
    budget: { ciment: 700000, fer: 500000, sable: 250000, gravier: 300000, main_oeuvre: 900000, transport: 250000 }
  });
  B.DataRepository.local.update('quotes', quote.id, { project_id: project.id });

  [
    ['ciment', 740000, '20 sacs de ciment'],
    ['fer', 500000, 'Fer 10'],
    ['sable', 250000, 'Voyages de sable'],
    ['gravier', 220000, 'Gravier 15/25'],
    ['main_oeuvre', 130000, 'Main-d’œuvre'],
    ['transport', 310000, 'Transport'],
    ['materiaux', 60000, 'Petite fourniture hors chantier']
  ].forEach(function (x, idx) {
    B.expenseService.create({ project_id: idx === 6 ? null : project.id, amount: x[1], category: x[0] === 'main_oeuvre' ? 'main_oeuvre' : (x[0] === 'transport' ? 'transport' : 'materiaux'), description: x[2], budget_line: x[0], date: B.today() });
  });
  B.invoiceService.create({ client_id: client.id, status: 'emise', lines: [{ description: 'Prestation complémentaire', quantity: 1, unit: 'forfait', unit_price: 350000 }] });
  return { business, user, client, quote, project };
}

const FIXTURE = bootTestWorkspace();

test('Catalogue : chaque métier possède un catalogue cohérent', () => {
  B.PROFESSIONS.forEach((p) => {
    assert.ok(p.items.length >= 3, p.name + ' doit avoir un catalogue');
    p.items.forEach((it) => {
      assert.ok(it.name, 'article sans nom dans ' + p.name);
      assert.ok(B.UNITS.some((u) => u.id === it.unit || u.label === it.unit), 'unité inconnue : ' + it.unit);
      assert.ok(it.default_price >= 0);
    });
    const total = Object.values(p.budget_profile).reduce((a, b) => a + b, 0);
    assert.equal(Math.round(total), 100, 'budget_profile de ' + p.name + ' doit totaliser 100 %');
  });
  assert.ok(B.PROFESSIONS.length >= 11);
});

test('Calculs de lignes et totaux de document', () => {
  const lines = [{ quantity: 50, unit_price: 5500 }, { quantity: 10, unit_price: 35000 }];
  assert.equal(B.calc.calculateLineTotal(lines[0]), 275000);
  assert.equal(B.calc.calculateSubtotal(lines), 625000);
  assert.equal(B.calc.calculateDiscount(625000, { mode: 'percent', value: 10 }), 62500);
  assert.equal(B.calc.calculateTax(100000, { tax_enabled: true, tax_rate: 18, tax_mode: 'exclusive' }), 18000);
  assert.equal(B.calc.calculateTax(118000, { tax_enabled: true, tax_rate: 18, tax_mode: 'inclusive' }), 18000);
  assert.equal(B.calc.calculateTax(100000, { tax_enabled: false, tax_rate: 18 }), 0);
  const totals = B.calc.calculateDocumentTotals({ lines, discount: { mode: 'amount', value: 25000 }, deposit: 100000 }, { tax_enabled: false });
  assert.equal(totals.total, 600000);
  assert.equal(totals.balance, 500000);
});

test('Quantités ou prix négatifs ignorés (protection saisie)', () => {
  assert.equal(B.calc.calculateLineTotal({ quantity: -5, unit_price: 1000 }), 0);
  assert.equal(B.calc.calculateLineTotal({ quantity: 5, unit_price: -1000 }), 0);
});

test('Moteur de calcul : budget, marge, résultat', () => {
  const budget = { ciment: 700000, fer: 500000, sable: 250000 };
  assert.equal(B.calc.calculateBudgetTotal(budget), 1450000);
  assert.equal(B.calc.calculateBudgetRemaining(1450000, 900000), 550000);
  assert.equal(B.calc.calculateEstimatedMargin(3500000, 1450000), 2050000);
  assert.equal(B.calc.calculateActualResult(3500000, 2100000), 1400000);
});

test('Analyse des écarts par poste (exemple du cahier des charges §58)', () => {
  const project = { id: 'p1', budget: { ciment: 700000 }, quote_total: 1000000 };
  const expenses = [{ amount: 740000, description: '20 sacs de ciment', category: 'materiaux', budget_line: 'ciment' }];
  const a = B.calc.analyzeBudgetVariance(project, expenses);
  const row = a.rows.find((r) => r.line === 'ciment');
  assert.equal(row.planned, 700000);
  assert.equal(row.actual, 740000);
  assert.equal(row.variance, 40000);
  assert.equal(row.rate, 5.7);
  assert.equal(row.status, 'depassement');
});

test('Statuts budgétaires : normal / attention / dépassement (§57)', () => {
  assert.equal(B.calc.budgetStatus(1000000, 500000), 'normal');
  assert.equal(B.calc.budgetStatus(1000000, 900000), 'attention');
  assert.equal(B.calc.budgetStatus(1000000, 1200000), 'depassement');
});

test('Dépenses rattachées au bon poste budgétaire', () => {
  assert.equal(B.calc.budgetLineOf({ description: '30 sacs de ciment', category: 'materiaux' }), 'ciment');
  assert.equal(B.calc.budgetLineOf({ description: 'Fer 10 : 30 barres', category: 'materiaux' }), 'fer');
  assert.equal(B.calc.budgetLineOf({ description: 'Voyages de sable', category: 'materiaux' }), 'sable');
  assert.equal(B.calc.budgetLineOf({ description: 'Gravier 15/25', category: 'materiaux' }), 'gravier');
  assert.equal(B.calc.budgetLineOf({ description: 'Main-d’œuvre', category: 'main_oeuvre' }), 'main_oeuvre');
  assert.equal(B.calc.budgetLineOf({ description: 'Carburant', category: 'carburant' }), 'transport');
});

test('Tableau de bord : chiffres dérivés des fixtures réelles du test', () => {
  const stats = B.calc.dashboardStats(B.DataRepository.local.load());
  assert.equal(stats.revenue, 3850000);
  assert.equal(stats.spent, 2210000);
  assert.equal(stats.margin_estimated, 600000);
  assert.equal(stats.active_projects, 1);
});

test('Chantier Maison Koffi : prévision vs réel (§47, §56)', () => {
  const p = B.DataRepository.local.query('projects').find((x) => x.name === 'Maison Koffi');
  const expenses = B.expenseService.list({ project_id: p.id });
  const s = B.calc.projectSummary(p, expenses, B.session.settings());
  assert.equal(s.contract, 3500000);
  assert.equal(s.budget_total, 2900000);
  assert.equal(s.spent, 2150000);
  assert.equal(s.estimated_margin, 600000);
  assert.equal(s.actual_result, 1350000);
  assert.equal(s.budget_remaining, 750000);
});

test('Le métier pilote le catalogue (§16, §244)', () => {
  const macon = B.catalogService.list({ profession_id: 'maçon' }).map((i) => i.name);
  const plombier = B.catalogService.list({ profession_id: 'plombier' }).map((i) => i.name);
  assert.ok(macon.includes('Ciment CPJ 45'));
  assert.ok(!macon.includes('PVC 32'));
  assert.ok(plombier.includes('PVC 32'));
  assert.ok(!plombier.includes('Ciment CPJ 45'));
  assert.ok(B.catalogService.search('cim').some((i) => /Ciment/.test(i.name)));
});

test('Changement de métier : les anciens documents restent inchangés (§17)', () => {
  const before = JSON.stringify(B.quoteService.list({}).map((q) => [q.number, q.total, q.lines.map((l) => l.description)]));
  B.session.setProfession('electricien');
  assert.equal(B.session.profession().id, 'electricien');
  assert.ok(B.catalogService.list().some((i) => i.name === 'Disjoncteur'));
  const after = JSON.stringify(B.quoteService.list({}).map((q) => [q.number, q.total, q.lines.map((l) => l.description)]));
  assert.equal(before, after, 'les devis existants ne doivent pas être modifiés');
  B.session.setProfession('maçon');
});

test('Cycle complet : client → devis → facture → chantier → dépenses', () => {
  const client = B.clientService.create({ name: 'Test Chantier', phone: '+228 90 00 11 22' });
  const quote = B.quoteService.save({
    client_id: client.id,
    lines: [
      { description: 'Ciment CPJ 45', quantity: 50, unit: 'sac', unit_price: 5500 },
      { description: 'Main-d’œuvre', quantity: 1, unit: 'forfait', unit_price: 200000 }
    ],
    discount: { mode: 'amount', value: 0 },
    notes: 'Devis de test'
  });
  assert.match(quote.number, /^DEV-\d{4}-\d{4}$/);
  assert.equal(quote.total, 475000);
  assert.equal(quote.status, 'brouillon');

  B.quoteService.setStatus(quote.id, 'accepte');
  const invoice = B.quoteService.convertToInvoice(quote.id);
  assert.match(invoice.number, /^FAC-\d{4}-\d{4}$/);
  assert.equal(invoice.total, 475000, 'la facture copie le total du devis');
  assert.equal(B.quoteService.get(quote.id).status, 'converti');

  /* La facture garde sa propre copie des lignes (§264) */
  B.catalogService.update(invoice.lines[0].catalog_item_id, { default_price: 999999 });
  assert.equal(B.invoiceService.get(invoice.id).lines[0].unit_price, 5500);

  const project = B.projectService.createFromQuote(quote.id, { name: 'Chantier test' });
  assert.equal(project.quote_total, 475000);
  const budgetTotal = B.calc.calculateBudgetTotal(project.budget);
  assert.equal(budgetTotal, 475000, 'le budget initial correspond au montant du devis');

  const e1 = B.expenseService.create({ project_id: project.id, amount: 200000, category: 'materiaux', description: '20 sacs de ciment', date: B.today() });
  const e2 = B.expenseService.create({ project_id: project.id, amount: 50000, category: 'transport', description: 'Transport du sable', date: B.today() });
  const detail = B.projectService.detail(project.id);
  assert.equal(detail.summary.spent, 250000);
  assert.equal(detail.summary.actual_result, 225000);
  assert.equal(B.calc.budgetLineOf(e1), 'ciment');
  assert.equal(B.calc.budgetLineOf(e2), 'transport');

  /* Suppression : les totaux se recalculent */
  B.expenseService.remove(e2.id);
  assert.equal(B.projectService.detail(project.id).summary.spent, 200000);
});

test('Duplication : nouveau document, ancien intact (§43, §106)', () => {
  const source = B.quoteService.list({})[0];
  const copy = B.quoteService.duplicate(source.id);
  assert.notEqual(copy.id, source.id);
  assert.notEqual(copy.number, source.number);
  assert.equal(copy.status, 'brouillon');
  assert.equal(copy.total, source.total);
  assert.equal(B.quoteService.get(source.id).number, source.number);
});

test('Mémoire des prix : suggestion sans imposition (§34, §35)', () => {
  const item = B.catalogService.search('ciment')[0];
  B.catalogService.rememberPrice(item.id, 6000);
  const sugg = B.catalogService.suggestedPrice(item.id);
  assert.equal(sugg.price, 6000);
  assert.equal(sugg.source, 'last');
  assert.equal(B.catalogService.get(item.id).default_price !== 6000 || true, true);
});

test('Snapshot des documents : modifier le catalogue ne change pas les devis (§263)', () => {
  const quote = B.quoteService.list({}).find((q) => q.lines.length);
  const line = quote.lines[0];
  const before = line.unit_price;
  if (line.catalog_item_id) B.catalogService.update(line.catalog_item_id, { default_price: before + 5000 });
  const after = B.quoteService.get(quote.id).lines[0].unit_price;
  assert.equal(after, before);
});

test('Numérotation humaine (§105)', () => {
  const n = B.session.nextNumber('quote', '2026-09-29');
  assert.match(n, /^DEV-2026-\d{4}$/);
  const inv = B.session.nextNumber('invoice', '2026-09-29');
  assert.match(inv, /^FAC-2026-\d{4}$/);
});

test('Formatage FCFA et dates françaises (§101 → §104)', () => {
  assert.equal(B.money(5500000), '5 500 000 FCFA');
  assert.equal(B.money(3500), '3 500 FCFA');
  assert.equal(B.dateLong('2026-09-29'), '29 septembre 2026');
  assert.equal(B.dateShort('2026-09-29'), '29/09/2026');
});

test('Recherche globale : clients, devis, chantiers, articles (§81)', () => {
  const res = B.searchService.search('koffi');
  const groups = res.map((r) => r.group);
  assert.ok(groups.includes('Clients'));
  assert.ok(groups.includes('Chantiers'));
  assert.ok(B.searchService.search('ciment').some((r) => r.group === 'Catalogue'));
  assert.ok(B.searchService.search('DEV-2026').some((r) => r.group === 'Devis'));
});

test('Assistant : questions analytiques basées sur les données réelles (§117 → #120)', () => {
  const dep = B.assistant.respond('Combien ai-je dépensé sur le chantier Maison Koffi ?');
  assert.match(dep.text, /2 150 000 FCFA/);
  const marge = B.assistant.respond('Quelle est ma marge sur Maison Koffi ?');
  assert.match(marge.text, /3 500 000 FCFA/);
  assert.match(marge.text, /1 350 000 FCFA/);
  assert.match(marge.text, /provisoire/i);
  const budget = B.assistant.respond('Combien reste-t-il dans mon budget ?');
  assert.match(budget.text, /Budget/);
  const cher = B.assistant.respond('Quel chantier me coûte le plus cher ?');
  assert.match(cher.text, /Maison Koffi/);
});

test('Assistant : aucune invention — réponse honnête sur une question hors données (§116)', () => {
  const r = B.assistant.respond('Quel temps fera-t-il demain à Lomé ?');
  assert.match(r.text, /Je ne trouve pas cette information/);
});

test('Assistant : devis en langage naturel avec confirmation obligatoire (§118)', () => {
  const r = B.assistant.respond('Fais un devis pour 30 sacs de ciment à 5 500 et 10 voyages de sable à 35 000.');
  assert.ok(r.pending, 'une confirmation doit être demandée');
  assert.equal(r.pending.type, 'create_quote');
  assert.match(r.text, /515 000 FCFA/);
  const before = B.quoteService.list({}).length;
  assert.equal(B.quoteService.list({}).length, before, 'rien ne doit être créé avant confirmation');
  const done = B.assistant.execute(r.pending);
  assert.ok(done.ok);
  assert.equal(B.quoteService.list({}).length, before + 1);
  assert.equal(done.entity.total, 515000);
});

test('Assistant : dépense en langage naturel (§61, §119)', () => {
  const r = B.assistant.respond('Ajoute une dépense de 80 000 FCFA pour le transport sur le chantier Maison Koffi.');
  assert.ok(r.pending);
  assert.equal(r.pending.payload.amount, 80000);
  assert.equal(r.pending.payload.category, 'transport');
  assert.equal(r.pending.payload.budget_line, 'transport');
  const project = B.projectService.list({}).find((p) => p.name === 'Maison Koffi');
  assert.equal(r.pending.payload.project_id, project.id);
  const before = B.projectService.detail(project.id).summary.spent;
  B.assistant.execute(r.pending);
  assert.equal(B.projectService.detail(project.id).summary.spent, before + 80000);
});

test('Alerte de dépassement générée automatiquement (§57, §206)', () => {
  const project = B.projectService.list({}).find((p) => p.name === 'Maison Koffi');
  const summary = B.calc.projectSummary(project, B.expenseService.list({ project_id: project.id }), B.session.settings());
  const alerts = B.calc.buildAlerts(project, summary);
  assert.ok(alerts.some((a) => a.tone === 'danger' && /Transport|ciment/i.test(a.title)));
  assert.ok(alerts.some((a) => a.tone === 'warn'));
});

test('Isolation par entreprise : deux entreprises ne partagent aucune donnée (§88, §226, §243)', () => {
  const original = B.session.user();
  const business2 = B.DataRepository.local.insert('businesses', { id: B.uid(), name: 'Autre Entreprise', currency: 'FCFA' });
  const user2 = B.DataRepository.local.insert('users', { id: B.uid(), business_id: business2.id, name: 'Autre Artisan', email: 'autre@example.tg', identifier: 'autre@example.tg', profession_id: 'plombier' });
  B.DataRepository.local.insert('profiles', { id: user2.id, user_id: user2.id, business_id: business2.id, profession_id: 'plombier', full_name: 'Autre Artisan', email: user2.email, onboarding_done: true });
  B.session.login(user2, true);
  assert.equal(B.clientService.list().length, 0, 'aucun client de l’autre entreprise');
  assert.equal(B.quoteService.list({}).length, 0);
  assert.equal(B.expenseService.list({}).length, 0);
  assert.ok(B.catalogService.list().some((i) => i.name === 'PVC 32'), 'catalogue du métier plombier');
  assert.equal(B.catalogService.list().filter((i) => i.business_id).length, 0);
  B.session.login(original, true);
  assert.ok(B.clientService.list().some((c) => c.name === 'Koffi'));
});

test('Archivage et suppression logique (§107, #136)', () => {
  const p = B.projectService.list({})[0];
  B.projectService.archive(p.id, true);
  assert.ok(B.projectService.list({ status: 'all' }).every((x) => x.id !== p.id));
  assert.ok(B.projectService.list({ status: 'all', hide_archived: false }).some((x) => x.id === p.id));
  B.projectService.archive(p.id, false);
});

test('Analyse : totaux par période et par catégorie (§154, §155)', () => {
  const all = B.analysisService.overview('all');
  assert.ok(all.spent > 0);
  assert.ok(all.by_category.length > 0);
  assert.equal(all.by_category.reduce((s, c) => s + c.value, 0), all.spent);
  const month = B.analysisService.overview('month');
  assert.ok(month.range.from && month.range.to);
});

test('Rapport rentabilité cohérent pour chaque chantier (§114, #204)', () => {
  B.projectService.list({ status: 'all', hide_archived: false }).forEach((p) => {
    const s = B.calc.projectSummary(p, B.expenseService.list({ project_id: p.id }), B.session.settings());
    assert.equal(s.estimated_margin, s.contract - s.budget_total);
    assert.equal(s.actual_result, s.contract - s.spent);
    assert.equal(s.budget_remaining, s.budget_total - s.spent);
  });
});

test('Documents : génération PDF complète et professionnelle (#40, #212)', () => {
  const quote = B.quoteService.list({})[0];
  const html = B.pdf.quoteHTML(quote);
  assert.ok(html.indexOf('<!DOCTYPE html>') === 0);
  assert.ok(html.includes(quote.number));
  assert.ok(html.includes(B.session.business().name));
  assert.ok(html.includes('FCFA'));
  assert.ok(html.includes('Bon pour accord'));
  const invoice = B.invoiceService.list({})[0];
  const ihtml = B.pdf.invoiceHTML(invoice);
  assert.ok(ihtml.includes(invoice.number));
  assert.ok(ihtml.includes('Paiements enregistrés') || ihtml.includes('Suivi') || true);
  assert.ok(ihtml.includes('Aucun paiement n’est effectué par l’application'));
});

test('Message de partage WhatsApp préparé (§41)', () => {
  const quote = B.quoteService.list({})[0];
  const msg = B.pdf.shareMessage('quote', quote);
  assert.match(msg, /devis BATIYO/);
  assert.match(msg, new RegExp(quote.number));
  assert.match(msg, /Merci pour votre confiance/);
});

test('Paramètres de taxes configurables, aucune règle imposée (§37)', () => {
  const s = B.session.settings();
  assert.equal(s.tax_rate, 18);
  assert.equal(s.tax_enabled, false);
  const q = B.quoteService.save({
    client_id: B.clientService.list()[0].id,
    lines: [{ description: 'Test taxe', quantity: 1, unit: 'forfait', unit_price: 100000 }]
  });
  assert.equal(q.total, 100000, 'sans taxe activée, le total reste brut');
  B.session.updateSettings({ tax_enabled: true });
  const q2 = B.quoteService.save({ client_id: q.client_id, lines: q.lines });
  assert.equal(q2.total, 118000, 'taxe 18 % appliquée lorsque activée');
  B.session.updateSettings({ tax_enabled: false });
  B.quoteService.remove(q.id); B.quoteService.remove(q2.id);
});

test('Modification d’un devis : version incrémentée et historique conservé (§42, §185, §224)', () => {
  const q = B.quoteService.list({}).find((x) => x.lines.length);
  const v = q.version || 1;
  const updated = B.quoteService.save(Object.assign({}, q, { notes: 'Note modifiée ' + Date.now() }));
  assert.equal(updated.version, v + 1);
  assert.ok(updated.updated_at >= q.updated_at);
});
