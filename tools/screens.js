/* BATIYO — captures d'écran et vérification visuelle (Playwright)
   Usage : node tools/screens.js [baseUrl] [dossierSortie]
   Parcourt les écrans clés en mobile (390px) et desktop (1440px), capture les
   images et signale : erreurs JS, débordement horizontal, textes trop petits. */
const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  console.log('Playwright indisponible — « npm install playwright ».');
  process.exit(0);
}

const BASE = process.argv[2] || 'http://localhost:8080';
const OUT = path.join(__dirname, '..', process.argv[3] || 'captures');
const E2E_EMAIL = process.env.BATIYO_E2E_EMAIL;
const E2E_PASSWORD = process.env.BATIYO_E2E_PASSWORD;
fs.mkdirSync(OUT, { recursive: true });

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

const PUBLIC_SCREENS = [
  ['landing', '/'],
  ['tarifs', '/pricing'],
  ['faq', '/faq'],
  ['connexion', '/login'],
  ['inscription', '/register'],
  ['legal', '/legal/terms']
];
const APP_SCREENS = [
  ['dashboard', '/dashboard'],
  ['devis-liste', '/quotes'],
  ['devis-nouveau', '/quotes/new'],
  ['devis-editeur', 'AUTO:quote-edit'],
  ['devis-detail', 'AUTO:quote'],
  ['facture-detail', 'AUTO:invoice'],
  ['client-detail', 'AUTO:client'],
  ['chantier-detail', 'AUTO:project'],
  ['onboarding', '/onboarding'],
  ['factures', '/invoices'],
  ['clients', '/clients'],
  ['chantiers', '/projects'],
  ['depenses', '/expenses'],
  ['catalogue', '/catalog'],
  ['assistant', '/assistant'],
  ['analyse', '/analysis'],
  ['documents', '/documents'],
  ['profil', '/profile'],
  ['parametres', '/settings'],
  ['introuvable', '/route-inexistante']
];

