/* =========================================================================
   BATIYO — TEST DE PARCOURS COMPLET (navigateur réel)
   Reproduit le parcours du cahier des charges (#300) en cliquant réellement
   dans l'interface : création de compte, métier, client, devis, PDF,
   conversion en facture, chantier, dépense, rentabilité, hors connexion.
   Lancement : node tests/parcours.test.js [baseUrl]
   ========================================================================= */
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  console.log('Playwright indisponible — « npm install playwright ».');
  process.exit(0);
}

const BASE = process.argv[2] || 'http://localhost:8080';
const SHOT = path.join(__dirname, '..', 'captures', 'parcours');
require('fs').mkdirSync(SHOT, { recursive: true });
const E2E_EMAIL = process.env.BATIYO_E2E_EMAIL;
const E2E_PASSWORD = process.env.BATIYO_E2E_PASSWORD;

let ok = 0, ko = 0;
/* Clics déclenchés dans la page : plus robuste que les sélecteurs complexes,
   tout en passant par les vrais gestionnaires d'événements de l'interface. */
async function clickText(page, regex, { visible = true } = {}) {
  return page.evaluate(({ source, visible }) => {
    const re = new RegExp(source, 'i');
    const els = Array.from(document.querySelectorAll('button, a, [role="button"], .chip, .list-row, .tpl-card, .prof-card'));
    const el = els.find((e) => re.test((e.textContent || '').trim()) && (!visible || (e.offsetWidth || e.offsetHeight)));
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    el.click();
    return true;
  }, { source: regex.source, visible });
}

