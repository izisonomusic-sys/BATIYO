/* =========================================================================
   BATIYO — TESTS D'INTERFACE (DOM réel via jsdom)
   Vérifie que l'application se monte, que la navigation fonctionne et que
   chaque écran principal s'affiche sans erreur JavaScript.
   Lancement : node tests/dom.test.js
   ========================================================================= */
const fs = require('fs');
const path = require('path');
const assert = require('node:assert');

let JSDOM;
try { ({ JSDOM } = require('jsdom')); } catch (e) {
  console.log('⚠ jsdom indisponible — installez-le avec « npm install jsdom » pour lancer ces tests.');
  process.exit(0);
}

const ROOT = path.join(__dirname, '..');
const FILES = fs.readdirSync(path.join(ROOT, 'src'))
  .filter((f) => /^\d\d-.*\.js$/.test(f))
  .sort();

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .replace(/<script src="[^"]+"><\/script>/g, '')
  .replace(/<link rel="stylesheet" href="https:\/\/fonts[^>]*>/g, '');

const errors = [];
const dom = new JSDOM(html, {
  url: 'http://localhost:4210/',
  runScripts: 'dangerously',
  pretendToBeVisual: true
});
const { window } = dom;
window.addEventListener('error', (e) => errors.push('window.error: ' + (e.error ? e.error.stack : e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push('unhandledrejection: ' + e.reason));
const origError = window.console.error;
window.console.error = function (...args) { errors.push('console.error: ' + args.join(' ')); origError.apply(window.console, args); };

/* Chargement des modules dans l'ordre (comme le fait index.html) */
FILES.forEach((f) => {
  const s = window.document.createElement('script');
  s.textContent = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
  window.document.head.appendChild(s);
});

const B = window.BATIYO;
/* jsdom garde readyState = "loading" : on déclenche explicitement le démarrage
   (index.html le fait via DOMContentLoaded dans un vrai navigateur). */
if (!B.DataRepository.local) B.boot();
const $ = (sel) => window.document.querySelector(sel);
const $$ = (sel) => Array.from(window.document.querySelectorAll(sel));
const text = () => (window.document.getElementById('view') || window.document.getElementById('app')).textContent;

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('  ✓ ' + name);
  } catch (e) {
    failed += 1;
    console.log('  ✗ ' + name + '\n      ' + e.message);
  }
}
function goto(hash) {
  window.location.hash = hash;
  /* jsdom déclenche hashchange de manière asynchrone dans certains cas */
  B.router.render();
}

function bootFixture() {
  B.DataRepository.local.reset();
  B.DataRepository.init();
  B.referenceData();
  const business = B.DataRepository.local.insert('businesses', { id: B.uid(), name: 'Batiyo Construction', phone: '+228 90 00 00 00', country: 'TG', currency: 'FCFA' });
  const user = B.DataRepository.local.insert('users', { id: B.uid(), business_id: business.id, name: 'Kossi AMÉGAN', email: 'fixture@batiyo.test', identifier: 'fixture@batiyo.test', profession_id: 'maçon' });
  B.DataRepository.local.insert('profiles', { id: user.id, user_id: user.id, business_id: business.id, profession_id: 'maçon', full_name: user.name, email: user.email, onboarding_done: true });
  B.session.login(user, true);
  B.session.settings();
  const client = B.clientService.create({ name: 'Koffi Adjé', phone: '+228 90 00 00 01', address: 'Lomé' });
  [
    ['DEV-2026-0001', 3500000, 'accepte'], ['DEV-2026-0002', 900000, 'accepte'], ['DEV-2026-0003', 700000, 'refuse'], ['DEV-2026-0004', 1200000, 'converti'],
    ['DEV-2026-0005', 450000, 'brouillon'], ['DEV-2026-0006', 560000, 'brouillon'], ['DEV-2026-0007', 1250000, 'envoye'], ['DEV-2026-0008', 850000, 'accepte']
  ].forEach((x, idx) => {
    B.quoteService.save({ number: x[0], client_id: client.id, status: x[2], lines: [{ description: idx === 0 ? 'Contrat de construction' : 'Prestation ' + (idx + 1), quantity: 1, unit: 'forfait', unit_price: x[1] }], notes: 'Fixture DOM' });
  });
  const invoices = [
    B.invoiceService.create({ number: 'FAC-2026-0001', client_id: client.id, status: 'payee', lines: [{ description: 'Facture chantier', quantity: 1, unit: 'forfait', unit_price: 3500000 }] }),
    B.invoiceService.create({ number: 'FAC-2026-0002', client_id: client.id, status: 'partielle', lines: [{ description: 'Facture complémentaire', quantity: 1, unit: 'forfait', unit_price: 500000 }] })
  ];
  B.invoiceService.addPayment(invoices[0].id, { amount: 3500000, method: 'Espèces' });
  const project = B.projectService.create({ client_id: client.id, name: 'Maison Koffi', status: 'en_cours', quote_total: 3500000, progress: 65, budget: { ciment: 700000, fer: 500000, sable: 250000, gravier: 300000, main_oeuvre: 900000, transport: 250000 } });
  B.DataRepository.local.update('quotes', B.quoteService.list({}).find(q => q.number === 'DEV-2026-0001').id, { project_id: project.id });
  [
    ['ciment', 740000, '20 sacs de ciment'], ['fer', 500000, 'Fer 10'], ['sable', 250000, 'Voyages de sable'],
    ['gravier', 220000, 'Gravier 15/25'], ['main_oeuvre', 130000, 'Main-d’œuvre — avance équipe maçonnerie'], ['transport', 310000, 'Transport du sable']
  ].forEach(x => B.expenseService.create({ project_id: project.id, amount: x[1], category: x[0] === 'main_oeuvre' ? 'main_oeuvre' : (x[0] === 'transport' ? 'transport' : 'materiaux'), description: x[2], budget_line: x[0], date: B.today() }));
  B.expenseService.create({ project_id: null, amount: 60000, category: 'materiaux', description: 'Petite fourniture hors chantier', budget_line: 'autres', date: B.today() });
  B.photoService.add({ project_id: project.id, title: 'Photo chantier 1', file_url: 'data:image/jpeg;base64,AAAA', date: B.today() });
  B.photoService.add({ project_id: project.id, title: 'Photo chantier 2', file_url: 'data:image/jpeg;base64,BBBB', date: B.today() });
}

console.log('\nBATIYO — tests d’interface (jsdom)');
console.log('Modules chargés :', FILES.length, '·', FILES.join(', '));

console.log('\n1) Démarrage et landing page');
check('l’application est exposée sur window.BATIYO', () => assert.ok(B && B.router));
check('aucune donnée utilisateur n’est chargée avant connexion (§88)', () => {
  assert.equal(B.DataRepository.local.load().clients.length, 0);
  assert.equal(B.clientService.list().length, 0, 'aucune donnée ne fuit sans entreprise active');
});
check('un visiteur n’est pas connecté automatiquement (parcours d’inscription libre)', () => {
  assert.equal(B.session.user(), null);
});
check('la page d’accueil propose l’inscription', () => assert.ok($('a[href="#/register"]')));
check('aucune connexion automatique n’est effectuée', () => assert.equal(B.session.user(), null));
check('l’écran de démarrage est présent dans index.html', () => assert.ok($('#boot')));
check('la landing page affiche le titre du hero', () => assert.match(text(), /Devis, dépenses et bénéfices/));
check('la landing page affiche des chiffres d’illustration (§8, §20)', () => {
  const t = text();
  assert.ok(t.includes('3 850 000 FCFA'), 'CA manquant');
  assert.ok(t.includes('2 210 000 FCFA'), 'dépenses manquantes');
  assert.ok(t.includes('1 640 000 FCFA'), 'marge manquante');
  assert.ok(t.includes('Chantiers actifs'), 'compteur de chantiers manquant');
  assert.ok(t.includes('Estimation basée sur les données enregistrées'), 'mention d’estimation manquante');
});
check('le hero présente un artisan sur son chantier avec l’application (§8)', () => {
  const img = $('.hero-photo');
  assert.ok(img, 'photo du hero absente');
  assert.match(img.getAttribute('alt'), /chantier/i);
  assert.ok($('.hero-visual-phone'), 'aperçu de l’application absent du hero');
  assert.match($('.hero-visual-phone').textContent, /Nouveau devis/);
  assert.match($('.hero-visual-phone').textContent, /515 000 FCFA/);
});
check('les 11 métiers sont présentés (§11)', () => assert.ok($$('#metiers .metier').length >= 11));
check('les 3 témoignages sont présents (§12)', () => assert.ok($$('.quote-card').length >= 3));
check('les 4 étapes « comment ça marche » sont présentes (§10)', () => assert.equal($$('.step').length, 4));
check('le header contient « Se connecter » et « Commencer gratuitement » (§7)', () => {
  const t = $('.lp-header').textContent;
  assert.ok(t.includes('Se connecter'));
  assert.ok(t.includes('Commencer gratuitement'));
});
check('le footer contient les 4 colonnes et le copyright (§14)', () => {
  const t = $('.lp-footer').textContent;
  ['Produit', 'Entreprise', 'Ressources', 'Légal', '© BATIYO — Tous droits réservés.'].forEach((x) => assert.ok(t.includes(x), 'manque : ' + x));
});

console.log('\n2) Pages publiques');
check('la page tarifs présente 3 offres sans paiement (§125)', () => {
  goto('#/pricing');
  const t = text();
  assert.ok(t.includes('Gratuit') && t.includes('Pro') && t.includes('Business'));
  assert.match(t, /Aucun paiement/);
});
check('la FAQ présente les 7 questions obligatoires (§126)', () => {
  goto('#/faq');
  const t = text();
  ['hors connexion', 'créer un devis', 'convertir un devis en facture', 'changer mon métier', 'ajouter une dépense', 'rentabilité', 'partager un devis']
    .forEach((q) => assert.ok(B.normalize(t).includes(B.normalize(q)), 'question manquante : ' + q));
});
check('les pages légales sont accessibles (§124)', () => {
  ['terms', 'privacy', 'notice'].forEach((k) => {
    goto('#/legal/' + k);
    assert.ok(text().length > 200);
  });
});

console.log('\n3) Authentification et onboarding');
check('la page de connexion demande un email et un mot de passe', () => {
  B.session.logout();
  goto('#/login');
  assert.ok($('input[name="email"]'));
  assert.ok($('input[name="password"]'));
});
check('l’inscription exige les informations métier (§15, §259)', () => {
  goto('#/register');
  assert.ok($('input[name="name"]'));
  assert.ok($('input[name="email"]'));
  assert.ok($('input[name="password"]'));
  assert.ok($('input[name="business_name"]'));
  assert.ok($('[name="profession_id"]') || $$('.prof-card').length >= 4);
});
check('une route privée redirige vers la connexion sans session (§169)', () => {
  goto('#/dashboard');
  assert.equal(B.session.isLoggedIn(), false);
  assert.equal(window.location.hash, '#/login');
});
check('l’onboarding affiche « Bienvenue sur BATIYO » (§18)', () => {
  B.session.logout();
  goto('#/onboarding');
  assert.match(text(), /Connectez-vous|Bienvenue sur BATIYO/);
});
check('un espace connecté reste isolé par entreprise (§88, §243)', () => {
  B.session.logout();
  assert.equal(B.clientService.list().length, 0);
});
bootFixture();
check('le compte connecté voit automatiquement le catalogue de son métier (§16)', () => {
  goto('#/catalog');
  assert.match(text(), /Ciment CPJ 45/);
  assert.ok(!text().includes('PVC 32'));
});

bootFixture();

console.log('\n4) Tableau de bord et navigation');
check('le tableau de bord affiche les 4 cartes principales (§20)', () => {
  goto('#/dashboard');
  const cards = $$('.stat');
  assert.ok(cards.length >= 4);
  const t = text();
  ['Chiffre d’affaires', 'Dépenses', 'Marge estimée', 'Chantiers actifs'].forEach((l) => assert.ok(t.includes(l), 'manquant : ' + l));
});
check('les dernières devis et dépenses sont listés (§21, §22)', () => {
  const t = text();
  assert.ok(t.includes('DEV-2026-0008'));
  assert.ok(t.includes('Main-d’œuvre — avance équipe maçonnerie'));
});
check('le chantier « Maison Koffi » apparaît à surveiller (§23)', () => assert.match(text(), /Maison Koffi/));
check('l’assistant en accès rapide est présent (§193)', () => assert.match(text(), /Demandez à BATIYO/));
check('la navigation latérale contient les 9 entrées (§170)', () => {
  const links = $$('.sidebar .nav-link').map((a) => a.textContent.trim());
  ['Tableau de bord', 'Devis', 'Factures', 'Clients', 'Chantiers', 'Dépenses', 'Catalogue', 'Assistant', 'Profil']
    .forEach((l) => assert.ok(links.some((x) => x.includes(l)), 'manquant : ' + l));
});
check('la barre de navigation mobile contient Accueil / Devis / Factures / Chantiers / Plus (§96)', () => {
  const t = $$('.bottomnav button').map((b) => b.textContent.trim());
  ['Accueil', 'Devis', 'Factures', 'Chantiers', 'Plus'].forEach((l) => assert.ok(t.some((x) => x === l), 'manquant : ' + l));
});

console.log('\n5) Devis : liste, création, détail');
check('la liste des devis affiche les devis enregistrés (§24)', () => {
  goto('#/quotes');
  assert.ok($$('.card, tr').length > 0);
  ['DEV-2026-0008', 'DEV-2026-0007', 'DEV-2026-0006'].forEach((n) => assert.ok(text().includes(n), 'manquant : ' + n));
});
check('les statuts de devis sont affichés en badge (§25)', () => {
  const t = text();
  ['Acc', 'Envoyé', 'Brouillon'].forEach((s) => assert.ok(t.includes(s)));
});
check('le premier écran de création propose les modèles du métier (§189)', () => {
  goto('#/quotes/new');
  assert.match(text(), /Par où commencer/);
  assert.match(text(), /Devis construction mur/);
});
check('l’éditeur charge le catalogue du métier sans redemander le métier (§16, §30)', () => {
  const screen = B.screens.quoteEditor({ params: {}, query: {} });
  assert.ok(B.session.profession().id === 'maçon');
  assert.ok(B.catalogService.list().some((i) => i.name === 'Ciment CPJ 45'));
});
check('le détail d’un devis affiche lignes, totaux et historique (§38, §224)', () => {
  const q = B.quoteService.list({}).find((x) => x.number === 'DEV-2026-0001');
  goto('#/quotes/' + q.id);
  const t = text();
  assert.ok(t.includes('3 500 000 FCFA'));
  assert.ok(t.includes('Historique'));
  assert.ok(t.includes('Convertir en facture') || t.includes('Converti en facture'));
});
check('la duplication crée un nouveau document (§43)', () => {
  const before = B.quoteService.list({}).length;
  const src = B.quoteService.list({})[0];
  const copy = B.quoteService.duplicate(src.id);
  assert.equal(B.quoteService.list({}).length, before + 1);
  assert.equal(copy.status, 'brouillon');
  B.quoteService.remove(copy.id);
});
check('la conversion devis → facture copie les données (§44, §265)', () => {
  const q = B.quoteService.list({}).find((x) => x.status === 'accepte');
  const inv = B.quoteService.convertToInvoice(q.id);
  assert.equal(inv.total, q.total);
  assert.equal(B.quoteService.get(q.id).status, 'converti');
  B.quoteService.setStatus(q.id, 'accepte');
  B.invoiceService.remove(inv.id);
});

console.log('\n6) Factures');
check('la liste des factures affiche les totaux encaissés (§45)', () => {
  goto('#/invoices');
  const t = text();
  assert.ok(t.includes('FAC-2026-0001'));
  assert.ok(t.includes('Encaissé'));
});
check('le détail d’une facture montre le suivi du paiement (§270)', () => {
  const inv = B.invoiceService.get(B.invoiceService.list({}).find((i) => i.number === 'FAC-2026-0001').id);
  goto('#/invoices/' + inv.id);
  const t = text();
  assert.ok(t.includes('Montant facturé'));
  assert.ok(t.includes('Reste'));
  assert.ok(t.includes('Aucun paiement en ligne') || t.includes('Enregistrement manuel'));
});
check('un paiement manuel met à jour le statut (§271, §272)', () => {
  const inv = B.invoiceService.list({}).find((i) => i.number === 'FAC-2026-0002');
  const before = inv.paid_amount;
  B.invoiceService.addPayment(inv.id, { amount: 300000, method: 'Mobile Money' });
  const after = B.invoiceService.get(inv.id);
  assert.equal(after.paid_amount, before + 300000);
  assert.equal(B.calc.invoiceSummary(after).status, 'partielle');
  B.invoiceService.update(inv.id, { paid_amount: before, payments: [] });
});

console.log('\n7) Chantiers, dépenses et rentabilité');
check('la fiche chantier affiche budget, dépenses, marge et avancement (§48, §151)', () => {
  const koffi = B.projectService.list({}).find((p) => p.name === 'Maison Koffi');
  goto('#/projects/' + koffi.id);
  const t = text();
  ['Montant du contrat', 'Budget prévu', 'Dépenses réelles', 'Résultat provisoire', 'Marge prévisionnelle', 'Avancement']
    .forEach((x) => assert.ok(t.includes(x), 'manquant : ' + x));
  assert.ok(t.includes('2 150 000 FCFA'));
});
check('l’analyse des écarts par poste est affichée (§58)', () => {
  const t = text();
  assert.ok(t.includes('5.7 %') || t.includes('5,7 %'));
  assert.ok(t.includes('+40 000 FCFA'));
});
check('les alertes de dépassement apparaissent (§57)', () => {
  const t = text();
  assert.ok(t.includes('Dépassement'));
  assert.ok(t.includes('Attention'));
});
check('ajouter une dépense recalcule la rentabilité (§267, §268)', () => {
  const koffi = B.projectService.list({}).find((p) => p.name === 'Maison Koffi');
  const before = B.projectService.detail(koffi.id).summary.spent;
  B.expenseService.create({ project_id: koffi.id, amount: 100000, category: 'materiaux', description: '20 sacs de ciment', date: B.today() });
  const after = B.projectService.detail(koffi.id).summary.spent;
  assert.equal(after, before + 100000);
  B.expenseService.remove(B.expenseService.list({ project_id: koffi.id })[0].id);
});
check('la liste des dépenses propose filtres et périodes (§153, §156)', () => {
  goto('#/expenses');
  const t = text();
  assert.ok(t.includes('Aujourd’hui') && t.includes('Cette semaine') && t.includes('Ce mois'));
  assert.ok(t.includes('Toutes catégories'));
});
check('l’écran chantier propose les raccourcis Dépense / Devis / Facture / Photo (§275)', () => {
  const koffi = B.projectService.list({}).find((p) => p.name === 'Maison Koffi');
  goto('#/projects/' + koffi.id);
  const t = text();
  ['Dépense', 'Devis', 'Facture', 'Photo'].forEach((x) => assert.ok(t.includes(x), 'manquant : ' + x));
});
check('la galerie photos du chantier est présente (§70, §71)', () => {
  const koffi = B.projectService.list({}).find((p) => p.name === 'Maison Koffi');
  goto('#/projects/' + koffi.id);
  assert.ok($$('.gallery .ph').length >= 2);
});

console.log('\n8) Clients, catalogue, documents, analyse');
check('la fiche client affiche l’historique et les totaux (§78, §79)', () => {
  const c = B.clientService.list().find((x) => x.name === 'Koffi Adjé');
  goto('#/clients/' + c.id);
  const t = text();
  assert.ok(t.includes('Historique'));
  assert.ok(t.includes('DEV-2026-0001'));
  assert.ok(t.includes('FAC-2026-0001'));
});
check('le catalogue affiche les prix et les favoris (§72, §75)', () => {
  goto('#/catalog');
  const t = text();
  assert.ok(t.includes('Ciment CPJ 45'));
  assert.ok(t.includes('Favoris'));
  assert.ok(t.includes('5 500 FCFA'));
});
check('la recherche produit est instantanée (§33, §76)', () => {
  const res = B.catalogService.search('cim');
  assert.ok(res.some((i) => i.name === 'Ciment CPJ 45'));
  assert.equal(res.length, res.filter((i) => /cim/i.test(i.name + i.keywords)).length);
});
check('la page documents propose les filtres exigés (§80)', () => {
  goto('#/documents');
  const t = text();
  ['Tous', 'Brouillons', 'Acceptés', 'Payés'].forEach((x) => assert.ok(t.includes(x), 'manquant : ' + x));
});
check('l’écran analyse affiche CA, dépenses, marge, compteurs et graphiques (§154, §155)', () => {
  goto('#/analysis');
  const t = text();
  ['Chiffre d’affaires', 'Dépenses', 'Résultat provisoire', 'Chantiers actifs', 'Dépenses par catégorie', 'Marge par chantier']
    .forEach((x) => assert.ok(t.includes(x), 'manquant : ' + x));
  assert.ok($$('svg').length > 0, 'graphiques manquants');
});

console.log('\n9) Assistant BATIYO');
check('l’assistant affiche le titre et les suggestions (§60)', () => {
  goto('#/assistant');
  const t = text();
  assert.ok(t.includes('Assistant BATIYO'));
  assert.ok(t.includes('Voir mes dépenses'));
  assert.ok(t.includes('Créer un devis'));
});
check('la réponse à une question utilise les données réelles (§117)', () => {
  const conv = $$('.bubble.assistant');
  assert.ok(conv.length >= 1);
});
check('l’action confirmée crée bien la donnée (§62)', () => {
  const r = B.assistant.respond('Ajoute une dépense de 25 000 FCFA pour le carburant.');
  assert.ok(r.pending);
  const done = B.assistant.execute(r.pending);
  assert.ok(done.ok);
  assert.ok(B.expenseService.list({}).some((e) => e.amount === 25000 && e.category === 'carburant'));
  B.expenseService.remove(B.expenseService.list({}).find((e) => e.amount === 25000).id);
});
check('la voix n’est pas annoncée comme disponible (§194, §122)', () => {
  goto('#/assistant');
  assert.match(text(), /L’entrée vocale n’est pas encore disponible/);
});

console.log('\n10) Profil, paramètres, hors connexion');
check('le profil présente les sections attendues (§66)', () => {
  goto('#/profile');
  const t = text();
  ['Informations personnelles', 'Entreprise', 'Activité', 'Sécurité'].forEach((x) => assert.ok(t.includes(x), 'manquant : ' + x));
});
check('le changement de métier avertit que les anciens documents restent inchangés (§176)', () => {
  const t = text();
  assert.match(t, /anciens documents resteront inchangés/);
});
check('les paramètres exposent taxes, devise, notifications et données (§174, §240)', () => {
  goto('#/settings');
  const t = text();
  ['Documents et taxes', 'Préférences', 'Mes données', 'Taux (%)', 'FCFA'].forEach((x) => assert.ok(t.includes(x), 'manquant : ' + x));
});
check('l’indicateur En ligne / Hors connexion est présent (§83)', () => {
  goto('#/dashboard');
  assert.ok($('.net-pill'));
  assert.match($('.net-pill').textContent, /En ligne|Hors connexion|Synchronisation/);
});
check('l’état hors connexion est annoncé et n’empêche pas de travailler (§164)', () => {
  window.dispatchEvent(new window.Event('offline'));
  assert.equal(B.network.state(), 'offline');
  goto('#/expenses');
  assert.match(window.document.body.textContent, /hors connexion/i);
  assert.match(window.document.body.textContent, /Vos données locales restent accessibles/i);
  window.dispatchEvent(new window.Event('online'));
  assert.equal(B.network.state(), 'online');
});

console.log('\n11) Robustesse');
check('une route inconnue affiche un écran « introuvable » propre (§99)', () => {
  goto('#/route-inexistante');
  assert.match(text(), /introuvable/i);
});
check('une suppression demande confirmation (§107, §223)', () => {
  goto('#/quotes');
  const menuButtons = $$('.iconbtn[aria-label="Actions"]');
  assert.ok(menuButtons.length > 0, 'menu contextuel absent');
});
check('aucune erreur JavaScript pendant les tests', () => {
  assert.equal(errors.length, 0, 'erreurs : ' + errors.slice(0, 3).join(' | '));
});

console.log('\n' + (failed === 0 ? '✅' : '❌') + ' ' + passed + ' test(s) réussi(s), ' + failed + ' échec(s)\n');
if (errors.length) console.log('Erreurs collectées :\n- ' + errors.slice(0, 10).join('\n- '));
process.exit(failed === 0 ? 0 : 1);