(async () => {
  const browser = await chromium.launch();
  const problems = [];
  const results = [];

  async function shoot(ctxName, viewport, screens, { logged }) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: 'fr-FR', timezoneId: 'Africa/Lome' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|manifest/i.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(BASE + '/index.html', { waitUntil: 'load' });
    await page.waitForTimeout(500);
    if (logged) {
      if (!E2E_EMAIL || !E2E_PASSWORD) {
        results.push({ ctx: ctxName, screen: 'auth-skip', route: 'auth', errors: [], overflow: 0, small: 0, interactive: 0, height: 0, view: 0 });
        await ctx.close();
        return;
      }
      const loginOk = await page.evaluate(async ({ email, password }) => {
        const r = await window.BATIYO.session.login(email, password);
        if (r.ok) window.BATIYO.router.go('/dashboard');
        return r.ok;
      }, { email: E2E_EMAIL, password: E2E_PASSWORD });
      await page.waitForTimeout(400);
      if (!loginOk) {
        results.push({ ctx: ctxName, screen: 'auth-skip', route: 'auth', errors: ['échec de connexion E2E'], overflow: 0, small: 0, interactive: 0, height: 0, view: 0 });
        await ctx.close();
        return;
      }
    }
    const ids = await page.evaluate(() => {
      if (!window.BATIYO.session.isLoggedIn()) return {};
      const q = window.BATIYO.quoteService.list({}).find((x) => x.number === 'DEV-2026-0008') || window.BATIYO.quoteService.list({})[0];
      const i = window.BATIYO.invoiceService.list({})[0];
      const c = window.BATIYO.clientService.list()[0];
      const p = window.BATIYO.projectService.list({})[0];
      return { 'quote-edit': '/quotes/' + q.id + '/edit', quote: '/quotes/' + q.id, invoice: '/invoices/' + i.id, client: '/clients/' + c.id, project: '/projects/' + p.id };
    });
    for (const [name, rawRoute] of screens) {
      errors.length = 0;
      const route = rawRoute.indexOf('AUTO:') === 0 ? ids[rawRoute.slice(5)] : rawRoute;
      await page.evaluate((r) => window.BATIYO.router.go(r), route);
      await page.waitForTimeout(320);
      const file = path.join(OUT, ctxName + '--' + name + '.png');
      await page.screenshot({ path: file, fullPage: true });
      const audit = await page.evaluate(() => {
        const de = document.documentElement;
        const overflow = de.scrollWidth - de.clientWidth;
        let small = 0;
        document.querySelectorAll('body *').forEach((el) => {
          if (!el.offsetParent && el.tagName !== 'BODY') return;
          const fs = parseFloat(getComputedStyle(el).fontSize);
          const txt = (el.textContent || '').trim();
          if (txt && el.children.length === 0 && fs < 11) small += 1;
        });
        const interactive = document.querySelectorAll('button, a, [role="button"]').length;
        return { overflow, small, interactive, height: de.scrollHeight, view: (document.getElementById('view') || document.body).textContent.trim().length };
      });
      results.push({ ctx: ctxName, screen: name, route, errors: errors.slice(), ...audit });
      if (errors.length) problems.push(ctxName + '/' + name + ' → ' + errors.join(' | '));
      if (audit.overflow > 2) problems.push(ctxName + '/' + name + ' → débordement horizontal de ' + audit.overflow + 'px');
      if (audit.small > 0) problems.push(ctxName + '/' + name + ' → ' + audit.small + ' texte(s) < 11px');
      if (audit.view < 40) problems.push(ctxName + '/' + name + ' → écran vide');
    }
    await ctx.close();
  }

  await shoot('mobile', MOBILE, PUBLIC_SCREENS, { logged: false });
  await shoot('mobile', MOBILE, APP_SCREENS, { logged: true });
  await shoot('desktop', DESKTOP, [['dashboard', '/dashboard'], ['devis-liste', '/quotes'], ['devis-editeur', '/quotes/01'], ['chantiers', '/projects'], ['analyse', '/analysis'], ['assistant', '/assistant'], ['depenses', '/expenses'], ['profil', '/profile']], { logged: true });
  await shoot('tablette', { width: 1024, height: 768 }, [['dashboard', '/dashboard'], ['devis-liste', '/quotes'], ['chantiers', '/projects']], { logged: true });

  /* Rendu PDF réel produit par le navigateur (vérification du document) */
  if (!E2E_EMAIL || !E2E_PASSWORD) {
    await browser.close();
    fs.writeFileSync(path.join(OUT, 'rapport.json'), JSON.stringify(results, null, 2));
    console.log('Captures privées ignorées : BATIYO_E2E_EMAIL/BATIYO_E2E_PASSWORD non définis.');
    return;
  }

  const ctx = await browser.newContext({ viewport: DESKTOP });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  const pdfLoginOk = await page.evaluate(async ({ email, password }) => (await window.BATIYO.session.login(email, password)).ok, { email: E2E_EMAIL, password: E2E_PASSWORD });
  if (!pdfLoginOk) { throw new Error('Connexion E2E impossible pour la vérification PDF'); }
  const html = await page.evaluate(() => {
    const q = window.BATIYO.quoteService.list({})[0];
    const i = window.BATIYO.invoiceService.list({})[0];
    return { quote: window.BATIYO.pdf.quoteHTML(q), invoice: window.BATIYO.pdf.invoiceHTML(i) };
  });
  const tmp = path.join(OUT, '_doc.html');
  fs.writeFileSync(tmp, html.quote);
  await page.goto('file://' + tmp, { waitUntil: 'load' });
  await page.pdf({ path: path.join(OUT, 'devis-DEV-2026-0008.pdf'), format: 'A4', printBackground: true });
  const pdfText = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync(tmp, html.invoice);
  await page.goto('file://' + tmp, { waitUntil: 'load' });
  await page.pdf({ path: path.join(OUT, 'facture-FAC-2026-0001.pdf'), format: 'A4', printBackground: true });
  fs.unlinkSync(tmp);
  const ok = pdfText.length > 300 && /FCFA/.test(pdfText);
  results.push({ ctx: 'pdf', screen: 'devis+facture', route: 'print', errors, overflow: 0, small: 0, interactive: 0, height: 0, view: pdfText.length });
  if (!ok) problems.push('pdf/devis → document imprimable vide');

  await ctx.close();

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'rapport.json'), JSON.stringify(results, null, 2));

  console.log('\nÉcrans capturés : ' + results.length + ' → ' + OUT);
  results.forEach((r) => {
    console.log('  ' + (r.errors.length || r.overflow > 2 || r.small || r.view < 40 ? '⚠' : '✓') + ' ' +
      (r.ctx + '/' + r.screen).padEnd(26) + ' h=' + String(r.height).padStart(5) +
      ' · ' + String(r.interactive).padStart(3) + ' éléments interactifs' +
      (r.overflow > 2 ? ' · débordement ' + r.overflow + 'px' : '') +
      (r.small ? ' · ' + r.small + ' petits textes' : '') +
      (r.errors.length ? ' · ' + r.errors.join(' | ') : ''));
  });
  console.log('\n' + (problems.length ? '⚠ ' + problems.length + ' problème(s) :\n- ' + problems.join('\n- ') : '✅ Aucun problème détecté'));
})();
