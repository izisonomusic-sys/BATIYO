/* =========================================================================
   BATIYO — 14. ÉCRANS PUBLICS
   Landing page (#6 → #14), connexion, inscription (#15), onboarding (#18),
   tarifs (#125), FAQ (#126, #254), pages légales (#124).
   ========================================================================= */
(function (B) {
  'use strict';
  const h = B.escape;
  const ui = function () { return B.ui; };

  /* Actions d’en-tête adaptées à l’état de connexion. */
  function publicAccountActions() {
    return B.session && B.session.isLoggedIn()
      ? '<a class="btn btn-primary btn-sm" href="#/dashboard">Mon espace</a>'
      : '<a class="btn btn-ghost hide-sm" href="#/login">Se connecter</a><a class="btn btn-primary btn-sm" href="#/register"><span class="hide-xs">Commencer gratuitement</span><span class="only-xs">Commencer</span></a>';
  }
  function publicMobileAccountLinks() {
    return B.session && B.session.isLoggedIn()
      ? '<a href="#/dashboard">Mon espace</a>'
      : '<a href="#/login">Se connecter</a><a href="#/register">Créer un compte</a>';
  }

  /* ------------------------------- Landing page --------------------------- */
  function landing() {
    const wrap = B.el('<div class="lp"></div>');
    const header = B.el(`
      <header class="lp-header" id="lpHeader">
        <div class="container">
          <div class="inner">
            <a href="#/" class="lp-logo">${logoMark()} BATIYO</a>
            <nav class="lp-nav" aria-label="Navigation principale">
              <a href="#fonctionnalites">Fonctionnalités</a>
              <a href="#metiers">Métiers</a>
              <a href="#comment">Comment ça marche</a>
              <a href="#/pricing">Tarifs</a>
              <a href="#/faq">FAQ</a>
            </nav>
            <div class="lp-actions">
              ${publicAccountActions()}
              <button class="iconbtn only-sm" id="menuBtn" aria-label="Ouvrir le menu">${ui().icon('menu', 20)}</button>
            </div>
          </div>
        </div>
      </header>`);
    const mobileMenu = B.el(`
      <div class="mobile-menu only-sm" id="mobileMenu" hidden>
        <a href="#fonctionnalites">Fonctionnalités</a>
        <a href="#metiers">Métiers</a>
        <a href="#comment">Comment ça marche</a>
        <a href="#/pricing">Tarifs</a>
        <a href="#/faq">FAQ</a>
        ${publicMobileAccountLinks()}
      </div>`);
    wrap.appendChild(header);
    wrap.appendChild(mobileMenu);

    const body = B.el('<main></main>');
    body.innerHTML = `
      <!-- ============================= HERO (#8) ========================= -->
      <section class="hero">
        <div class="container">
          <div class="grid-hero">
            <div>
              <span class="eyebrow">${ui().icon('sparkles', 14)} L'assistant intelligent des artisans</span>
              <h1>Vos chantiers avancent.<br>BATIYO garde le cap.</h1>
              <p class="lead">Préparez vos devis sur le chantier, suivez vos dépenses et gardez une vision claire de votre activité. BATIYO accompagne les artisans, du premier coup de truelle jusqu’à la livraison.</p>
              <div class="hero-cta">
                <a class="btn btn-primary btn-lg" href="#/register">Créer mon compte gratuitement</a>
                <a class="btn btn-ghost btn-lg" href="#metiers">Découvrir les métiers</a>
              </div>
              <div class="micro">Pensé pour les réalités des artisans en Afrique de l’Ouest</div>
              <div class="row wrap small muted" style="margin-top:18px;gap:16px">
                <span class="row" style="gap:6px">${ui().icon('checkCircle', 16)} Devis en 2 minutes</span>
                <span class="row" style="gap:6px">${ui().icon('checkCircle', 16)} Catalogue selon votre métier</span>
                <span class="row" style="gap:6px">${ui().icon('checkCircle', 16)} Fonctionne hors connexion</span>
              </div>
            </div>
            <div class="hero-shot">
              <!-- Photo de chantier + écran de l'application (maquette d'interface réelle) -->
              <figure class="hero-visual">
                <img class="hero-photo" src="assets/hero-artisan-1.jpg"
                     alt="Artisan maçon sur un chantier à Lomé, avec BATIYO sur son téléphone"
                     width="896" height="1344" loading="eager" decoding="async" fetchpriority="high">
                <div class="hero-visual-phone">${heroAppMockup()}</div>
                <figcaption class="hero-badge">
                  <span class="hb-ico">${ui().icon('sparkles', 15)}</span>
                  <span><strong>Votre chantier, mieux organisé</strong><br>Un devis clair, prêt à être partagé</span>
                </figcaption>
              </figure>
              
            </div>
          </div>
        </div>
      </section>

      <!-- ============ APERÇU DU TABLEAU DE BORD (#8, #20) ================ -->
      <section class="kpi-band">
        <div class="container">
          <div class="kpi-band-head">
            <span class="eyebrow">${ui().icon('chart', 14)} Aperçu du tableau de bord</span>
            <p class="muted small">Exemple visuel de l’interface — les vôtres s'afficheront dès votre premier devis.</p>
          </div>
          <div class="grid grid-2 grid-4-md kpi-grid">
            ${kpiCard('trending', 'Chiffre d’affaires', B.money(3850000), 'Devis acceptés + factures hors devis', 'success')}
            ${kpiCard('coins', 'Dépenses', B.money(2210000), 'Toutes dépenses enregistrées', 'warn')}
            ${kpiCard('chart', 'Marge estimée', B.money(1640000), 'Contrat − budget prévisionnel', 'success')}
            ${kpiCard('hardhat', 'Chantiers actifs', '4', '6 chantiers au total', 'neutral')}
          </div>
          <p class="tiny muted kpi-note">Estimation basée sur les données enregistrées — ce résultat peut évoluer.</p>
        </div>
      </section>

      <!-- ==================== BÉNÉFICES PRINCIPAUX (#9) ================== -->
      <section class="section" id="fonctionnalites" style="background:#FBFDFE;border-top:1px solid var(--line);border-bottom:1px solid var(--line)">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Ce que BATIYO fait pour vous</span>
            <h2>Moins de calculs, plus de clarté</h2>
            <p>Trois choses qui changent le quotidien d'un artisan : faire un devis propre, savoir où part l'argent, et connaître ce qui reste.</p>
          </div>
          <div class="grid grid-3-md">
            ${feature('doc', 'Devis intelligent', 'Créez rapidement des devis professionnels avec les produits et services adaptés à votre métier. BATIYO connaît déjà vos matériaux et vos prix habituels.', '#devis-intelligent')}
            ${feature('coins', 'Dépenses maîtrisées', 'Enregistrez vos dépenses et comparez automatiquement vos dépenses réelles avec votre budget. Vous voyez tout de suite où vous en êtes.', '#depenses-maitrisees')}
            ${feature('trending', 'Rentabilité', 'Sachez combien vous gagnez réellement sur chaque chantier : marge prévisionnelle, résultat provisoire, écarts par poste.', '#rentabilite')}
          </div>

          <div class="grid grid-3-md mt-24">
            ${miniFeature('invoice', 'Factures & PDF', 'Transformez un devis accepté en facture et générez un document professionnel à partager.')}
            ${miniFeature('hardhat', 'Suivi des chantiers', 'Budget, dépenses, avancement, photos : chaque chantier a sa fiche claire.')}
            ${miniFeature('sparkles', 'Assistant BATIYO', '« Combien ai-je dépensé ce mois-ci ? » L’assistant répond avec vos vrais chiffres.')}
            ${miniFeature('wifiOff', 'Hors connexion', 'Devis, dépenses, calculs et documents continuent de fonctionner sans Internet.')}
            ${miniFeature('users', 'Clients & historique', 'Tous vos clients, leurs devis, factures et chantiers au même endroit.')}
            ${miniFeature('grid', 'Catalogue par métier', 'Maçon, plombier, électricien, peintre… le catalogue s’adapte automatiquement.')}
          </div>
        </div>
      </section>

      <!-- ================= COMMENT ÇA MARCHE (#10, #251) ================= -->
      <section class="section" id="comment">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Comment ça marche</span>
            <h2>Quatre étapes, du devis au bénéfice</h2>
          </div>
          <div class="grid grid-4-md">
            ${step('01', 'Créez votre compte', 'Renseignez votre entreprise et votre métier. BATIYO prépare votre catalogue.')}
            ${step('02', 'Créez votre devis', 'Choisissez vos matériaux ou prestations, BATIYO calcule tout automatiquement.')}
            ${step('03', 'Suivez vos dépenses', 'Enregistrez vos achats au fur et à mesure, chantier par chantier.')}
            ${step('04', 'Analysez votre résultat', 'BATIYO compare le budget, les dépenses réelles et la marge.')}
          </div>
        </div>
      </section>

      <!-- ========================= MÉTIERS (#11) ======================== -->
      <section class="section" id="metiers" style="background:#FBFDFE;border-top:1px solid var(--line);border-bottom:1px solid var(--line)">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Adapté à votre activité</span>
            <h2>BATIYO s'adapte à votre métier</h2>
            <p>Choisissez votre métier une seule fois. BATIYO charge ensuite le bon catalogue, les bonnes unités et les bons modèles de devis.</p>
          </div>
          <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">
            ${B.PROFESSIONS.filter(function (p) { return p.id !== 'autre'; }).map(function (p) {
              return '<div class="card card-hover metier ' + (p.flagship ? 'hl' : '') + '"><div class="il">' + ui().icon(p.icon, 22) + '</div>' +
                '<div class="name">' + h(p.name) + '</div>' + (p.flagship ? '<div class="tiny tone-success strong">MVP</div>' : '') + '</div>';
            }).join('')}
          </div>
          <div class="center mt-24">
            <a class="btn btn-primary" href="#/register">Choisir mon métier</a>
          </div>
        </div>
      </section>

      <!-- ===================== TÉMOIGNAGES (#12) ======================= -->
      <section class="section" id="depenses-maitrisees" style="background:#FBFDFE;border-top:1px solid var(--line);border-bottom:1px solid var(--line)">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Ils utilisent BATIYO</span>
            <h2>Des artisans, des vrais chantiers</h2>
            <p class="tiny">Exemples de témoignages — à remplacer par des témoignages clients vérifiés.</p>
          </div>
          <div class="grid grid-3-md">
            ${testimonial('Avant BATIYO, je faisais mes devis à la main. Maintenant je peux préparer un devis professionnel rapidement depuis mon téléphone.', 'Kossi', 'Maçon')}
            ${testimonial('Je peux suivre mes dépenses chantier par chantier et savoir où part mon argent.', 'Komla', 'Électricien')}
            ${testimonial('Mes devis et mes factures sont beaucoup plus professionnels.', 'Ama', 'Plombière')}
          </div>
        </div>
      </section>

      <!-- ======================== CTA FINAL (#13) ====================== -->
      <section class="section">
        <div class="container">
          <div class="cta-band">
            <h2>Prêt à mieux gérer votre activité ?</h2>
            <p>Créez votre premier devis avec BATIYO et commencez à mieux suivre vos chantiers, vos dépenses et votre rentabilité.</p>
            <a class="btn btn-lg" href="#/register">Commencer gratuitement</a>
            <div class="small" style="margin-top:14px;color:rgba(255,255,255,.75)">Les abonnements Pro peuvent être réglés via PayDunya SoftPay, uniquement dans les pays et pour les opérateurs activés sur le compte marchand.</div>
          </div>
        </div>
      </section>

      <!-- ========================== FOOTER (#14) ======================= -->
      <footer class="lp-footer">
        <div class="container">
          <div class="footer-main">
            <div class="footer-brand">
              <a href="#/" class="lp-logo">${logoMark()} BATIYO</a>
              <p>Le compagnon de chantier des artisans et petites entreprises. Des devis clairs, des dépenses suivies et une activité mieux maîtrisée.</p>
              <span class="footer-tag">Conçu pour le terrain</span>
              <p class="footer-founder">Fondé par <strong>Sotodji Vainqueur</strong>.</p>
            </div>
            <div class="footer-links"><h4>BATIYO</h4>
              <a href="#fonctionnalites">Fonctionnalités</a><a href="#metiers">Métiers</a>
              <a href="#comment">Comment ça marche</a><a href="#/pricing">Nos abonnements</a>
              <a class="btn btn-primary btn-block footer-subscribe-link" href="#/pricing">Prendre un abonnement</a>
            </div>
            <div class="footer-links"><h4>Accompagnement</h4>
              <a href="#/faq">Questions fréquentes</a><a href="#/faq">Centre d'aide</a>
              ${publicMobileAccountLinks()}
            </div>
            <div class="footer-links"><h4>Informations</h4>
              <a href="#/legal/terms">Conditions d'utilisation</a><a href="#/legal/privacy">Confidentialité</a>
              <a href="#/legal/notice">Mentions légales</a>
            </div>
          </div>
          <div class="bottom">
            <div>© ${new Date().getFullYear()} BATIYO. Tous droits réservés.</div>
            <div class="footer-trust">Utilisable hors connexion <span>•</span> Vos données restent protégées</div>
          </div>
        </div>
      </footer>`;
    wrap.appendChild(body);

    /* Header au scroll + menu mobile (#7) */
    function onScroll(evt) {
      const el = B.$('#lpHeader');
      if (el) el.classList.toggle('scrolled', (evt && evt.scrollTop ? evt.scrollTop : window.scrollY) > 8);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    setTimeout(function () { onScroll(); }, 10);
    const mb = B.$('#menuBtn', header);
    mb.addEventListener('click', function () {
      const mm = B.$('#mobileMenu');
      const open = mm.hidden;
      mm.hidden = !open;
      mb.innerHTML = open ? ui().icon('x', 20) : ui().icon('menu', 20);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    B.on(wrap, 'click', '.mobile-menu a', function () {
      B.$('#mobileMenu').hidden = true;
      document.body.style.overflow = '';
      mb.innerHTML = ui().icon('menu', 20);
    });
    wrap._cleanup = function () { window.removeEventListener('scroll', onScroll); document.body.style.overflow = ''; };
    return wrap;
  }

  /* ----------------------- Fragments de la landing ------------------------ */
  function logoMark() {
    return '<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">' +
      '<rect x="1" y="1" width="30" height="30" rx="9" fill="#0F766E"/>' +
      '<path d="M9 22V13l7-5 7 5v9" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M13 22v-5h6v5" stroke="#F59E0B" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';
  }
  function feature(iconName, title, text, id) {
    return '<article class="card card-hover feature" id="' + h((id || '').replace('#', '')) + '">' +
      '<div class="il">' + ui().icon(iconName, 24) + '</div><h3>' + h(title) + '</h3><p>' + h(text) + '</p></article>';
  }
  /* Carte d'indicateur de la bande d'aperçu (#20) */
  function kpiCard(iconName, label, value, sub, tone) {
    const tones = { success: 'kpi-success', warn: 'kpi-warn', neutral: 'kpi-neutral' };
    return '<article class="kpi ' + (tones[tone] || 'kpi-neutral') + '">' +
      '<div class="kpi-top"><span class="kpi-ico">' + ui().icon(iconName, 18) + '</span>' + h(label) + '</div>' +
      '<div class="kpi-value mono">' + h(value) + '</div>' +
      '<div class="kpi-sub">' + h(sub) + '</div></article>';
  }

  function miniFeature(iconName, title, text) {
    return '<div class="card card-hover" style="padding:16px"><div class="row" style="gap:10px;align-items:flex-start">' +
      '<div class="stat-primary ico" style="width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:var(--primary-soft);color:var(--primary-dark)">' + ui().icon(iconName, 19) + '</div>' +
      '<div><div class="strong small">' + h(title) + '</div><div class="tiny muted mt-8">' + h(text) + '</div></div></div></div>';
  }
  function step(n, title, text) {
    return '<div class="step"><div class="num">' + n + '</div><div><h3>' + h(title) + '</h3><p>' + h(text) + '</p></div></div>';
  }
  function testimonial(text, name, job) {
    return '<article class="card card-hover quote-card"><div class="mark">“</div><p>' + h(text) + '</p>' +
      '<div class="who">' + ui().avatar(name) + '<div><div class="strong small">— ' + h(name) + '</div><div class="tiny muted">' + h(job) + '</div></div></div></article>';
  }
  function alertPreview(tone, level, message) {
    return '<div class="alert alert-' + tone + '"><span class="ico">' + ui().icon(tone === 'success' ? 'checkCircle' : 'alert', 18) + '</span>' +
      '<div><strong>' + h(level) + '</strong><span class="small">' + h(message) + '</span></div></div>';
  }
  /* Maquette du hero : l'artisan est en train de créer son devis sur BATIYO.
     Contenu court et lisible même à petite taille (l'écran est superposé
     à la photo, il doit rester compréhensible sur un téléphone). */
  function heroAppMockup() {
    /* Les montants des lignes sont affichés sans « FCFA » pour rester lisibles
       dans un écran de cette taille ; la devise apparaît sur le total. */
    const line = function (desc, qty, price) {
      return '<div class="hm-line"><div class="grow"><div class="hm-desc">' + h(desc) + '</div>' +
        '<div class="hm-sub">' + h(qty) + '</div></div>' +
        '<div class="hm-price">' + h(B.num(price)) + '</div></div>';
    };
    return '<div class="phone hero-phone"><div class="screen">' +
      '<div class="hero-phone-top">' +
        '<span class="hm-back">' + ui().icon('arrowLeft', 13) + '</span>' +
        '<div class="grow"><div class="hm-title">Nouveau devis</div>' +
        '<div class="hm-sub">Client : Koffi Adjé</div></div>' +
        '<span class="hm-net">' + ui().icon('wifi', 11) + '</span>' +
      '</div>' +
      '<div class="hero-phone-body">' +
        '<div class="hm-steps"><span class="on">1</span><span class="on">2</span><span class="on">3</span><span>4</span></div>' +
        line('Ciment CPJ 45', '20 sacs', 110000) +
        line('Sable', '3 voyages', 105000) +
        line('Main-d’œuvre', '2 forfaits', 300000) +
        '<div class="hm-total"><span>Total du devis</span><strong>' + h(B.money(515000)) + '</strong></div>' +
        '<div class="hm-cta">' + ui().icon('checkCircle', 13) + ' Enregistrer le devis</div>' +
        '<div class="hm-note">Calculé automatiquement</div>' +
      '</div></div></div>';
  }

  function phoneMockup() {
    return '<div class="phone"><div class="notch"></div><div class="screen">' +
      '<div class="phone-top"><div class="row-between"><div class="row" style="gap:8px">' + ui().avatar('Kossi Amégan') +
      '<div><div class="strong small">Batiyo Construction</div><div class="tiny muted">Maçon · Agoè, Lomé</div></div></div>' +
      '<span class="net-pill net-online">' + ui().icon('wifi', 13) + ' En ligne</span></div></div>' +
      '<div class="phone-body">' +
        '<div class="mini-stat">' + statMini('trending', 'Chiffre d’affaires', B.money(3850000), 'success') + '</div>' +
        '<div class="grid grid-2" style="gap:10px">' +
          '<div class="mini-stat">' + statMiniSmall('coins', 'Dépenses', B.money(2210000), 'warn') + '</div>' +
          '<div class="mini-stat">' + statMiniSmall('chart', 'Marge estimée', B.money(1640000), 'success') + '</div>' +
        '</div>' +
        '<div class="mini-stat"><div class="row-between" style="width:100%"><div><div class="l">Chantiers actifs</div><div class="v">4</div></div>' +
        '<div class="row" style="gap:6px">' + ui().badge('En cours', 'accent') + '</div></div></div>' +
        '<div class="card mock-quotes" style="padding:12px"><div class="tiny muted mb-8">Derniers devis</div>' +
          mockQuote('Koffi', 'DEV-0008', 850000, 'Accepté', 'success') +
          mockQuote('Mensah', 'DEV-0007', 1250000, 'Envoyé', 'info') +
          mockQuote('Ama', 'DEV-0006', 560000, 'Brouillon', 'neutral') +
        '</div>' +
      '</div></div></div>';
  }
  function statMini(iconName, label, value) {
    return '<div style="width:100%"><div class="row" style="gap:10px"><div style="width:34px;height:34px;border-radius:10px;background:var(--primary-soft);color:var(--primary-dark);display:grid;place-items:center">' + ui().icon(iconName, 18) + '</div>' +
      '<div><div class="l">' + h(label) + '</div><div class="v">' + h(value) + '</div></div></div></div>';
  }
  function statMiniSmall(iconName, label, value) {
    return '<div style="width:100%"><div class="l row" style="gap:5px">' + ui().icon(iconName, 13) + h(label) + '</div><div class="v">' + h(value) + '</div></div>';
  }
  function mockQuote(client, number, amount, status, tone) {
    return '<div class="row-between" style="padding:7px 0;border-bottom:1px solid var(--line)">' +
      '<div><div class="small strong">' + h(number) + '</div><div class="tiny muted">Client : ' + h(client) + '</div></div>' +
      '<div class="right"><div class="small strong mono">' + h(B.money(amount)) + '</div>' + ui().badge(status, tone) + '</div></div>';
  }

  /* --------------------------------- Connexion ---------------------------- */
  function passwordField(label, name, placeholder, autocomplete) {
    const field = ui().field({ label: label, name: name, type: 'password', required: true, placeholder: placeholder, autocomplete: autocomplete });
    field.style.position = 'relative';
    field._input.style.paddingRight = '82px';
    const toggle = B.el('<button type="button" class="btn btn-ghost btn-sm" aria-label="Afficher le mot de passe" style="position:absolute;right:6px;top:31px;padding:6px 9px;min-height:30px">Afficher</button>');
    toggle.addEventListener('click', function () {
      const visible = field._input.type === 'password';
      field._input.type = visible ? 'text' : 'password';
      toggle.textContent = visible ? 'Masquer' : 'Afficher';
      toggle.setAttribute('aria-label', visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
    });
    field.appendChild(toggle);
    return field;
  }

  function googleAuthButton() {
    const wrap = B.el('<div class="mt-12 mb-12"></div>');
    const separator = B.el('<div class="row" style="align-items:center;gap:12px;margin:14px 0;color:var(--muted)"><span style="height:1px;background:var(--line);flex:1"></span><span class="tiny">ou continuer avec</span><span style="height:1px;background:var(--line);flex:1"></span></div>');
    const button = B.el('<button type="button" class="btn btn-ghost btn-lg btn-block" style="border:1px solid var(--line);background:var(--surface)"><span style="font-weight:800;font-size:18px;margin-right:10px;color:#4285F4">G</span>Continuer avec Google</button>');
    button.addEventListener('click', async function () {
      button.disabled = true;
      button.textContent = 'Redirection vers Google…';
      const res = await B.authService.loginWithGoogle();
      if (!res || !res.ok) {
        button.disabled = false;
        button.innerHTML = '<span style="font-weight:800;font-size:18px;margin-right:10px;color:#4285F4">G</span>Continuer avec Google';
        ui().toast(res && res.error ? res.error : 'Connexion Google impossible. Vérifiez la configuration Supabase.', 'error');
      }
    });
    wrap.appendChild(separator);
    wrap.appendChild(button);
    return wrap;
  }

  /* --------------------------------- Connexion ---------------------------- */
  function login() {
    return authLayout({
      title: 'Content de vous revoir',
      subtitle: 'Connectez-vous avec votre numéro de téléphone et votre mot de passe.',
      form: function (form) {
        form.appendChild(googleAuthButton());
        form.appendChild(ui().field({ label: 'Numéro de téléphone', name: 'phone', type: 'tel', placeholder: '+228 90 12 34 56', required: true, autocomplete: 'tel' }));
        form.appendChild(passwordField('Mot de passe', 'password', 'Votre mot de passe', 'current-password'));
        const help = B.el('<div class="tiny muted">Utilisez votre numéro avec l’indicatif international (ex. +228 pour le Togo).</div>');
        form.appendChild(help);
        return {
          submitLabel: 'Se connecter',
          onSubmit: async function (values, scope) {
            const res = await B.authService.login(values.phone, values.password);
            if (!res.ok) { ui().showErrors(scope, { phone: res.error }); ui().toast(res.error, 'error'); return; }
            ui().toast('Bonjour ' + (res.user && res.user.name ? res.user.name : '') + ', ravi de vous revoir.', 'success');
            B.router.go('/dashboard');
          }
        };
      }
    });
  }

  /* -------------------------------- Inscription --------------------------- */
  function register() {
    const selected = { profession_id: null };
    const wrap = B.el('<div></div>');
    wrap.appendChild(authLayout({
      title: 'Créez votre compte BATIYO',
      subtitle: 'Quelques informations suffisent pour commencer à gérer votre activité.',
      wide: true,
      form: function (form) {
        form.appendChild(googleAuthButton());
        form.appendChild(ui().field({ label: 'Prénom', name: 'first_name', required: true, placeholder: 'Ex. : Kossi', autocomplete: 'given-name' }));
        form.appendChild(ui().field({ label: 'Nom', name: 'last_name', required: true, placeholder: 'Ex. : Amégan', autocomplete: 'family-name' }));
        form.appendChild(ui().field({ label: 'Numéro de téléphone', name: 'phone', type: 'tel', required: true, placeholder: '+228 90 12 34 56', autocomplete: 'tel', hint: 'Avec indicatif international, sans adresse e-mail et sans code SMS.' }));
        form.appendChild(passwordField('Mot de passe', 'password', '6 caractères minimum', 'new-password'));
        form.appendChild(ui().field({ label: 'Nom de l’entreprise', name: 'business_name', required: true, placeholder: 'Ex. : Batiyo Construction' }));

        const profField = B.el('<div class="field"><label>Quel est votre métier ? <span style="color:#DC2626">*</span></label>' +
          '<div class="tiny muted">Votre métier détermine le catalogue proposé dans vos devis et factures.</div>' +
          '<div class="prof-grid mt-8" data-prof></div><div class="error" data-error hidden></div></div>');
        const grid = B.$('[data-prof]', profField);
        B.PROFESSIONS.forEach(function (p) {
          const card = B.el('<button type="button" class="prof-card' + (p.flagship ? ' flagship' : '') + '"><div class="il">' + ui().icon(p.icon, 20) + '</div><div class="nm">' + h(p.name) + '</div>' + (p.flagship ? '<div class="tag">MVP</div>' : '') + '</button>');
          card.addEventListener('click', function () {
            selected.profession_id = p.id;
            B.$$('.prof-card', grid).forEach(function (c) { c.classList.remove('active'); });
            card.classList.add('active');
            B.$('.error', profField).hidden = true;
          });
          grid.appendChild(card);
        });
        form.appendChild(profField);

        return {
          submitLabel: 'Créer mon compte',
          onSubmit: async function (values, scope) {
            const res = await B.authService.register({
              first_name: values.first_name,
              last_name: values.last_name,
              phone: values.phone,
              password: values.password,
              business_name: values.business_name,
              profession_id: selected.profession_id
            });
            if (!res.ok) {
              const errors = Object.assign({}, res.errors || { phone: res.error });
              if (res.error && !res.errors) errors.phone = res.error;
              if (errors.profession_id) {
                const e = B.$('.error', profField); e.textContent = errors.profession_id; e.hidden = false;
                delete errors.profession_id;
              }
              ui().showErrors(scope, errors);
              ui().toast(res.error || 'Vérifiez les informations saisies.', 'error');
              return;
            }
            ui().toast('Votre compte est créé. Bienvenue sur BATIYO !', 'success');
            B.router.go('/dashboard');
          }
        };
      }
    }));
    return wrap;
  }

  /* ------------------------------- Onboarding ----------------------------- */
  function onboarding() {
    const user = B.session.user();
    const business = B.session.business();
    if (!user) return B.router.go('/register', true);
    const data = {
      name: user.name || '', business_name: business ? business.name : '',
      profession_id: user.profession_id || null, logo: business ? (business.logo_url || business.logo) : null,
      address: business ? business.address : '', phone: business ? business.phone : ''
    };
    let stepIdx = 0;
    const wrap = B.el('<div class="app"><div class="content"><div class="onboarding"></div></div></div>');
    const host = B.$('.onboarding', wrap);

    function render() {
      const steps = [
        { key: 'name', title: 'Votre nom', sub: 'Étape 1 sur 5', body: function (form) { form.appendChild(ui().field({ label: 'Votre nom', name: 'name', value: data.name, required: true })); } },
        { key: 'business', title: 'Votre entreprise', sub: 'Étape 2 sur 5', body: function (form) { form.appendChild(ui().field({ label: 'Nom de l’entreprise', name: 'business_name', value: data.business_name, required: true, hint: 'Ce nom apparaîtra sur vos devis et factures.' })); } },
        { key: 'profession', title: 'Votre métier', sub: 'Étape 3 sur 5', body: function (form) {
            const f = B.el('<div class="field"><label>Quel est votre métier ?</label><div class="prof-grid" data-prof></div></div>');
            const grid = B.$('[data-prof]', f);
            B.PROFESSIONS.forEach(function (p) {
              const card = B.el('<button type="button" class="prof-card ' + (data.profession_id === p.id ? 'active' : '') + '"><div class="il">' + ui().icon(p.icon, 20) + '</div><div class="nm">' + h(p.name) + '</div></button>');
              card.addEventListener('click', function () {
                data.profession_id = p.id;
                B.$$('.prof-card', grid).forEach(function (c) { c.classList.remove('active'); });
                card.classList.add('active');
              });
              grid.appendChild(card);
            });
            form.appendChild(f);
          } },
        { key: 'logo', title: 'Logo de l’entreprise', sub: 'Étape 4 sur 5 — optionnel', body: function (form) {
            const holder = B.el('<div></div>');
            function paint() {
              holder.innerHTML = '';
              if (data.logo) {
                holder.appendChild(ui().imagePreview(data.logo, {
                  title: 'Logo', subtitle: 'Utilisé sur vos devis, factures et PDF.',
                  actions: [
                    { label: 'Remplacer', onClick: function () { pick(); } },
                    { label: 'Supprimer', tone: 'danger', onClick: function () { data.logo = null; paint(); } }
                  ]
                }));
              } else {
                holder.appendChild(ui().imagePicker({ title: 'Ajouter un logo', hint: 'Optionnel — vous pourrez l’ajouter plus tard', icon: 'image', onPick: function (url) { data.logo = url; paint(); } }));
              }
            }
            function pick() {
              const input = document.createElement('input');
              input.type = 'file'; input.accept = 'image/*';
              input.addEventListener('change', async function () {
                if (input.files[0]) { data.logo = await ui().readImage(input.files[0], 400); paint(); }
              });
              input.click();
            }
            paint();
            form.appendChild(holder);
          } },
        { key: 'contact', title: 'Adresse et téléphone', sub: 'Étape 5 sur 5', body: function (form) {
            form.appendChild(ui().field({ label: 'Adresse', name: 'address', value: data.address, placeholder: 'Ex : Quartier Agoè, Lomé' }));
            form.appendChild(ui().field({ label: 'Téléphone', name: 'phone', type: 'tel', value: data.phone, placeholder: 'Ex : +228 90 12 34 56' }));
          } }
      ];
      const step = steps[stepIdx];
      host.innerHTML = '';
      const card = B.el('<div class="card card-pad-lg animate-rise"></div>');
      card.innerHTML = '<div class="onboard-dots">' + steps.map(function (s, i) { return '<i class="' + (i <= stepIdx ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
        '<div class="tiny muted">' + h(step.sub) + '</div><h1 style="margin:6px 0 4px">' + (stepIdx === 0 ? 'Bienvenue sur BATIYO' : h(step.title)) + '</h1>' +
        '<p class="muted small mb-16">' + h(stepIdx === 0 ? 'Préparons votre espace en quelques secondes.' : 'Vous pourrez modifier ces informations plus tard dans votre profil.') + '</p>' +
        '<form class="form-grid" novalidate></form>';
      const form = B.$('form', card);
      step.body(form);
      const nav = B.el('<div class="btn-row mt-16"></div>');
      if (stepIdx > 0) {
        const back = B.el('<button type="button" class="btn btn-ghost">Retour</button>');
        back.addEventListener('click', function () { stepIdx--; render(); });
        nav.appendChild(back);
      }
      const next = B.el('<button type="button" class="btn btn-primary">' + (stepIdx === steps.length - 1 ? 'Terminer' : 'Continuer') + '</button>');
      next.addEventListener('click', function () {
        const values = ui().formValues(form);
        if (step.key === 'name' && !values.name) return ui().toast('Indiquez votre nom.', 'error');
        if (step.key === 'business' && !values.business_name) return ui().toast('Indiquez le nom de votre entreprise.', 'error');
        if (step.key === 'profession' && !data.profession_id) return ui().toast('Choisissez votre métier.', 'error');
        Object.assign(data, values);
        if (stepIdx < steps.length - 1) { stepIdx++; render(); return; }
        B.authService.completeOnboarding({
          name: data.name, business_name: data.business_name, profession_id: data.profession_id,
          logo: data.logo, address: data.address, phone: data.phone
        }).then(function () {
          if (data.profession_id) B.session.setProfession(data.profession_id);
          finish();
        });
      });
      nav.appendChild(next);
      form.appendChild(nav);
      host.appendChild(card);
      form.appendChild(B.el('<div class="center mt-16 tiny muted">Vos données sont enregistrées dans votre espace BATIYO et restent accessibles hors connexion.</div>'));
    }
    function finish() {
      host.innerHTML = '';
      const card = B.el('<div class="card card-pad-lg center animate-rise"></div>');
      card.innerHTML = '<div style="width:64px;height:64px;margin:6px auto 14px;border-radius:20px;background:var(--success-soft);color:#166534;display:grid;place-items:center">' + ui().icon('checkCircle', 34) + '</div>' +
        '<h1>Votre espace est prêt.</h1>' +
        '<p class="muted mt-12">BATIYO a chargé le catalogue <strong>' + h(B.session.profession().name) + '</strong>. Vous pouvez créer votre premier devis dès maintenant.</p>' +
        '<div class="banner banner-info mt-16" style="text-align:left">' + ui().icon('info', 18) + '<span>Astuce : commencez par ajouter un client, puis créez un devis.</span></div>';
      const start = B.el('<button class="btn btn-primary btn-lg btn-block mt-16">Commencer</button>');
      start.addEventListener('click', function () { B.router.go('/dashboard'); });
      card.appendChild(start);
      host.appendChild(card);
    }
    render();
    return wrap;
  }

  /* ---------------------- Gabarit commun connexion/inscription ------------ */
  function authLayout(opts) {
    const o = opts || {};
    const wrap = B.el('<div class="app" style="min-height:100vh"></div>');
    wrap.innerHTML = `
      <div style="display:grid;min-height:100vh;grid-template-columns:1fr">
        <div style="display:flex;flex-direction:column;justify-content:center;padding:26px 16px">
          <div class="narrow" style="width:100%;margin:0 auto">
            <a href="#/" class="lp-logo" style="margin-bottom:22px">${logoMark()} BATIYO</a>
            <h1>${h(o.title)}</h1>
            <p class="muted mt-8 mb-16">${h(o.subtitle || '')}</p>
            <div class="card card-pad-lg">
              <form class="form-grid" novalidate></form>
            </div>
            <div class="center mt-16 small muted" data-switch></div>
          </div>
        </div>
      </div>`;
    const form = B.$('form', wrap);
    const conf = o.form(form);
    const submit = B.el('<button class="btn btn-primary btn-lg btn-block mt-8" type="submit">' + h(conf.submitLabel || 'Valider') + '</button>');
    form.appendChild(submit);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      conf.onSubmit(ui().formValues(form), form);
    });
    ui().bindMoneyInputs(form);
    const sw = B.$('[data-switch]', wrap);
    sw.innerHTML = o.switchText || (o.title.indexOf('revoir') >= 0
      ? 'Pas encore de compte ? <a href="#/register">Commencer gratuitement</a>'
      : 'Déjà un compte ? <a href="#/login">Se connecter</a>');
    return wrap;
  }

  /* ---------------------------------- Tarifs ------------------------------ */

  /* ---------------------------------- Tarifs ------------------------------ */
  const SUBSCRIPTION_PLANS = [
    { id: '1-mois', name: '1 mois', price: '3 500 FCFA', duration: '30 jours', note: 'Pour démarrer avec BATIYO Pro' },
    { id: '2-mois', name: '2 mois', price: '7 000 FCFA', duration: '60 jours', note: 'Pour garder le rythme de vos chantiers' },
    { id: '6-mois', name: '6 mois', price: '35 000 FCFA', duration: '180 jours', note: 'Pour une utilisation sur la durée' }
  ];

  function pricing() {
    const cards = SUBSCRIPTION_PLANS.map(function (p, index) {
      return '<article class="card plan subscription-plan ' + (index === 2 ? 'featured' : '') + '">' +
        (index === 2 ? '<span class="subscription-ribbon">Meilleure durée</span>' : '') +
        '<div class="subscription-duration">' + h(p.name) + '</div>' +
        '<div class="price">' + h(p.price) + '</div>' +
        '<div class="tiny muted">' + h(p.duration) + ' d’accès Pro</div>' +
        '<p class="subscription-note">' + h(p.note) + '</p>' +
        '<ul><li>' + ui().icon('check', 17) + '<span>Devis et factures PDF sans limite de quota gratuit</span></li>' +
        '<li>' + ui().icon('check', 17) + '<span>Partage de vos documents</span></li>' +
        '<li>' + ui().icon('check', 17) + '<span>Assistant et analyses avancées</span></li>' +
        '<li>' + ui().icon('check', 17) + '<span>Vos données restent conservées</span></li></ul>' +
        '<a class="btn btn-primary btn-block mt-12" href="#/subscribe/' + h(p.id) + '">Prends mon abonnement</a></article>';
    }).join('');
    return publicPage('Choisissez votre abonnement', 'Sélectionnez la durée qui correspond à votre activité. Chaque formule BATIYO Pro donne accès aux fonctionnalités avancées.',
      '<section class="pricing-intro mt-24"><span class="eyebrow">' + ui().icon('creditCard', 15) + ' BATIYO Pro</span>' +
      '<h2>Un abonnement. Toute votre activité mieux suivie.</h2><p class="muted">Choisissez votre durée, puis renseignez vos coordonnées pour préparer le paiement mobile.</p></section>' +
      '<div class="grid grid-3-md subscription-grid mt-16">' + cards + '</div>' +
      '<section class="free-plan card mt-24"><div><strong>Vous préférez commencer gratuitement ?</strong>' +
      '<p class="tiny muted mt-8">10 devis et 10 factures gratuits à vie, avec création de brouillons sans limite.</p></div>' +
      '<a class="btn btn-ghost" href="#/register">Créer mon compte gratuit</a></section>' +
      '<div class="card card-pad-lg mt-24"><h3>Questions fréquentes</h3>' +
      '<div class="mt-12">' + faqItem('Les 10 devis et 10 factures gratuits se renouvellent-ils chaque mois ?', 'Non. Il s’agit d’un essai unique à vie par compte. Le compteur ne revient pas à zéro chaque mois.') + '</div>' +
      '<div>' + faqItem('Puis-je continuer à travailler après avoir utilisé mes documents gratuits ?', 'Oui. Vous pouvez toujours créer et enregistrer des brouillons. Le téléchargement PDF et le partage des documents créés au-delà du quota nécessitent un abonnement Pro.') + '</div>' +
      '<div>' + faqItem('Est-ce que je perds mes documents si mon abonnement expire ?', 'Non. Vos devis, factures et autres données restent conservés. Les droits Pro restent actifs pendant la période de grâce de 7 jours après expiration.') + '</div></div>', true);
  }

  const PAYDUNYA_COUNTRIES = [
    { code: 'TG', name: 'Togo', prefix: '+228', operators: [
      ['t-money-togo', 'T-Money'], ['moov-togo', 'Moov Togo']
    ] },
    { code: 'BJ', name: 'Bénin', prefix: '+229', operators: [
      ['moov-benin', 'Moov'], ['mtn-benin', 'MTN'], ['celtiis-cash', 'Celtiis Cash']
    ] },
    { code: 'CI', name: "Côte d’Ivoire", prefix: '+225', operators: [
      ['mtn-ci', 'MTN Money'], ['moov-ci', 'Moov Money'], ['wave-ci', 'Wave'],
      ['orange-money-ci', 'Orange Money (code OTP)'], ['djamo-ci', 'Djamo']
    ] },
    { code: 'SN', name: 'Sénégal', prefix: '+221', operators: [
      ['free-money-senegal', 'Free Money'], ['expresso-senegal', 'Expresso'],
      ['wave-senegal', 'Wave'], ['new-orange-money-senegal', 'Orange Money (application)'],
      ['djamo-sn', 'Djamo']
    ] },
    { code: 'BF', name: 'Burkina Faso', prefix: '+226', operators: [
      ['moov-burkina', 'Moov'], ['orange-money-burkina', 'Orange Money (code OTP)']
    ] },
    { code: 'ML', name: 'Mali', prefix: '+223', operators: [
      ['orange-money-mali', 'Orange Money'], ['moov-mali', 'Moov']
    ] }
  ];

  function subscribe(planId) {
    const selected = SUBSCRIPTION_PLANS.find(function (p) { return p.id === planId; });
    if (!selected) return pricing();
    const countryOptions = PAYDUNYA_COUNTRIES.map(function (c) {
      return '<option value="' + c.code + '"' + (c.code === 'TG' ? ' selected' : '') + '>' + h(c.name) + '</option>';
    }).join('');
    const wrap = publicPage('Finaliser mon abonnement', 'BATIYO accompagne les artisans dans les pays d’Afrique de l’Ouest. Choisissez votre pays et le moyen de paiement disponible.',
      '<div class="checkout-layout mt-24"><section class="card checkout-summary">' +
      '<span class="eyebrow">Votre formule</span><h2>BATIYO Pro — ' + h(selected.name) + '</h2>' +
      '<div class="checkout-amount">' + h(selected.price) + '</div><p class="muted small">' + h(selected.duration) + ' d’accès Pro à compter de la confirmation du paiement.</p>' +
      '<div class="divider"></div><div class="row-between"><span class="muted small">Abonnement</span><strong>' + h(selected.name) + '</strong></div>' +
      '<div class="row-between mt-8"><span class="muted small">Montant à payer</span><strong>' + h(selected.price) + '</strong></div>' +
      '<p class="tiny muted mt-12">Montant affiché en FCFA (XOF). Les moyens proposés dépendent du pays et de l’activation de votre compte marchand.</p></section>' +
      '<section class="card card-pad-lg"><h2>Vos coordonnées</h2><p class="muted small mt-8">Le paiement est lancé depuis BATIYO via PayDunya SoftPay. Selon l’opérateur, une validation sur votre téléphone ou dans son application peut être nécessaire.</p>' +
      '<form id="subscriptionForm" class="form-grid mt-16" novalidate>' +
      '<div class="field"><label for="subscriberName">Nom et prénom</label><input class="input" id="subscriberName" name="name" type="text" autocomplete="name" placeholder="Ex. : Kossi Amégan" required></div>' +
      '<div class="field"><label for="subscriberEmail">Adresse e-mail</label><input class="input" id="subscriberEmail" name="email" type="email" autocomplete="email" placeholder="vous@exemple.com" required></div>' +
      '<div class="field"><label for="subscriberCountry">Pays</label><select class="input" id="subscriberCountry" name="country" required>' + countryOptions + '</select><span class="hint">PayDunya SoftPay annonce actuellement ces six pays.</span></div>' +
      '<div class="field"><label for="subscriberOperator">Moyen de paiement</label><select class="input" id="subscriberOperator" name="operator" required></select></div>' +
      '<div class="field"><label for="subscriberPhone">Numéro de téléphone</label><input class="input" id="subscriberPhone" name="phone" type="tel" autocomplete="tel" placeholder="+228 90 12 34 56" required><span class="hint" id="subscriberPhoneHint">Avec l’indicatif du pays sélectionné.</span></div>' +
      '<div class="field" id="subscriberAddressField"><label for="subscriberAddress">Ville / adresse (si demandé par l’opérateur)</label><input class="input" id="subscriberAddress" name="address" type="text" autocomplete="street-address" placeholder="Ex. : Lomé"></div>' +
      '<div class="field" id="subscriberOtpField" hidden><label for="subscriberOtp">Code de paiement OTP</label><input class="input" id="subscriberOtp" name="otp" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="Code obtenu auprès de votre opérateur"><span class="hint">Ne saisissez ici que le code de paiement généré par l’opérateur, jamais votre code secret Mobile Money.</span></div>' +
      '<div class="banner banner-info"><span>' + ui().icon('smartphone', 18) + '</span><span>Votre abonnement BATIYO sera activé dès que le paiement aura été confirmé par PayDunya.</span></div>' +
      '<button class="btn btn-primary btn-lg btn-block" type="submit">Lancer le paiement sécurisé</button>' +
      '<p id="checkoutFeedback" class="tiny muted" role="status">Connectez-vous à votre compte BATIYO avant de payer.</p></form></section></div>' +
      '<div class="center mt-16"><a href="#/pricing" class="btn btn-ghost btn-sm">' + ui().icon('arrowLeft', 15) + ' Changer de formule</a></div>', true);
    const form = B.$('#subscriptionForm', wrap);
    const feedback = B.$('#checkoutFeedback', wrap);
    const countryInput = B.$('#subscriberCountry', form);
    const operatorInput = B.$('#subscriberOperator', form);
    const phoneInput = B.$('#subscriberPhone', form);
    const otpField = B.$('#subscriberOtpField', form);
    const otpInput = B.$('#subscriberOtp', form);
    const submit = B.$('button[type="submit"]', form);

    function selectedCountry() {
      return PAYDUNYA_COUNTRIES.find(function (c) { return c.code === countryInput.value; }) || PAYDUNYA_COUNTRIES[0];
    }
    function paintOperators() {
      const country = selectedCountry();
      operatorInput.innerHTML = country.operators.map(function (op, i) {
        return '<option value="' + op[0] + '"' + (i === 0 ? ' selected' : '') + '>' + h(op[1]) + '</option>';
      }).join('');
      phoneInput.placeholder = country.prefix + ' ...';
      B.$('#subscriberPhoneHint', form).textContent = 'Indicatif attendu : ' + country.prefix + '. Saisissez votre numéro avec cet indicatif.';
      paintOtp();
    }
    function paintOtp() {
      const needsOtp = ['orange-money-ci', 'orange-money-burkina'].indexOf(operatorInput.value) >= 0;
      otpField.hidden = !needsOtp;
      otpInput.required = needsOtp;
    }
    countryInput.addEventListener('change', paintOperators);
    operatorInput.addEventListener('change', paintOtp);
    paintOperators();

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      const name = String(B.$('#subscriberName', form).value || '').trim();
      const email = String(B.$('#subscriberEmail', form).value || '').trim();
      const country = selectedCountry();
      const phone = String(phoneInput.value || '').replace(/[\s().-]/g, '').replace(/^00/, '+');
      const operator = operatorInput.value;
      if (!B.session || !B.session.isLoggedIn()) {
        feedback.className = 'banner banner-warn';
        feedback.textContent = 'Connectez-vous ou créez votre compte BATIYO avant de lancer un paiement.';
        return;
      }
      if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        feedback.className = 'tiny tone-danger';
        feedback.textContent = 'Veuillez renseigner un nom et une adresse e-mail valides.';
        return;
      }
      if (!phone.startsWith(country.prefix) || !/^\+[1-9]\d{7,14}$/.test(phone)) {
        feedback.className = 'tiny tone-danger';
        feedback.textContent = 'Le numéro doit être au format international et commencer par ' + country.prefix + '.';
        return;
      }
      if (otpInput.required && !String(otpInput.value || '').trim()) {
        feedback.className = 'tiny tone-danger';
        feedback.textContent = 'Saisissez le code OTP généré par votre opérateur.';
        return;
      }
      if (!B.DataRepository.remote || !B.DataRepository.remote.ready || !B.DataRepository.remote.client) {
        feedback.className = 'banner banner-warn';
        feedback.textContent = 'La connexion sécurisée au service de paiement est indisponible.';
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Connexion au service de paiement…';
      feedback.className = 'tiny muted';
      feedback.textContent = 'Création de la demande de paiement sécurisée. Ne fermez pas cette page.';
      try {
        const result = await B.DataRepository.remote.client.functions.invoke('paydunya-softpay', {
          body: {
            plan_id: selected.id, country_code: country.code, operator: operator,
            customer_name: name, email: email, phone: phone,
            address: String(B.$('#subscriberAddress', form).value || '').trim(),
            otp: String(otpInput.value || '').trim()
          }
        });
        if (result.error) {
          let errorData = result.data || null;
          const errorResponse = result.error.context;
          if (!errorData && errorResponse && typeof errorResponse.clone === 'function') {
            try { errorData = await errorResponse.clone().json(); } catch (_) { /* réponse non JSON */ }
          }
          const errorCode = errorData && errorData.error;
          if (errorCode === 'unsupported_country_or_operator') {
            throw new Error('Le paiement n’a pas pu être lancé. Veuillez choisir un autre moyen de paiement ou contacter le support BATIYO.');
          }
          if (errorCode === 'softpay_operator_sandbox_unavailable') {
            throw new Error('Le paiement Mobile Money n’est pas activé en mode production. Vérifiez PAYDUNYA_MODE=live dans les secrets Supabase.');
          }
          throw new Error((errorData && errorData.message) || result.error.message || 'Le service de paiement a retourné une erreur.');
        }
        const data = result.data || {};
        if (!data.success) throw new Error(data.message || data.error || 'Impossible de lancer le paiement.');
        feedback.className = 'banner banner-info';
        feedback.textContent = data.message || 'Demande envoyée. Suivez les instructions de votre opérateur.';
        if (data.action_url) {
          const action = B.el('<a class="btn btn-primary btn-block mt-12" target="_blank" rel="noopener noreferrer">Ouvrir le moyen de paiement</a>');
          action.href = data.action_url;
          form.insertBefore(action, feedback.nextSibling);
        }
        if (data.action_url && data.action_label) {
          const label = B.el('<p class="tiny muted mt-8"></p>');
          label.textContent = data.action_label;
          form.insertBefore(label, feedback.nextSibling);
        }
      } catch (error) {
        feedback.className = 'banner banner-warn';
        feedback.textContent = error.message || 'Le paiement n’a pas pu être initialisé. Votre abonnement sera activé uniquement après confirmation effective du paiement.';
      } finally {
        submit.disabled = false;
        submit.textContent = 'Lancer le paiement sécurisé';
      }
    });
    return wrap;
  }

  /* ----------------------------------- FAQ -------------------------------- */
  function faq() {
    const items = [
      ['BATIYO fonctionne-t-il hors connexion ?', 'Oui. Les fonctions essentielles — clients, devis, factures, chantiers, dépenses, calculs, catalogue, historique et génération de documents — fonctionnent sans Internet. L’indicateur en haut de l’écran vous montre l’état de la connexion.'],
      ['Comment créer un devis ?', 'Ouvrez « Devis », appuyez sur « Nouveau devis », choisissez un client, puis ajoutez vos matériaux et services. BATIYO calcule automatiquement chaque ligne et le total, puis génère le PDF.'],
      ['Comment convertir un devis en facture ?', 'Ouvrez le devis accepté et appuyez sur « Convertir en facture ». BATIYO copie le client, les lignes, les remises et les totaux dans une nouvelle facture. Le devis reste inchangé, marqué « Converti en facture ».'],
      ['Comment changer mon métier ?', 'Allez dans Profil → Activité et choisissez un autre métier. Le catalogue proposé pour vos prochains devis change immédiatement, mais vos anciens documents restent exactement identiques.'],
      ['Comment ajouter une dépense ?', 'Ouvrez « Dépenses », appuyez sur « Ajouter une dépense » et renseignez la catégorie, le montant, la date et le chantier concerné. Vous pouvez joindre une photo du justificatif.'],
      ['Comment suivre la rentabilité d’un chantier ?', 'Chaque chantier affiche le montant du contrat, le budget prévu, les dépenses réelles, l’écart et le résultat provisoire. L’écran d’analyse compare le budget et le réel poste par poste.'],
      ['Comment partager un devis ?', 'Depuis le devis, appuyez sur « Partager » : BATIYO prépare le message et ouvre WhatsApp si l’application est disponible. Vous pouvez aussi télécharger le PDF et l’envoyer vous-même.'],
      ['Mes données sont-elles isolées ?', 'Oui. Chaque entreprise possède ses propres clients, devis, factures, chantiers et dépenses. Les données sont enregistrées sur votre appareil et une synchronisation sécurisée est prévue.'],
      ['BATIYO fait-il de la comptabilité ?', 'Non. BATIYO fournit des calculs opérationnels (budget, dépenses, marge estimée, résultat provisoire). Ce n’est pas un logiciel de comptabilité et cela ne remplace pas un comptable.']
    ];
    const page = publicPage('FAQ', 'Les réponses aux questions les plus fréquentes.', '<div class="mt-16">' + items.map(function (it) { return faqItem(it[0], it[1]); }).join('') + '</div>', true);
    /* Les éléments FAQ sont créés via HTML dans publicPage : on attache donc
       les événements après insertion dans le vrai DOM de la page retournée. */
    page.querySelectorAll('.faq-q').forEach(function (button) {
      button.setAttribute('aria-expanded', 'false');
      button.addEventListener('click', function () {
        const item = button.closest('.faq-item');
        if (!item) return;
        const open = item.classList.toggle('open');
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
    return page;
  }
  function faqItem(q, a) {
    return '<div class="faq-item"><button type="button" class="faq-q" aria-expanded="false">' + h(q) + '<span class="chev">' + ui().icon('chevronDown', 18) + '</span></button><div class="faq-a">' + h(a) + '</div></div>';
  }

  /* -------------------------------- Pages légales ------------------------- */
  const LEGAL = {
    terms: {
      title: 'Conditions d’utilisation',
      sections: [
        ['Objet du service', 'BATIYO est un outil de gestion destiné aux artisans et petites entreprises : création de devis et factures, suivi des chantiers, des dépenses et de la rentabilité. Les paiements d’abonnement sont traités par PayDunya via SoftPay, selon les pays et opérateurs activés sur le compte marchand. BATIYO ne fournit pas de portefeuille électronique ni de service de transfert d’argent. BATIYO ne remplace pas un conseil comptable, fiscal ou juridique.'],
        ['Compte utilisateur', 'Vous êtes responsable de l’exactitude des informations saisies et de la confidentialité de votre mot de passe. Chaque compte correspond à une entreprise et les données sont isolées entre entreprises.'],
        ['Documents générés', 'Les devis, factures et rapports générés reflètent les données que vous avez enregistrées. Vous restez responsable de leur conformité commerciale et fiscale.'],
        ['Métier et catalogue', 'Le métier choisi détermine le catalogue proposé. Les prix sont des valeurs indicatives que vous pouvez modifier librement ; les anciens documents conservent leurs propres prix.'],
        ['Disponibilité', 'BATIYO fonctionne hors connexion pour les fonctions essentielles. Certaines fonctionnalités nécessitant Internet (synchronisation, partage) peuvent être indisponibles temporairement.'],
        ['Limitation', 'BATIYO fournit des calculs opérationnels et des estimations (« résultat provisoire », « marge estimée »). Ces informations ne constituent pas un bénéfice comptable définitif.']
      ]
    },
    privacy: {
      title: 'Politique de confidentialité',
      sections: [
        ['Données enregistrées', 'BATIYO enregistre les données nécessaires à votre activité : profil, entreprise, clients, devis, factures, chantiers, dépenses, photos et documents joints.'],
        ['Stockage et synchronisation', 'BATIYO utilise Supabase pour la persistance du compte et des données métier lorsqu’un compte est connecté. Un cache local est conservé pour l’utilisation hors connexion.'],
        ['Partage', 'Les données sont traitées par l’infrastructure BATIYO/Supabase nécessaire au fonctionnement du compte. Le partage d’un document (WhatsApp, email) est déclenché uniquement par vous.'],
        ['Assistant BATIYO', 'L’assistant utilise uniquement les données auxquelles vous avez accès. Les calculs sont réalisés par l’application ; l’assistant ne fabrique jamais de données et demande toujours confirmation avant d’enregistrer une action.'],
        ['Images et justificatifs', 'Les photos de reçus, de chantier et les logos sont stockés avec vos données. Les fonctions de reconnaissance automatique de reçus ne sont pas activées dans cette version.'],
        ['Vos droits', 'Vous pouvez modifier ou supprimer vos données depuis l’application, y compris les clients, documents, dépenses, profil et cache local.']
      ]
    },
    notice: {
      title: 'Mentions légales',
      sections: [
        ['Éditeur', 'BATIYO — application de gestion pour les artisans et petites entreprises. Application éditée par BATIYO ; les informations juridiques définitives seront renseignées avant la mise en service commerciale.'],
        ['Contact', 'Contact : à renseigner avant la mise en service commerciale.'],
        ['Hébergement', 'Les données sont conservées dans l’espace BATIYO de l’utilisateur via Supabase et mises en cache localement pour permettre l’utilisation hors connexion.'],
        ['Propriété', 'Les marques, textes et éléments graphiques de BATIYO sont protégés. Les données saisies par l’utilisateur lui appartiennent.'],
        ['Fonctions non disponibles', 'Les abonnements BATIYO Pro peuvent être réglés via PayDunya SoftPay dans les pays et pour les opérateurs activés sur le compte marchand. Le paiement reste soumis à l’activation du compte marchand et à la disponibilité de chaque opérateur. BATIYO ne fournit pas de portefeuille électronique ni de transfert d’argent.']
      ]
    }
  };
  function legal(kind) {
    const doc = LEGAL[kind] || LEGAL.terms;
    return publicPage(doc.title, 'Dernière mise à jour : ' + B.dateLong(B.today()), '<div class="legal mt-16">' +
      doc.sections.map(function (s) { return '<h2>' + h(s[0]) + '</h2><p>' + h(s[1]) + '</p>'; }).join('') +
      '<div class="banner banner-info mt-24">' + ui().icon('info', 18) + '<span>Document préliminaire. Les conditions définitives seront publiées avant la mise en service commerciale.</span></div></div>', true);
  }

  /* ------------------------- Gabarit de page publique ---------------------- */
  function publicPage(title, subtitle, bodyHtml, narrow) {
    const wrap = B.el('<div class="lp"></div>');
    const returnPath = B.session && B.session.isLoggedIn() ? '#/dashboard' : '#/';
    wrap.innerHTML = `
      <header class="lp-header scrolled">
        <div class="container"><div class="inner">
          <a href="#/" class="lp-logo">${logoMark()} BATIYO</a>
          <nav class="lp-nav">
            <a href="#/#fonctionnalites">Fonctionnalités</a>
            <a href="#/#metiers">Métiers</a>
            <a href="#/pricing">Tarifs</a>
            <a href="#/faq">FAQ</a>
          </nav>
          <div class="lp-actions">
            ${publicAccountActions()}
          </div>
        </div></div>
      </header>
      <main class="container ${narrow ? 'narrow' : ''}" style="padding-top:28px;padding-bottom:40px">
        <a href="${returnPath}" class="btn btn-ghost btn-sm">${ui().icon('arrowLeft', 16)} ${B.session && B.session.isLoggedIn() ? 'Retour à mon espace' : 'Retour à l\'accueil'}</a>
        <h1 class="mt-16">${h(title)}</h1>
        <p class="muted mt-8">${h(subtitle || '')}</p>
        ${bodyHtml}
      </main>
      <footer class="lp-footer"><div class="container"><div class="bottom"><div>© BATIYO — Tous droits réservés.</div>
        <div class="row" style="gap:14px"><a href="#/legal/terms">Conditions</a><a href="#/legal/privacy">Confidentialité</a><a href="#/legal/notice">Mentions légales</a></div></div></div></footer>`;
    return wrap;
  }

  B.screens = B.screens || {};
  Object.assign(B.screens, {
    landing: landing, login: login, register: register, onboarding: onboarding,
    pricing: pricing, subscribe: subscribe, faq: faq, legal: legal, logoMark: logoMark, authLayout: authLayout,
    phoneMockup: phoneMockup, heroAppMockup: heroAppMockup
  });
})(globalThis.BATIYO = globalThis.BATIYO || {});