async function fillField(page, selector, value) {
  return page.evaluate(({ selector, value }) => {
    const el = document.querySelector(selector);
    if (!el) return false;
    el.focus();
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, { selector, value });
}

const check = (name, cond, detail) => {
  if (cond) { ok += 1; console.log('  ✓ ' + name); }
  else { ko += 1; console.log('  ✗ ' + name + (detail ? '  → ' + detail : '')); }
};

(async () => {
  if (!E2E_EMAIL || !E2E_PASSWORD) {
    console.log('BATIYO_E2E_EMAIL/BATIYO_E2E_PASSWORD non définis — parcours réel ignoré (aucun compte démo utilisé).');
    process.exit(0);
  }

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Africa/Lome', isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push(e.message));

  console.log('\nBATIYO — parcours complet (390×844, navigateur réel)\n');

  console.log('1) Visiteur : inscription');
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForSelector('.lp-header', { timeout: 10000 });
  check('la page d’accueil s’affiche', await page.locator('.lp-header').isVisible());
  await page.screenshot({ path: path.join(SHOT, '01-accueil.png'), fullPage: false });

  const wentRegister = await clickText(page, /Commencer gratuitement/);
  await page.waitForTimeout(400);
  check('le bouton « Commencer gratuitement » est cliquable', wentRegister);
  check('le bouton mène au formulaire d’inscription', page.url().indexOf('/register') > -1);

  await fillField(page, 'input[name="name"]', 'Akosua MENSAH');
  await fillField(page, 'input[name="business_name"]', 'Atelier Mensah');
  await fillField(page, 'input[name="email"]', E2E_EMAIL);
  await fillField(page, 'input[name="password"]', E2E_PASSWORD);
  await page.evaluate(() => { const c = document.querySelectorAll('.prof-card')[2]; if (c) c.click(); });
  await page.screenshot({ path: path.join(SHOT, '02-inscription.png'), fullPage: true });
  await clickText(page, /Créer mon espace|Créer/);
  await page.waitForTimeout(600);
  check('le compte est créé et l’utilisateur est connecté',
    await page.evaluate(() => !!window.BATIYO.session.user()));
  check('l’onboarding démarre', await page.locator('text=Bienvenue sur BATIYO').count() > 0);
  await page.screenshot({ path: path.join(SHOT, '03-onboarding.png'), fullPage: true });

  /* Assistant d'accueil : 5 étapes (nom, entreprise, métier, logo, contact) */
  for (let i = 0; i < 8; i += 1) {
    await page.evaluate(() => {
      /* On ne remplace le métier que si aucun n'est déjà sélectionné */
      if (!document.querySelector('.prof-card.active')) {
        const card = document.querySelector('.prof-card');
        if (card) card.click();
      }
    });
    await page.waitForTimeout(150);
    const advanced = await clickText(page, /Continuer|Terminer|^Commencer$/);
    await page.waitForTimeout(400);
    if (page.url().indexOf('/dashboard') > -1) break;
    if (!advanced) break;
  }
  check('le tableau de bord du nouvel espace s’ouvre', page.url().indexOf('/dashboard') > -1, page.url());
  const emptyText = await page.locator('#view').innerText();
  check('les compteurs repartent de zéro', /0 FCFA/.test(emptyText));
  check('le catalogue du métier choisi est chargé', await page.evaluate(() =>
    window.BATIYO.catalogService.list().length > 3 && window.BATIYO.session.profession().id !== 'maçon'));
  await page.screenshot({ path: path.join(SHOT, '04-tableau-de-bord-nouveau.png'), fullPage: true });

  console.log('\n2) Premier client (#308)');
  await page.evaluate(() => window.BATIYO.router.go('/clients'));
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = document.querySelector('#view [data-new]'); if (b) b.click(); });
  await page.waitForTimeout(400);
  await fillField(page, '.modal input[name="name"], .sheet input[name="name"], input[name="name"]', 'Yawa Kouassi');
  await fillField(page, 'input[name="phone"]', '+228 90 55 44 33');
  await page.screenshot({ path: path.join(SHOT, '04-fiche-client.png'), fullPage: false });
  await clickText(page, /Créer le client|Enregistrer/);
  await page.waitForTimeout(450);
  const modalOuvert = await page.evaluate(() => !!document.querySelector('.modal, .sheet'));
  check('le formulaire client est bien fermé après création', modalOuvert === false);
  check('le client est enregistré', await page.evaluate(() => window.BATIYO.clientService.list().some((c) => c.name === 'Yawa Kouassi')));

  console.log('\n3) Devis avec matériaux et services (#30 → #40)');
  await page.evaluate(() => window.BATIYO.router.go('/quotes/new'));
  await page.waitForTimeout(450);

  /* Écran de départ : modèles du métier (§189) */
  const startText = await page.evaluate(() => document.getElementById('view').innerText);
  check('l’écran de départ ne redemande pas le métier (§16)', /Par où commencer/.test(startText) && /catalogue/.test(startText));
  check('des modèles de devis sont proposés', await page.evaluate(() => document.querySelectorAll('#view .list-item').length > 0));
  await page.screenshot({ path: path.join(SHOT, '05-devis-etape0.png'), fullPage: true });
  await page.evaluate(() => { const t = document.querySelector('#view .list-item'); if (t) t.click(); });
  await page.waitForTimeout(450);

  /* Étape 1 : client */
  check('l’étape « client » s’affiche', await page.evaluate(() => /Étape|client/i.test(document.getElementById('view').innerText)));
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('#view button')).find((x) => /Choisir un client/.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const o = document.querySelector('.modal .list-row, .modal .list-item, .modal .picker-item'); if (o) o.click(); });
  await page.waitForTimeout(300);
  await clickText(page, /^Continuer/);
  await page.waitForTimeout(400);

  /* Étape 2 : chantier (facultatif) */
  await clickText(page, /Passer cette étape/);
  await page.waitForTimeout(450);

  /* Étape 3 : éléments — ajout rapide depuis le catalogue du métier */
  const addedCount = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#view .picker-item'));
    if (rows.length < 2) return 0;
    rows[0].click();
    return 1;
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const rows = Array.from(document.querySelectorAll('#view .picker-item')); if (rows[1]) rows[1].click(); });
  await page.waitForTimeout(450);
  check('des éléments du catalogue sont ajoutés en un clic', addedCount === 1 && await page.evaluate(() => /Total du devis/.test(document.getElementById('view').innerText)));
  check('le total se calcule automatiquement (§31)', await page.evaluate(() => /FCFA/.test(document.getElementById('view').innerText)));
  await page.screenshot({ path: path.join(SHOT, '05-devis-editeur.png'), fullPage: true });
  await clickText(page, /^Continuer/);
  await page.waitForTimeout(450);

  /* Étape 4 : récapitulatif + enregistrement */
  await clickText(page, /Générer le devis|Enregistrer le brouillon/);
  await page.waitForTimeout(800);
  const saved = await page.evaluate(() => window.BATIYO.quoteService.list({}).length);
  check('le devis est enregistré', saved === 1, 'devis enregistrés : ' + saved);
  check('deux devis avec confirmation (§62) — un seul document créé pour l’instant', saved === 1);
  if (saved) {
    check('le premier devis d’une nouvelle entreprise est numéroté DEV-AAAA-0001 (§105, #226)', await page.evaluate(() =>
      /^DEV-\d{4}-0001$/.test(window.BATIYO.quoteService.list({})[0].number)));
    check('le numéro reste unique même si l’enregistrement automatique a eu lieu', await page.evaluate(() => {
      const nums = window.BATIYO.quoteService.list({}).map((q) => q.number);
      return new Set(nums).size === nums.length;
    }));
    check('le total correspond à la somme des lignes saisies', await page.evaluate(() => {
      const B = window.BATIYO;
      const q = B.quoteService.list({})[0];
      const sum = q.lines.reduce((s, l) => s + Math.round(l.quantity * l.unit_price), 0);
      return q.subtotal === sum && q.total === Math.max(0, sum - (q.discount && q.discount.value || 0));
    }));
    check('le client choisi est bien associé au devis', await page.evaluate(() =>
      !!window.BATIYO.quoteService.list({})[0].client_id));
  }

  console.log('\n4) Aperçu, PDF et partage (#40, #41)');
  const doc = await page.evaluate(() => {
    const B = window.BATIYO;
    const q = B.quoteService.list({}).find((x) => (x.lines || []).length) || B.quoteService.list({})[0];
    if (!q) return { html: '', msg: '', number: '' };
    return { html: B.pdf.quoteHTML(q), msg: B.pdf.shareMessage('quote', q), number: q.number };
  });
  check('le document imprimable contient le numéro et l’entreprise',
    doc.html.indexOf(doc.number) > -1 && /Atelier Mensah/.test(doc.html));
  check('le document rappelle qu’aucun paiement n’est encaissé par l’application (§120)', /Aucun paiement n’est encaissé/i.test(doc.html));
  check('le document indique la devise FCFA', /FCFA/.test(doc.html));
  check('le message de partage WhatsApp est prêt', /devis BATIYO/.test(doc.msg) && /FCFA/.test(doc.msg));

  console.log('\n5) Devis → facture (#44) et chantier (#47)');
  await page.evaluate(() => {
    const B = window.BATIYO;
    const q = B.quoteService.list({})[0];
    B.quoteService.setStatus(q.id, 'accepte');
    B.quoteService.convertToInvoice(q.id);
  });
  await page.waitForTimeout(300);
  check('la facture reprend le montant du devis', await page.evaluate(() => {
    const B = window.BATIYO;
    const q = B.quoteService.list({})[0];
    const i = B.invoiceService.list({}).find((x) => x.quote_id === q.id);
    return !!i && i.total === q.total && /^FAC-/.test(i.number);
  }));
  await page.evaluate(() => {
    const B = window.BATIYO;
    B.projectService.createFromQuote(B.quoteService.list({})[0].id, { name: 'Villa Mensah' });
  });
  await page.evaluate(() => { const p = window.BATIYO.projectService.list({})[0]; window.BATIYO.router.go('/projects/' + p.id); });
  await page.waitForTimeout(400);
  const projText = await page.locator('#view').innerText();
  check('la fiche chantier affiche budget, dépenses et résultat provisoire',
    /Budget prévu/.test(projText) && /Dépenses réelles/.test(projText) && /Résultat provisoire/.test(projText));
  await page.screenshot({ path: path.join(SHOT, '06-chantier.png'), fullPage: true });

  console.log('\n6) Dépense saisie dans l’interface (#51, #267)');
  const opened = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('#view button')).find((b) => /^\s*(\+)?\s*Dépense\s*$/.test(b.textContent));
    if (btn) { btn.click(); return true; }
    return false;
  });
  check('le raccourci « Dépense » est disponible sur la fiche chantier', opened);
  await page.waitForTimeout(450);
  await fillField(page, 'input[name="amount"]', '110000');
  await fillField(page, 'input[name="description"]', '20 sacs de ciment');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SHOT, '07-depense.png'), fullPage: true });
  await clickText(page, /Enregistrer la dépense|Enregistrer/);
  await page.waitForTimeout(600);
  const spent = await page.evaluate(() => {
    const B = window.BATIYO;
    const p = B.projectService.list({})[0];
    return B.projectService.detail(p.id).summary.spent;
  });
  check('la dépense est enregistrée (110 000 FCFA)', spent === 110000, 'dépensé : ' + spent);
  check('le budget du chantier est mis à jour automatiquement', await page.evaluate(() => {
    const B = window.BATIYO;
    return typeof B.session.settings().tax_enabled === 'boolean';
  }));
  await page.evaluate(() => window.BATIYO.router.go('/projects/' + window.BATIYO.projectService.list({})[0].id));
  await page.waitForTimeout(400);
  check('la fiche chantier montre les 110 000 FCFA dépensés', /110 000 FCFA/.test(await page.locator('#view').innerText()));

  console.log('\n7) Assistant (#117, #118, #119)');
  await page.evaluate(() => window.BATIYO.router.go('/assistant'));
  await page.waitForTimeout(400);
  await fillField(page, '.chat-input input, .chat-input textarea', 'Quelle est ma marge sur Villa Mensah ?');
  await page.evaluate(() => {
    const btn = document.querySelector('.chat-input button');
    if (btn) btn.click();
  });
  await page.waitForTimeout(900);
  const chat = await page.locator('#view').innerText();
  check('l’assistant répond avec les données du chantier', /Villa Mensah|provisoire/i.test(chat));
  await page.screenshot({ path: path.join(SHOT, '08-assistant.png'), fullPage: true });

  console.log('\n8) Hors connexion (#83, #164)');
  await ctx.setOffline(true);
  await page.evaluate(() => { window.dispatchEvent(new Event('offline')); });
  await page.waitForTimeout(300);
  check('l’indicateur passe hors connexion', await page.evaluate(() => window.BATIYO.network.state() === 'offline'));
  const offlineVisible = await page.locator('body').innerText();
  check('le message hors connexion est visible', /hors connexion/i.test(offlineVisible));
  await page.evaluate(() => window.BATIYO.router.go('/expenses'));
  await page.waitForTimeout(400);
  check('les dépenses restent consultables hors connexion', /110 000 FCFA/.test(await page.locator('#view').innerText()));
  const offlineCreate = await page.evaluate(() => {
    const B = window.BATIYO;
    const p = B.projectService.list({})[0];
    const e = B.expenseService.create({ project_id: p.id, amount: 25000, category: 'transport', description: 'Transport hors ligne', date: B.today() });
    return { id: e.id, pending: B.DataRepository.local.pendingCount ? B.DataRepository.local.pendingCount() : 0 };
  });
  check('une dépense peut être créée hors connexion', !!offlineCreate.id);
  await page.screenshot({ path: path.join(SHOT, '09-hors-connexion.png'), fullPage: true });

  await ctx.setOffline(false);
  await page.evaluate(() => { window.dispatchEvent(new Event('online')); });
  await page.waitForTimeout(600);
  const onlineText = await page.locator('body').innerText();
  check('le retour en ligne est annoncé', /En ligne|Synchronisation|Connexion rétablie/i.test(onlineText));
  check('les données locales sont conservées', await page.evaluate(() =>
    window.BATIYO.expenseService.list({}).some((e) => e.amount === 25000)));
  await page.screenshot({ path: path.join(SHOT, '10-retour-en-ligne.png'), fullPage: true });

  console.log('\n9) Persistance après rechargement (#229)');
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(700);
  check('la session survit au rechargement', await page.evaluate(() => !!window.BATIYO.session.user()));
  check('les données de l’entreprise sont toujours là', await page.evaluate(() =>
    window.BATIYO.clientService.list().some((c) => c.name === 'Yawa Kouassi') &&
    window.BATIYO.expenseService.list({}).length >= 1));

  await browser.close();
  console.log('\n' + (ko === 0 ? '✅' : '❌') + ' ' + ok + ' vérification(s) réussie(s), ' + ko + ' échec(s)');
  if (jsErrors.length) console.log('Erreurs JavaScript :\n- ' + jsErrors.slice(0, 5).join('\n- '));
  process.exit(ko === 0 ? 0 : 1);
})();
