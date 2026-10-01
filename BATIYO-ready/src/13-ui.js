/* =========================================================================
   BATIYO — 13. BIBLIOTHÈQUE D'INTERFACE (#91, #280)
   Composants réutilisables : icônes, boutons, champs, modales, toasts,
   états vides/chargement/erreur, graphiques, uploaders d'images.
   Aucune logique métier ici (#304, #305).
   ========================================================================= */
(function (B) {
  'use strict';
  const h = B.escape;

  /* ---------------------------------- Icônes ------------------------------ */
  const P = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.6"/><rect x="14" y="3" width="7" height="5" rx="1.6"/><rect x="14" y="12" width="7" height="9" rx="1.6"/><rect x="3" y="16" width="7" height="5" rx="1.6"/>',
    doc: '<path d="M14 3v5h5"/><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2z"/><path d="M8 13h8M8 17h5"/>',
    invoice: '<path d="M4 3h16v18l-3-2-2 2-3-2-3 2-2-2-3 2V3z"/><path d="M8 8h8M8 12h8"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    hardhat: '<path d="M2 18h20v2H2z"/><path d="M4 18a8 8 0 0 1 16 0"/><path d="M12 4v6"/>',
    coins: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    box: '<path d="M21 8v8l-9 4-9-4V8l9-4 9 4z"/><path d="M3 8l9 4 9-4M12 12v8"/>',
    sparkles: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-2.87 1.2V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 6.9 19.4l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 3 13.6H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 6.9l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 10.4 3H10.5a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 2.87 1.2l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 21 10.4v.1a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.5z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    download: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    check: '<path d="m5 13 4 4L19 7"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
    alert: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5v.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="3.5"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5z"/>',
    dots: '<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>',
    dotsH: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    chart: '<path d="M3 21h18"/><rect x="5" y="11" width="4" height="8" rx="1"/><rect x="11" y="6" width="4" height="13" rx="1"/><rect x="17" y="14" width="4" height="5" rx="1"/>',
    trending: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    wifi: '<path d="M5 12.5a11 11 0 0 1 14 0"/><path d="M8.5 16a6.5 6.5 0 0 1 7 0"/><path d="M12 19.5v.5"/>',
    wifiOff: '<path d="m2 2 20 20"/><path d="M8.5 16a6.5 6.5 0 0 1 7 0"/><path d="M5 12.5a11 11 0 0 1 5-2.7"/><path d="M12 19.5v.5"/>',
    cloudOff: '<path d="M22 17.5A4.5 4.5 0 0 0 18 13h-1.3A7 7 0 0 0 5 11.7"/><path d="m2 2 20 20"/><path d="M5 17.5A3.5 3.5 0 0 0 8 20h9"/>',
    sync: '<path d="M21 12a9 9 0 0 1-15.3 6.4L3 16"/><path d="M3 12a9 9 0 0 1 15.3-6.4L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
    brick: '<rect x="3" y="6" width="8" height="5" rx="1"/><rect x="13" y="6" width="8" height="5" rx="1"/><rect x="7" y="13" width="10" height="5" rx="1"/>',
    hammer: '<path d="M15 3l6 6-3 3-6-6 3-3z"/><path d="M11 8 3 16v5h5l8-8"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>',
    brush: '<path d="M9.5 14.5 3 21l5-1 5-5"/><path d="M14 10l6-6a2 2 0 0 0-3-3l-6 6 3 3z"/>',
    tool: '<path d="M14.7 6.3a4 4 0 1 0 5 5L21 21H10l4.7-14.7z"/>',
    store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9z"/><path d="M9 21v-6h6v6"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.4A2 2 0 0 0 9.6 17h9.7l2-9H6"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2 2 0 0 1-2.8-2.8l9.4-9.4z"/>',
    wind: '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h7"/>',
    flame: '<path d="M12 2s5 5 5 10a5 5 0 0 1-10 0c0-1.6.8-3 1.6-4 .4 1 1.3 1.6 2 1.6C11.4 7.6 12 4.8 12 2z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/>',
    truck: '<path d="M3 6h11v9H3z"/><path d="M14 9h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16"/><path d="M2 21h13M13 8h3a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0v-6"/>',
    file: '<path d="M14 3v5h5"/><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2z"/>',
    whatsapp: '<path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2z"/><path d="M8.5 8.5c0 4 3 6.5 6.5 6.5 1 0 1.5-.6 1.5-1.2l-2-1-1 1c-1.2-.5-2.3-1.6-2.8-2.8l1-1-1-2c-.6 0-1.2.5-1.2 1.5z"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    arrowUp: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
    arrowDown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12h14V8M10 12h4"/>',
    star: '<path d="m12 3 2.9 5.9 6.1.9-4.5 4.3 1.1 6.1-5.6-3-5.6 3 1.1-6.1L3 9.8l6.1-.9L12 3z"/>',
    pin: '<path d="M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2A19 19 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6.4 6.4l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16.9z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7L22 6"/>',
    google: '<path d="M21 12h-9v-3h12a9 9 0 1 1-3-7"/><path d="M12 12h9"/>',
    rocket: '<path d="M5 13c-1.5 1.5-2 8-2 8s6.5-.5 8-2"/><path d="M9 15 5 11a11 11 0 0 1 11-8 11 11 0 0 1-1 11l-6 6-4-4z"/><circle cx="15" cy="9" r="1.5"/>',
    heart: '<path d="M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"/>',
    wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.4"/>',
    calculate: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h2M12 11h2M16 11h.5M8 15h2M12 15h2M16 15h.5M8 19h6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>'
  };
  function icon(name, size) {
    const p = P[name] || P.info;
    const s = size || 20;
    return '<svg class="ico" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  /* --------------------------------- Toasts ------------------------------- */
  let toastHost = null;
  function toast(message, tone, opts) {
    const o = opts || {};
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'toasts';
      document.body.appendChild(toastHost);
    }
    const t = B.el('<div class="toast ' + (tone || '') + '" role="status"></div>');
    t.innerHTML = icon(tone === 'success' ? 'checkCircle' : tone === 'error' ? 'alert' : 'info', 18) + '<div class="grow">' + h(message) + '</div>';
    if (o.actionLabel && o.onAction) {
      const b = B.el('<button class="btn btn-sm" style="background:rgba(255,255,255,.16);color:#fff">' + h(o.actionLabel) + '</button>');
      b.addEventListener('click', function () { o.onAction(); t.remove(); });
      t.appendChild(b);
    }
    toastHost.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .3s, transform .3s';
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
      setTimeout(function () { t.remove(); }, 320);
    }, o.duration || 3400);
    return t;
  }

  /* --------------------------------- Modales ------------------------------ */
  let openModals = 0;
  function modal(opts) {
    const o = opts || {};
    const overlay = B.el('<div class="overlay" role="dialog" aria-modal="true"></div>');
    const box = B.el('<div class="modal ' + (o.size === 'wide' ? 'wide-modal' : '') + (o.drawer ? ' drawer' : '') + '"></div>');
    const head = '<div class="modal-head"><h3>' + h(o.title || '') + '</h3>' +
      (o.closable === false ? '' : '<button class="iconbtn" data-close aria-label="Fermer">' + icon('x', 18) + '</button>') + '</div>';
    box.innerHTML = head + '<div class="modal-body"></div>' + (o.footer === false ? '' : '<div class="modal-foot"></div>');
    const bodyEl = B.$('.modal-body', box);
    if (typeof o.body === 'string') bodyEl.innerHTML = o.body;
    else if (o.body) bodyEl.appendChild(o.body);
    const footEl = B.$('.modal-foot', box);
    if (o.foot) {
      if (typeof o.foot === 'string') footEl.innerHTML = o.foot;
      else footEl.appendChild(o.foot);
    }
    /* Le pied de page reste toujours dans le DOM : de nombreux écrans y
       ajoutent leurs boutons après la création de la modale. S'il reste vide,
       la feuille de style le masque. */

    function close(result) {
      overlay.remove();
      openModals = Math.max(0, openModals - 1);
      if (!openModals) document.body.style.overflow = '';
      if (o.onClose) o.onClose(result);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape' && o.closable !== false) close(); }
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay && o.closable !== false) close();
    });
    B.on(box, 'click', '[data-close]', function () { close(); });
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    openModals += 1;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    const focusable = box.querySelector('input, select, textarea, button');
    if (focusable && o.autofocus !== false) setTimeout(function () { focusable.focus(); }, 60);
    return { el: box, body: bodyEl, foot: footEl, close: close, overlay: overlay };
  }

  function confirm(opts) {
    const o = opts || {};
    return new Promise(function (resolve) {
      const m = modal({
        title: o.title || 'Confirmer',
        body: '<p style="color:#334155">' + h(o.message || '') + '</p>' +
          (o.detail ? '<div class="banner banner-' + (o.detailTone || 'warn') + ' mt-12">' + h(o.detail) + '</div>' : ''),
        footer: true,
        onClose: function () { resolve(false); }
      });
      const yes = B.el('<button class="btn ' + (o.tone === 'danger' ? 'btn-danger' : 'btn-primary') + '">' + h(o.confirmLabel || 'Confirmer') + '</button>');
      const no = B.el('<button class="btn btn-ghost">' + h(o.cancelLabel || 'Annuler') + '</button>');
      yes.style.flex = no.style.flex = '1';
      yes.addEventListener('click', function () { m.close(); resolve(true); });
      no.addEventListener('click', function () { m.close(); resolve(false); });
      m.foot.appendChild(no); m.foot.appendChild(yes);
    });
  }

  function sheet(opts) {  /* drawer mobile pour les choix longs (#284) */
    const o = Object.assign({ drawer: true }, opts || {});
    return modal(o);
  }

  /* ------------------------------ Blocs réutilisables --------------------- */
  function badge(label, tone) { return '<span class="badge badge-' + (tone || 'neutral') + '">' + h(label) + '</span>'; }
  function statusBadge(list, id) {
    const s = B.status(list, id);
    return badge(s.label, s.tone);
  }
  function emptyState(opts) {
    const el = B.el('<div class="empty animate-rise"></div>');
    el.innerHTML = '<div class="il">' + icon(opts.icon || 'box', 28) + '</div>' +
      '<h3>' + h(opts.title || 'Aucun élément') + '</h3>' +
      '<p>' + h(opts.text || '') + '</p>';
    if (opts.actionLabel) {
      const b = B.el('<button class="btn btn-primary">' + h(opts.actionLabel) + '</button>');
      b.addEventListener('click', opts.onAction);
      el.appendChild(b);
    }
    if (opts.extra) el.appendChild(opts.extra);
    return el;
  }
  function skeletonList(n) {
    let html = '<div class="stack">';
    for (let i = 0; i < (n || 3); i++) {
      html += '<div class="card"><div class="skeleton sk-line" style="width:40%"></div><div class="skeleton sk-line" style="width:70%"></div><div class="skeleton sk-line" style="width:25%"></div></div>';
    }
    return B.el(html + '</div>');
  }
  function errorState(opts) {
    const el = B.el('<div class="card banner banner-danger"></div>');
    el.innerHTML = icon('alert', 20) + '<div class="grow"><strong>' + h(opts.title || 'Une erreur est survenue') + '</strong><div class="small mt-8">' + h(opts.message || 'Veuillez réessayer.') + '</div></div>';
    if (opts.onRetry) {
      const b = B.el('<button class="btn btn-sm btn-ghost">Réessayer</button>');
      b.addEventListener('click', opts.onRetry);
      el.appendChild(b);
    }
    return el;
  }
  function avatar(name, src, cls) {
    if (src) return '<img class="avatar-img" src="' + h(src) + '" alt="">';
    const t = B.initials(name);
    const tone = /^[0-9]/.test(t) ? 'neutral' : ['', 'success', 'accent', 'info'][t.charCodeAt(0) % 4];
    return '<div class="avatar-initials" style="' + (tone ? '' : '') + '">' + h(t) + '</div>';
  }
  function progress(value, tone) {
    const v = B.clamp(Math.round(value || 0), 0, 100);
    return '<div class="progress ' + (tone || '') + '" role="progressbar" aria-valuenow="' + v + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + v + '%"></span></div>';
  }
  function kv(k, v, cls) {
    return '<div class="kv"><span class="k">' + h(k) + '</span><span class="v ' + (cls || '') + '">' + v + '</span></div>';
  }
  function sectionHead(title, subtitle, right) {
    return '<div class="card-head"><div><h2>' + h(title) + '</h2>' + (subtitle ? '<div class="small muted">' + h(subtitle) + '</div>' : '') + '</div>' + (right || '') + '</div>';
  }

  /* -------------------------------- Graphiques ---------------------------- */
  const PALETTE = ['#0F766E', '#F59E0B', '#0369A1', '#7C3AED', '#DC2626', '#16A34A', '#64748B'];
  function donut(slices, opts) {
    const o = opts || {};
    const total = slices.reduce(function (s, x) { return s + x.value; }, 0) || 1;
    const size = o.size || 148, r = size / 2 - 12, cx = size / 2, cy = size / 2, thick = o.thickness || 18;
    let angle = -Math.PI / 2, paths = '';
    slices.forEach(function (s, i) {
      const frac = s.value / total, a2 = angle + frac * Math.PI * 2;
      if (frac <= 0) return;
      const large = frac > 0.5 ? 1 : 0;
      const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
      const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
      paths += '<path d="M ' + x1 + ' ' + y1 + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x2 + ' ' + y2 + '" stroke="' + (s.color || PALETTE[i % PALETTE.length]) + '" stroke-width="' + thick + '" fill="none" stroke-linecap="butt"/>';
      angle = a2;
    });
    const label = o.centerLabel || '';
    const value = o.centerValue || '';
    return '<div class="donut">' +
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true">' + paths +
      (label ? '<text x="' + cx + '" y="' + (cy - 3) + '" text-anchor="middle" font-size="12" fill="#64748B">' + h(label) + '</text>' +
        '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="14" font-weight="700" fill="#0F172A">' + h(value) + '</text>' : '') +
      '</svg>' +
      '<div class="legend">' + slices.map(function (s, i) {
        const pct = Math.round((s.value / total) * 100);
        return '<div class="li"><span class="swatch" style="background:' + (s.color || PALETTE[i % PALETTE.length]) + '"></span>' + h(s.label) +
          '<span class="val">' + (o.format ? h(o.format(s.value)) : B.money(s.value)) + ' · ' + pct + ' %</span></div>';
      }).join('') + '</div></div>';
  }
  function bars(series, opts) {
    const o = opts || {};
    const max = Math.max.apply(null, series.map(function (s) { return s.value; }).concat([1]));
    return '<div class="bars">' + series.map(function (s) {
      const pct = Math.max(3, Math.round((s.value / max) * 100));
      return '<div class="bar" title="' + h(s.label) + ' : ' + B.money(s.value) + '">' +
        '<div class="fill ' + (o.accent ? 'accent' : '') + '" style="height:' + pct + '%"></div>' +
        '<div class="lbl">' + h(s.label) + '</div></div>';
    }).join('') + '</div>';
  }
  function sparkline(values, opts) {
    const o = opts || {};
    const w = o.width || 220, hh = o.height || 46;
    const max = Math.max.apply(null, values.concat([1]));
    const step = values.length > 1 ? w / (values.length - 1) : w;
    const pts = values.map(function (v, i) { return (i * step) + ',' + (hh - (v / max) * (hh - 6) - 3); }).join(' ');
    return '<svg width="' + w + '" height="' + hh + '" viewBox="0 0 ' + w + ' ' + hh + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<polyline points="' + pts + '" fill="none" stroke="' + (o.color || '#0F766E') + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }
  function gauge(planned, actual) {
    const pct = planned > 0 ? Math.round((actual / planned) * 100) : 0;
    const tone = pct > 100 ? 'danger' : pct >= 85 ? 'warn' : '';
    return '<div class="gauge"><div class="g-bar"><span class="progress ' + tone + '" style="display:block"><span style="width:' + Math.min(100, pct) + '%"></span></span></div>' +
      '<strong class="pill-num ' + (pct > 100 ? 'tone-danger' : pct >= 85 ? 'tone-warn' : 'tone-success') + '">' + pct + ' %</strong></div>';
  }

  /* -------------------------- Champs de formulaire ------------------------ */
  function field(opts) {
    const o = opts || {};
    const id = o.id || B.uid('f');
    const req = o.required ? ' <span style="color:#DC2626">*</span>' : '';
    let control = '';
    if (o.type === 'select') {
      control = '<select class="select" id="' + id + '" name="' + h(o.name || id) + '"' + (o.required ? ' required' : '') + '>' +
        (o.options || []).map(function (op) {
          const val = op.value != null ? op.value : op.id;
          return '<option value="' + h(val) + '"' + (String(o.value) === String(val) ? ' selected' : '') + '>' + h(op.label || op.name) + '</option>';
        }).join('') + '</select>';
    } else if (o.type === 'textarea') {
      control = '<textarea class="textarea" id="' + id + '" name="' + h(o.name || id) + '" placeholder="' + h(o.placeholder || '') + '"' + (o.required ? ' required' : '') + '>' + h(o.value || '') + '</textarea>';
    } else if (o.type === 'money') {
      control = '<div class="input-group"><input class="input money-input" id="' + id + '" name="' + h(o.name || id) + '" inputmode="numeric" autocomplete="off"' +
        ' value="' + h(o.value ? B.num(o.value) : '') + '" data-raw="' + h(o.value || '') + '" placeholder="' + h(o.placeholder || '0') + '"' + (o.required ? ' required' : '') + '>' +
        '<span class="suffix">FCFA</span></div>';
    } else {
      control = '<input class="input" id="' + id + '" name="' + h(o.name || id) + '" type="' + h(o.type || 'text') + '"' +
        ' inputmode="' + h(o.inputmode || (o.type === 'tel' ? 'tel' : o.type === 'number' ? 'numeric' : 'text')) + '"' +
        (o.min != null ? ' min="' + h(o.min) + '"' : '') + (o.max != null ? ' max="' + h(o.max) + '"' : '') +
        (o.step != null ? ' step="' + h(o.step) + '"' : '') +
        ' value="' + h(o.value != null ? o.value : '') + '" placeholder="' + h(o.placeholder || '') + '"' + (o.required ? ' required' : '') + ' autocomplete="' + h(o.autocomplete || 'off') + '">';
    }
    const el = B.el('<div class="field"></div>');
    el.innerHTML = '<label for="' + id + '">' + h(o.label || '') + req + '</label>' + control +
      (o.hint ? '<div class="hint">' + h(o.hint) + '</div>' : '') +
      '<div class="error" data-error hidden></div>';
    el._input = B.$('input, select, textarea', el);
    return el;
  }
  /* Saisie monétaire : affichage 5 500 pendant la frappe lisible (#101, #102) */
  function bindMoneyInputs(root) {
    B.$$('.money-input', root).forEach(function (inp) {
      if (inp.dataset.bound) return;
      inp.dataset.bound = '1';
      inp.addEventListener('input', function () {
        const raw = B.parseNumber(inp.value);
        inp.dataset.raw = raw;
        const caretAtEnd = inp.selectionStart === inp.value.length;
        const formatted = raw ? B.num(raw) : '';
        inp.value = formatted;
        if (caretAtEnd) inp.setSelectionRange(inp.value.length, inp.value.length);
      });
      inp.addEventListener('blur', function () {
        const raw = B.parseNumber(inp.value);
        inp.dataset.raw = raw;
        inp.value = raw ? B.num(raw) : '';
      });
    });
  }
  function moneyValue(input) { return B.parseNumber(input.dataset.raw != null && input.dataset.raw !== '' ? input.dataset.raw : input.value); }
  function showErrors(scope, errors) {
    B.$$('.field .error', scope).forEach(function (e) { e.hidden = true; e.textContent = ''; });
    B.$$('.input, .select, .textarea', scope).forEach(function (i) { i.classList.remove('invalid'); });
    Object.keys(errors || {}).forEach(function (name) {
      const input = B.$('[name="' + name + '"]', scope);
      if (!input) return;
      input.classList.add('invalid');
      const err = input.closest('.field') ? B.$('.error', input.closest('.field')) : null;
      if (err) { err.textContent = errors[name]; err.hidden = false; }
    });
    const first = B.$('.invalid', scope);
    if (first) first.focus();
  }
  function formValues(scope) {
    const out = {};
    B.$$('[name]', scope).forEach(function (i) {
      if (i.classList.contains('money-input')) out[i.name] = moneyValue(i);
      else if (i.type === 'checkbox') out[i.name] = i.checked;
      else out[i.name] = i.value.trim();
    });
    return out;
  }

  /* ------------------------ Sélection / upload d'image -------------------- */
  function imagePicker(opts) {
    const o = opts || {};
    const el = B.el('<div class="uploader"></div>');
    el.innerHTML = icon(o.icon || 'camera', 26) + '<div class="strong">' + h(o.title || 'Ajouter une photo') + '</div>' +
      '<div class="tiny muted">' + h(o.hint || 'Prendre une photo ou choisir dans la galerie') + '</div>';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (o.capture) input.capture = 'environment';
    input.style.display = 'none';
    el.appendChild(input);
    el.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', async function () {
      const file = input.files && input.files[0];
      if (!file) return;
      el.classList.add('dragover');
      const dataUrl = await readImage(file, o.max || 1200);
      el.classList.remove('dragover');
      input.value = '';
      o.onPick(dataUrl, file);
    });
    ['dragover', 'dragenter'].forEach(function (ev) { el.addEventListener(ev, function (e) { e.preventDefault(); el.classList.add('dragover'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { el.addEventListener(ev, function (e) { e.preventDefault(); el.classList.remove('dragover'); }); });
    el.addEventListener('drop', async function (e) {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file && /^image\//.test(file.type)) {
        const dataUrl = await readImage(file, o.max || 1200);
        o.onPick(dataUrl, file);
      }
    });
    return el;
  }
  /* Compression légère côté client (#217) */
  function readImage(file, maxSize) {
    return new Promise(function (resolve) {
      const reader = new FileReader();
      reader.onload = function () {
        const img = new Image();
        img.onload = function () {
          const max = maxSize || 1200;
          let w = img.width, hh = img.height;
          if (Math.max(w, hh) > max) {
            const k = max / Math.max(w, hh);
            w = Math.round(w * k); hh = Math.round(hh * k);
          }
          try {
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = hh;
            canvas.getContext('2d').drawImage(img, 0, 0, w, hh);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          } catch (e) { resolve(reader.result); }
        };
        img.onerror = function () { resolve(reader.result); };
        img.src = reader.result;
      };
      reader.onerror = function () { resolve(null); };
      reader.readAsDataURL(file);
    });
  }
  function imagePreview(src, opts) {
    const o = opts || {};
    const el = B.el('<div class="row" style="gap:12px;align-items:flex-start"></div>');
    el.innerHTML = '<img src="' + h(src) + '" alt="" style="width:96px;height:96px;object-fit:cover;border-radius:12px;border:1px solid var(--line)">' +
      '<div class="stack-sm grow"><div class="strong">' + h(o.title || 'Image') + '</div>' +
      '<div class="tiny muted">' + h(o.subtitle || '') + '</div><div class="btn-row"></div></div>';
    const row = B.$('.btn-row', el);
    (o.actions || []).forEach(function (a) {
      const b = B.el('<button class="btn btn-sm ' + (a.tone === 'danger' ? 'btn-danger' : 'btn-ghost') + '">' + h(a.label) + '</button>');
      b.addEventListener('click', a.onClick);
      row.appendChild(b);
    });
    return el;
  }

  /* ------------------------------ Autres helpers -------------------------- */
  function actionsMenu(items) {  /* menu contextuel « ⋯ » (#133) */
    const btn = B.el('<button class="iconbtn" aria-label="Actions">' + icon('dots', 18) + '</button>');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const m = sheet({ title: 'Actions', size: 'wide' });
      const list = B.el('<div class="list"></div>');
      items.filter(function (i) { return !i.hidden; }).forEach(function (it) {
        const row = B.el('<button class="list-item"></button>');
        row.innerHTML = '<div class="avatar ' + (it.tone === 'danger' ? 'danger' : 'neutral') + '">' + icon(it.icon || 'dots', 18) + '</div>' +
          '<div class="body"><div class="t1 ' + (it.tone === 'danger' ? 'tone-danger' : '') + '">' + h(it.label) + '</div>' +
          (it.hint ? '<div class="t2">' + h(it.hint) + '</div>' : '') + '</div>';
        row.addEventListener('click', function () { m.close(); setTimeout(function () { it.onClick(); }, 40); });
        list.appendChild(row);
      });
      m.body.appendChild(list);
    });
    return btn;
  }
  function dateLabel(iso) { return '<span class="nowrap">' + B.dateShort(iso) + '</span>'; }
  function nav(path) { B.router.go(path); }
  function sheetList(title, items) {
    const m = sheet({ title: title });
    const list = B.el('<div class="list"></div>');
    items.forEach(function (it) {
      const row = B.el('<button class="list-item"></button>');
      row.innerHTML = (it.icon ? '<div class="avatar">' + icon(it.icon, 18) + '</div>' : '') +
        '<div class="body"><div class="t1">' + h(it.label) + '</div>' + (it.subtitle ? '<div class="t2">' + h(it.subtitle) + '</div>' : '') + '</div>' +
        (it.badge || '') ;
      row.addEventListener('click', function () { m.close(); setTimeout(function () { it.onClick(); }, 30); });
      list.appendChild(row);
    });
    m.body.appendChild(list);
    return m;
  }

  B.ui = {
    icon: icon, toast: toast, modal: modal, confirm: confirm, sheet: sheet, sheetList: sheetList,
    badge: badge, statusBadge: statusBadge, emptyState: emptyState, skeletonList: skeletonList,
    errorState: errorState, avatar: avatar, progress: progress, kv: kv, sectionHead: sectionHead,
    donut: donut, bars: bars, sparkline: sparkline, gauge: gauge, PALETTE: PALETTE,
    field: field, bindMoneyInputs: bindMoneyInputs, moneyValue: moneyValue,
    showErrors: showErrors, formValues: formValues,
    imagePicker: imagePicker, readImage: readImage, imagePreview: imagePreview,
    actionsMenu: actionsMenu, dateLabel: dateLabel, nav: nav
  };
})(globalThis.BATIYO = globalThis.BATIYO || {});
