/* =========================================================================
   BATIYO — 19. ROUTEUR, COQUILLE APPLICATIVE, RÉSEAU, PWA
   Navigation mobile-first (#95, #96), protection des routes (#169),
   indicateur hors connexion (#83, #164, #165), installation PWA (#162, #163).
   ========================================================================= */
(function (B) {
  'use strict';
  const h = B.escape;
  const ui = function () { return B.ui; };

  /* --------------------------------- Réseau ------------------------------- */
  B.network = {
    _state: navigator.onLine === false ? 'offline' : 'online',
    _wasOffline: false,
    state: function () { return B.network._state; },
    init: function () {
      window.addEventListener('online', function () {
        B.network._state = 'online';
        ui().toast('Connexion rétablie.', 'success');
        B.network._wasOffline = false;
        B.bus.emit('net:change', 'online');
        B.DataRepository.syncNow().then(function () {
          ui().toast('Synchronisation terminée.', 'success', { duration: 3000 });
        }).catch(function (e) {
          B.bus.emit('sync:error', e);
        });
        B.router.refresh();
      });
      window.addEventListener('offline', function () {
        B.network._state = 'offline';
        B.network._wasOffline = true;
        ui().toast('Vous êtes hors connexion. Vos données locales restent accessibles.', 'info', { duration: 5000 });
        B.bus.emit('net:change', 'offline');
        B.router.refresh();
      });
    }
  };

  /* -------------------------------- Itinéraires --------------------------- */
  const ROUTES = [
    { path: '/', public: true, screen: function () { return B.screens.landing(); } },
    { path: '/login', public: true, screen: function () { return B.screens.login(); } },
    { path: '/register', public: true, screen: function () { return B.screens.register(); } },
    { path: '/pricing', public: true, screen: function () { return B.screens.pricing(); } },
    { path: '/faq', public: true, screen: function () { return B.screens.faq(); } },
    { path: '/legal/:kind', public: true, screen: function (ctx) { return B.screens.legal(ctx.params.kind); } },
    { path: '/onboarding', screen: function () { return B.screens.onboarding(); } },
    { path: '/dashboard', title: 'Tableau de bord', screen: function () { return B.screens.dashboard(); } },
    { path: '/clients', title: 'Clients', screen: function () { return B.screens.clientsList(); } },
    { path: '/clients/:id', title: 'Fiche client', screen: function (ctx) { return B.screens.clientDetail(ctx); } },
    { path: '/catalog', title: 'Catalogue', screen: function () { return B.screens.catalog(); } },
    { path: '/quotes', title: 'Devis', screen: function (ctx) { return B.screens.quotesList(ctx); } },
    { path: '/quotes/new', title: 'Nouveau devis', screen: function (ctx) { return B.screens.quoteEditor(ctx); } },
    { path: '/quotes/:id/edit', title: 'Modifier le devis', screen: function (ctx) { return B.screens.quoteEditor(ctx); } },
    { path: '/quotes/:id', title: 'Devis', screen: function (ctx) { return B.screens.quoteDetail(ctx); } },
    { path: '/invoices', title: 'Factures', screen: function () { return B.screens.invoicesList(); } },
    { path: '/invoices/new', title: 'Nouvelle facture', screen: function (ctx) { return B.screens.invoiceEditor(ctx); } },
    { path: '/invoices/:id/edit', title: 'Modifier la facture', screen: function (ctx) { return B.screens.invoiceEditor(ctx); } },
    { path: '/invoices/:id', title: 'Facture', screen: function (ctx) { return B.screens.invoiceDetail(ctx); } },
    { path: '/projects', title: 'Chantiers', screen: function () { return B.screens.projectsList(); } },
    { path: '/projects/:id', title: 'Chantier', screen: function (ctx) { return B.screens.projectDetail(ctx); } },
    { path: '/expenses', title: 'Dépenses', screen: function () { return B.screens.expenses(); } },
    { path: '/documents', title: 'Documents', screen: function () { return B.screens.documents(); } },
    { path: '/analysis', title: 'Analyse', screen: function () { return B.screens.analysis(); } },
    { path: '/assistant', title: 'Assistant BATIYO', screen: function () { return B.screens.assistant(); } },
    { path: '/profile', title: 'Mon profil', screen: function () { return B.screens.profile(); } },
    { path: '/settings', title: 'Paramètres', screen: function () { return B.screens.settings(); } }
  ];

  const NAV = [
    { path: '/dashboard', label: 'Tableau de bord', icon: 'dashboard', mobile: true, mobileLabel: 'Accueil' },
    { path: '/quotes', label: 'Devis', icon: 'doc', mobile: true },
    { path: '/invoices', label: 'Factures', icon: 'invoice', mobile: true },
    { path: '/projects', label: 'Chantiers', icon: 'hardhat', mobile: true },
    { path: '/clients', label: 'Clients', icon: 'users', more: true },
    { path: '/expenses', label: 'Dépenses', icon: 'coins', more: true },
    { path: '/catalogue-', label: 'Catalogue', icon: 'grid', more: true, path2: '/catalog' },
    { path: '/assistant', label: 'Assistant', icon: 'sparkles', more: true },
    { path: '/profile', label: 'Profil', icon: 'user', more: true }
  ];

  function match(route, path) {
    const rp = route.split('/').filter(Boolean);
    const pp = path.split('/').filter(Boolean);
    if (rp.length !== pp.length) {
      if (!(rp.length === 0 && pp.length === 0)) return null;
    }
    const params = {};
    for (let i = 0; i < rp.length; i++) {
      if (rp[i][0] === ':') params[rp[i].slice(1)] = decodeURIComponent(pp[i]);
      else if (rp[i] !== pp[i]) return null;
    }
    return params;
  }
  function parseHash() {
    const raw = (location.hash || '#/').slice(1);
    const [p, q] = raw.split('?');
    const query = {};
    (q || '').split('&').filter(Boolean).forEach(function (kv) {
      const [k, v] = kv.split('=');
      query[k] = decodeURIComponent(v || '');
    });
    return { path: p || '/', query: query };
  }

  const router = {
    current: null,
    ctx: null,
    go: function (path) {
      const clean = path.replace(/^#/, '');
      if (('#' + clean) === location.hash) { router.render(); return; }
      location.hash = clean;
    },
    refresh: function () {
      /* Ré-rend la vue courante en conservant la position de défilement */
      if (router.current && router.current._cleanup) router.current._cleanup();
      const scroll = window.scrollY || 0;
      const view = document.getElementById('view');
      if (view) view.innerHTML = '';
      router.render();
      if (typeof window.scrollTo === 'function') { try { window.scrollTo(0, scroll); } catch (e) { /* ignore */ } }
    },
    render: function () {
      const { path, query } = parseHash();
      const loggedIn = B.session.isLoggedIn();
      const app = document.getElementById('app');
      if (router.current && router.current._cleanup) { try { router.current._cleanup(); } catch (e) { /* ignore */ } }
      router.current = null;

      /* Landing page avec ancre morte (#fonctionnalites…) → accueil */
      if (path !== '/' && !path.match(/^\/legal/)) { /* normal */ }
      let route = null, params = {};
      for (const r of ROUTES) {
        const m = match(r.path, path);
        if (m) { route = r; params = m; break; }
      }
      if (!route) {
        document.body.style.overflow = '';
        app.innerHTML = '';
        app.appendChild(shellFor(B.screens.notFound('Cette page n’existe pas. Revenez à l’accueil pour continuer.'), 'Page introuvable', query));
        return;
      }

      /* Protection des routes (#169) */
      if (!route.public && !loggedIn) {
        ui().toast('Connectez-vous pour accéder à votre espace.', 'info');
        location.hash = '/login';
        return;
      }
      if (loggedIn && (path === '/login' || path === '/register') && !query.stay) {
        location.hash = '/dashboard';
        return;
      }

      /* Bouton flottant : uniquement sur les écrans de liste et le tableau de
         bord. Sur les écrans de détail et de saisie il masquerait les totaux
         ou la zone de saisie, et ces écrans proposent déjà leurs actions. */
      const FAB_PATHS = ['/dashboard', '/quotes', '/invoices', '/clients', '/projects',
        '/expenses', '/catalog', '/documents', '/analysis'];
      document.body.classList.toggle('no-fab', FAB_PATHS.indexOf(path) === -1);

      router.ctx = { path: path, query: query, params: params, route: route };
      const view = route.screen(router.ctx);
      router.current = view;
      document.body.style.overflow = '';

      if (route.public) {
        app.innerHTML = '';
        app.appendChild(view);
        document.title = route.title ? route.title + ' — BATIYO' : 'BATIYO — Devis et gestion pour artisans';
      } else {
        app.innerHTML = '';
        app.appendChild(shellFor(view, route.title || 'BATIYO', query));
        document.title = (route.title || 'BATIYO') + ' — BATIYO';
      }
      /* Ouverture de l'élément demandé par l'URL (client=, project=) */
      if (query.client || query.project) setTimeout(function () { B.bus.emit('query:preset', query); }, 0);
      if (window.scrollY > 0 && path !== '/' && typeof window.scrollTo === 'function') {
        try { window.scrollTo(0, 0); } catch (e) { /* ignore */ }
      }
    }
  };

  /* ---------------------------- Coquille applicative --------------------- */
  function shellFor(view, title, query) {
    const shell = B.el('<div class="shell"></div>');
    shell.innerHTML = '<aside class="sidebar"></aside><div class="main"><header class="topbar"></header><div class="content"><div class="content-inner" id="view"></div></div></div>';
    const sidebar = B.$('.sidebar', shell);

    /* Sidebar (#170) */
    sidebar.appendChild(B.el('<a class="brand" href="#/dashboard">' + B.screens.logoMark() + '<span class="name">BATIYO</span></a>'));
    NAV.filter(function (n) { return !n.more; }).forEach(function (n) {
      const link = B.el('<a class="nav-link' + (isActive(n.path) ? ' active' : '') + '" href="#' + n.path + '">' + ui().icon(n.icon, 19) + h(n.label) +
        (n.path === '/quotes' ? badgeCount('quotes') : '') + (n.path === '/invoices' ? badgeCount('invoices') : '') + '</a>');
      sidebar.appendChild(link);
    });
    sidebar.appendChild(B.el('<div class="divider"></div>'));
    [['/clients', 'Clients', 'users'], ['/expenses', 'Dépenses', 'coins'], ['/catalog', 'Catalogue', 'grid'],
     ['/documents', 'Documents', 'file'], ['/analysis', 'Analyse', 'chart'], ['/assistant', 'Assistant', 'sparkles'],
     ['/profile', 'Profil', 'user']].forEach(function (n) {
      sidebar.appendChild(B.el('<a class="nav-link' + (isActive(n[0]) ? ' active' : '') + '" href="#' + n[0] + '">' + ui().icon(n[2], 19) + h(n[1]) + '</a>'));
    });
    sidebar.appendChild(B.el('<div class="spacer"></div>'));
    const foot = B.el('<div class="foot"></div>');
    foot.innerHTML = '<a class="nav-link" href="#/settings">' + ui().icon('settings', 19) + 'Paramètres</a>' +
      '<a class="nav-link" href="#/faq">' + ui().icon('info', 19) + 'Aide</a>' +
      '<button class="nav-link" data-logout>' + ui().icon('logout', 19) + 'Déconnexion</button>';
    B.$('[data-logout]', foot).addEventListener('click', function () {
      ui().confirm({ title: 'Se déconnecter ?', message: 'Vos données restent enregistrées dans votre espace BATIYO ; ce bouton déconnecte seulement cet appareil.', confirmLabel: 'Se déconnecter' })
        .then(function (ok) { if (ok) { B.authService.logout(); B.router.go('/'); } });
    });
    sidebar.appendChild(foot);

    /* Topbar (#171, #172, #173) */
    const top = B.$('.topbar', shell);
    const user = B.session.user() || {};
    top.innerHTML = '<button class="iconbtn only-sm" data-menu aria-label="Menu">' + ui().icon('menu', 19) + '</button>' +
      '<h1>' + h(title) + '</h1>' +
      '<span data-net style="margin-right:4px">' + B.screens.netPill() + '</span>' +
      '<button class="iconbtn hide-sm" data-search aria-label="Recherche globale">' + ui().icon('search', 19) + '</button>' +
      '<button class="iconbtn" data-notifs aria-label="Notifications">' + ui().icon('bell', 19) + (B.notificationService.unread().length ? '<span class="dot"></span>' : '') + '</button>' +
      '<button class="iconbtn" data-account aria-label="Mon compte" style="border:0;background:none;width:auto">' +
      (user.avatar ? '<img class="avatar-img" src="' + h(user.avatar) + '" alt="">' : '<div class="avatar-initials">' + h(B.initials(user.name || 'BATIYO')) + '</div>') + '</button>';
    B.$('[data-search]', top).addEventListener('click', globalSearch);
    B.$('[data-notifs]', top).addEventListener('click', function () { B.screens.notificationsSheet(); });
    B.$('[data-account]', top).addEventListener('click', accountMenu);
    B.$('[data-menu]', top).addEventListener('click', mobileMenu);

    /* Bandeau hors connexion (#164) */
    if (B.network.state() === 'offline') {
      B.$('.content', shell).insertBefore(B.el('<div class="banner banner-warn mb-12">' + ui().icon('wifiOff', 18) +
        '<span>Vous êtes hors connexion. Vos données locales restent accessibles : vous pouvez continuer à travailler.</span></div>'), B.$('#view', shell));
    }

    /* Barre mobile (#96, #277) */
    const bottom = B.el('<nav class="bottomnav"></nav>');
    [['/dashboard', 'Accueil', 'dashboard'], ['/quotes', 'Devis', 'doc'], ['/invoices', 'Factures', 'invoice'], ['/projects', 'Chantiers', 'hardhat']]
      .forEach(function (n) {
        bottom.appendChild(B.el('<button class="' + (isActive(n[0]) ? 'active' : '') + '" data-nav="' + n[0] + '"><span class="ico">' + ui().icon(n[2], 20) + '</span>' + h(n[1]) + '</button>'));
      });
    bottom.appendChild(B.el('<button class="' + (MORE_PATHS.some(isActive) ? 'active' : '') + '" data-more><span class="ico">' + ui().icon('dotsH', 20) + '</span>Plus</button>'));
    B.on(bottom, 'click', '[data-nav]', function (e, b) { B.router.go(b.dataset.nav); });
    B.$('[data-more]', bottom).addEventListener('click', moreMenu);

    /* Le bouton flottant est masqué sur les écrans où il gênerait la saisie.
       Masqué sur l'assistant (zone de saisie) — voir FAB_HIDDEN ci-dessous. */
    /* Bouton flottant mobile (#192) */
    const fab = B.el('<div class="fab-wrap only-sm"><div class="fab-menu" hidden>' +
      [['Devis', 'doc', '/quotes/new'], ['Facture', 'invoice', '/invoices/new'], ['Dépense', 'coins', 'expense'], ['Client', 'users', 'client']]
        .map(function (a) { return '<button data-fab="' + a[2] + '">' + ui().icon(a[1], 17) + ' ' + h(a[0]) + '</button>'; }).join('') +
      '</div><button class="fab" data-fab-toggle aria-label="Actions rapides">' + ui().icon('plus', 24) + '</button></div>');
    B.$('[data-fab-toggle]', fab).addEventListener('click', function () {
      const menu = B.$('.fab-menu', fab);
      menu.hidden = !menu.hidden;
    });
    B.on(fab, 'click', '[data-fab]', function (e, b) {
      const v = b.dataset.fab;
      B.$('.fab-menu', fab).hidden = true;
      if (v === 'expense') B.screens.expenseForm(null, null);
      else if (v === 'client') B.components.clientForm(null, null);
      else B.router.go(v);
    });

    /* Insertion de la vue */
    B.$('#view', shell).appendChild(view);
    const main = B.$('.main', shell);
    main.appendChild(bottom);
    main.appendChild(fab);
    ui().bindMoneyInputs(shell);
    return shell;
  }

  const MORE_PATHS = ['/clients', '/expenses', '/catalog', '/documents', '/analysis', '/assistant', '/profile', '/settings'];
  function isActive(path) {
    const cur = router.ctx ? router.ctx.path : '/';
    if (path === '/dashboard') return cur === '/dashboard' || cur === '/';
    return cur === path || cur.indexOf(path + '/') === 0;
  }
  function badgeCount(kind) {
    if (kind === 'quotes') {
      const n = B.quoteService.list({}).filter(function (q) { return q.status === 'accepte'; }).length;
      return n ? '<span class="badge-count">' + n + '</span>' : '';
    }
    if (kind === 'invoices') {
      const n = B.invoiceService.list({}).filter(function (i) { return B.calc.invoiceSummary(i).remaining > 0 && i.status !== 'brouillon' && i.status !== 'annulee'; }).length;
      return n ? '<span class="badge-count">' + n + '</span>' : '';
    }
    return '';
  }

  function mobileMenu() {
    const m = ui().sheet({ title: 'Menu', size: 'wide' });
    const list = B.el('<div class="list"></div>');
    NAV.concat([{ path: '/documents', label: 'Documents', icon: 'file' }, { path: '/analysis', label: 'Analyse', icon: 'chart' },
      { path: '/settings', label: 'Paramètres', icon: 'settings' }, { path: '/faq', label: 'Aide & FAQ', icon: 'info' }])
      .forEach(function (n) {
        const path = n.path2 || n.path;
        const row = B.el('<button class="list-item' + (isActive(path) ? ' active' : '') + '"><div class="avatar neutral">' + ui().icon(n.icon, 18) + '</div>' +
          '<div class="body"><div class="t1">' + h(n.label) + '</div></div>' + ui().icon('chevronRight', 16) + '</button>');
        row.addEventListener('click', function () { m.close(); B.router.go(path); });
        list.appendChild(row);
      });
    m.body.appendChild(list);
  }

  function moreMenu() {
    const m = ui().sheet({ title: 'Plus', size: 'wide' });
    const list = B.el('<div class="list"></div>');
    [['/clients', 'Clients', 'users'], ['/expenses', 'Dépenses', 'coins'], ['/catalog', 'Catalogue', 'grid'],
     ['/documents', 'Documents', 'file'], ['/analysis', 'Analyse', 'chart'], ['/assistant', 'Assistant BATIYO', 'sparkles'],
     ['/profile', 'Profil', 'user'], ['/settings', 'Paramètres', 'settings']].forEach(function (n) {
      const row = B.el('<button class="list-item"><div class="avatar neutral">' + ui().icon(n[2], 18) + '</div>' +
        '<div class="body"><div class="t1">' + h(n[1]) + '</div></div>' + ui().icon('chevronRight', 16) + '</button>');
      row.addEventListener('click', function () { m.close(); B.router.go(n[0]); });
      list.appendChild(row);
    });
    const out = B.el('<button class="btn btn-ghost btn-block mt-12">' + ui().icon('logout', 16) + ' Se déconnecter</button>');
    out.addEventListener('click', function () {
      m.close();
      B.authService.logout();
      B.router.go('/');
    });
    m.body.appendChild(list);
    m.body.appendChild(out);
  }

  function accountMenu() {
    const user = B.session.user() || {};
    const biz = B.session.business();
    const m = ui().sheet({ title: user.name || 'Mon compte', size: 'wide' });
    m.body.appendChild(B.el('<div class="row" style="gap:12px;margin-bottom:12px">' +
      (user.avatar ? '<img class="avatar-img" style="width:48px;height:48px" src="' + h(user.avatar) + '" alt="">' : '<div class="avatar-initials" style="width:48px;height:48px">' + h(B.initials(user.name || '')) + '</div>') +
      '<div><div class="strong">' + h(user.name || '') + '</div><div class="tiny muted">' + h(biz ? biz.name : '') + ' · ' + h(B.session.profession().name) + '</div></div></div>'));
    const list = B.el('<div class="list"></div>');
    [['/profile', 'Voir mon profil', 'user'], ['/settings', 'Paramètres', 'settings'], ['/assistant', 'Assistant BATIYO', 'sparkles']].forEach(function (n) {
      const row = B.el('<button class="list-item"><div class="avatar neutral">' + ui().icon(n[2], 18) + '</div><div class="body"><div class="t1">' + h(n[1]) + '</div></div>' + ui().icon('chevronRight', 16) + '</button>');
      row.addEventListener('click', function () { m.close(); B.router.go(n[0]); });
      list.appendChild(row);
    });
    const out = B.el('<button class="list-item"><div class="avatar danger">' + ui().icon('logout', 18) + '</div><div class="body"><div class="t1 tone-danger">Déconnexion</div></div></button>');
    out.addEventListener('click', function () { m.close(); B.authService.logout(); B.router.go('/'); });
    list.appendChild(out);
    m.body.appendChild(list);
  }

  /* --------------------------- Recherche globale (#81) -------------------- */
  function globalSearch() {
    const body = B.el('<div class="stack"></div>');
    const input = B.el('<div class="search">' + ui().icon('search', 18) + '<input placeholder="Client, devis, chantier, dépense, article…" aria-label="Recherche globale"></div>');
    const results = B.el('<div></div>');
    body.appendChild(input);
    body.appendChild(results);
    const m = ui().modal({ title: 'Recherche globale', body: body, size: 'wide' });
    const inp = B.$('input', input);
    function paint() {
      const q = inp.value.trim();
      results.innerHTML = '';
      if (q.length < 2) {
        results.appendChild(B.el('<p class="muted small">Tapez au moins 2 caractères. Exemples : <strong>Koffi</strong>, <strong>DEV-2026</strong>, <strong>ciment</strong>, <strong>Maison</strong>.</p>'));
        const quick = B.el('<div class="stack-sm mt-12"></div>');
        quick.appendChild(B.el('<div class="tiny muted">Raccourcis</div>'));
        [['Voir mes devis', '#/quotes', 'doc'], ['Voir mes chantiers', '#/projects', 'hardhat'], ['Voir mes dépenses', '#/expenses', 'coins'], ['Demander à BATIYO', '#/assistant', 'sparkles']].forEach(function (r) {
          const b = B.el('<button class="list-item"><div class="avatar neutral">' + ui().icon(r[2], 18) + '</div><div class="body"><div class="t1">' + h(r[0]) + '</div></div>' + ui().icon('chevronRight', 16) + '</button>');
          b.addEventListener('click', function () { m.close(); B.router.go(r[1].replace('#', '')); });
          quick.appendChild(b);
        });
        results.appendChild(quick);
        return;
      }
      const rows = B.searchService.search(q);
      if (!rows.length) {
        results.appendChild(B.el('<div class="empty"><div class="il">' + ui().icon('search', 26) + '</div><h3>Aucun résultat</h3><p>Aucun élément ne correspond à « ' + h(q) + ' » dans vos données.</p></div>'));
        return;
      }
      let group = null, host = null;
      rows.forEach(function (r) {
        if (r.group !== group) {
          group = r.group;
          results.appendChild(B.el('<div class="tiny muted strong mt-12 mb-8">' + h(group) + '</div>'));
          host = B.el('<div class="list"></div>');
          results.appendChild(host);
        }
        const row = B.el('<button class="list-item"><div class="avatar neutral">' + ui().icon(r.icon, 18) + '</div>' +
          '<div class="body"><div class="t1">' + h(r.title) + '</div><div class="t2">' + h(r.subtitle) + '</div></div>' + ui().icon('chevronRight', 16) + '</button>');
        row.addEventListener('click', function () { m.close(); B.router.go(r.route.replace('#', '')); });
        host.appendChild(row);
      });
    }
    inp.addEventListener('input', B.debounce(paint, 140));
    paint();
    setTimeout(function () { inp.focus(); }, 80);
  }

  /* ---------------------------------- PWA --------------------------------- */
  const pwa = {
    deferred: null,
    init: function () {
      if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('sw.js').catch(function () { /* hors ligne : pas bloquant */ });
        });
      }
      window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        pwa.deferred = e;
        pwa.showInstallBanner();
      });
    },
    showInstallBanner: function () {
      const host = document.querySelector('.content-inner');
      if (!host || document.getElementById('pwa-banner')) return;
      const banner = B.el('<div id="pwa-banner" class="card banner banner-info" style="align-items:center;gap:12px">' +
        ui().icon('download', 20) + '<div class="grow"><strong>Installer BATIYO</strong><div class="small">Installez l’application sur votre téléphone : elle s’ouvrira en plein écran et fonctionnera hors connexion.</div></div>' +
        '<button class="btn btn-primary btn-sm" data-install>Installer</button>' +
        '<button class="iconbtn" data-dismiss aria-label="Fermer">' + ui().icon('x', 16) + '</button></div>');
      B.$('[data-install]', banner).addEventListener('click', async function () {
        if (!pwa.deferred) return;
        pwa.deferred.prompt();
        const res = await pwa.deferred.userChoice;
        if (res && res.outcome === 'accepted') ui().toast('Merci ! BATIYO a été installé.', 'success');
        banner.remove();
      });
      B.$('[data-dismiss]', banner).addEventListener('click', function () { banner.remove(); });
      host.insertBefore(banner, host.firstChild);
    },
    showIosHint: function () {
      const host = document.querySelector('.content-inner');
      if (!host || document.getElementById('pwa-banner')) return;
      if (/iphone|ipad/i.test(navigator.userAgent) && !window.navigator.standalone) {
        host.insertBefore(B.el('<div id="pwa-banner" class="banner banner-info">' + ui().icon('info', 18) +
          '<span>Sur iPhone : appuyez sur <strong>Partager</strong> puis <strong>Sur l’écran d’accueil</strong> pour installer BATIYO.</span></div>'), host.firstChild);
      }
    }
  };

  /* --------------------------------- Démarrage ---------------------------- */
  async function boot() {
    B.DataRepository.init();
    B.referenceData();
    B.network.init();
    pwa.init();
    B.bus.on('session:logout', function () { if (location.hash !== '#/') location.hash = '/'; });
    B.bus.on('session:login', function () { B.router.refresh(); });
    window.addEventListener('hashchange', function () { router.render(); });

    /* Restaurer la session Supabase et hydrater le cache local si possible. */
    if (B.DataRepository.remote && B.DataRepository.remote.ready) {
      try { await B.DataRepository.hydrate(); } catch (e) { B.bus.emit('sync:error', e); }
      B.DataRepository.remote.onAuthStateChange(function (event) {
        if (event === 'SIGNED_OUT') { B.session.logout(); }
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setTimeout(function () { B.DataRepository.hydrate().catch(function (e) { B.bus.emit('sync:error', e); }); }, 0);
        }
      });
    }

    router.render();
    try { if (B.session.isLoggedIn()) B.budgetWatch.scanAll(); } catch (e) { /* non bloquant */ }
    if (!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)) setTimeout(pwa.showIosHint, 2500);
  }

  B.router = router;
  B.boot = boot;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(globalThis.BATIYO = globalThis.BATIYO || {});
