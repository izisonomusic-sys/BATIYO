/* =========================================================================
   BATIYO — 03. UTILITAIRES
   Formatage FCFA / dates FR, identifiants, helpers DOM & texte (#101→#105).
   ========================================================================= */
(function (B) {
  'use strict';

  /* --------------------------- Nombres & monnaie -------------------------- */
  function group(n) {
    const neg = n < 0;
    const s = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (neg ? '-' : '') + s;
  }
  B.round = function (n) { return Math.round((Number(n) || 0) * 100) / 100; };
  /* FCFA : pas de centimes dans l'affichage utilisateur (#101, #102) */
  B.money = function (n) { return group(B.round(n)) + ' ' + B.CURRENCY; };
  B.moneyShort = function (n) {
    const a = Math.abs(Number(n) || 0);
    if (a >= 1000000) return group(Math.round(a / 100000) / 10) + ' M FCFA';
    if (a >= 1000) return group(Math.round(a / 1000)) + ' k FCFA';
    return group(a) + ' FCFA';
  };
  B.num = function (n) { return group(Number(n) || 0); };
  B.percent = function (n, d) { return group(Math.round((Number(n) || 0) * 10) / 10) + ' %'; };
  B.signedMoney = function (n) { return (n > 0 ? '+' : '') + B.money(n); };
  B.parseNumber = function (v) {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    const cleaned = String(v).replace(/[^\d,.-]/g, '').replace(/\s/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  /* -------------------------------- Dates -------------------------------- */
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  B.toISODate = function (d) {
    const x = d instanceof Date ? d : new Date(d);
    if (isNaN(x)) return '';
    return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  B.today = function () { return B.toISODate(new Date()); };
  B.addDays = function (iso, days) {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return B.toISODate(d);
  };
  B.dateLong = function (v) {                 /* 29 septembre 2026 (#104) */
    if (!v) return '—';
    const d = new Date(String(v).slice(0, 10) + 'T00:00:00');
    if (isNaN(d)) return '—';
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  };
  B.dateShort = function (v) {                /* 29/09/2026 */
    if (!v) return '—';
    const s = String(v).slice(0, 10).split('-');
    return s.length === 3 ? s[2] + '/' + s[1] + '/' + s[0] : '—';
  };
  B.dateTime = function (v) {
    if (!v) return '—';
    const d = new Date(v);
    if (isNaN(d)) return B.dateShort(v);
    return B.dateShort(B.toISODate(d)) + ' à ' + String(d.getHours()).padStart(2, '0') + 'h' + String(d.getMinutes()).padStart(2, '0');
  };
  B.monthKey = function (v) { return String(v || '').slice(0, 7); };
  B.monthLabel = function (key) {
    const p = String(key).split('-');
    return (MONTHS_SHORT[Number(p[1]) - 1] || '') + ' ' + String(p[0]).slice(2);
  };
  B.relative = function (v) {
    const d = new Date(v);
    if (isNaN(d)) return '';
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'à l’instant';
    if (diff < 3600) return 'il y a ' + Math.floor(diff / 60) + ' min';
    if (diff < 86400) return 'il y a ' + Math.floor(diff / 3600) + ' h';
    if (diff < 172800) return 'hier';
    if (diff < 604800) return 'il y a ' + Math.floor(diff / 86400) + ' jours';
    return 'le ' + B.dateShort(v);
  };
  B.periodRange = function (period, from, to) {
    const now = new Date();
    const end = B.toISODate(now);
    if (period === 'today') return { from: end, to: end, label: 'Aujourd’hui' };
    if (period === 'week') {
      const d = new Date(now); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day);
      return { from: B.toISODate(d), to: end, label: 'Cette semaine' };
    }
    if (period === 'month') return { from: end.slice(0, 7) + '-01', to: end, label: 'Ce mois' };
    if (period === 'year') return { from: end.slice(0, 4) + '-01-01', to: end, label: 'Cette année' };
    if (period === 'custom' && from && to) return { from: from, to: to, label: 'Du ' + B.dateShort(from) + ' au ' + B.dateShort(to) };
    return { from: null, to: null, label: 'Tout' };
  };
  B.inRange = function (date, from, to) {
    const d = String(date || '').slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  /* -------------------------------- Ident -------------------------------- */
  let counter = Math.floor(Math.random() * 900) + 100;
  B.uid = function () {
    /* Supabase utilise des UUID : produire des IDs compatibles dès le mode local
       évite les conversions lors de la synchronisation. */
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
    counter += 1;
    const hex = function (n) { return Math.floor(Math.random() * n).toString(16).padStart(4, '0'); };
    return hex(0x10000)+hex(0x10000)+'-'+hex(0x10000)+'-4'+hex(0x1000)+'-'+(8 + Math.floor(Math.random()*4)).toString(16)+hex(0x1000)+'-'+hex(0x10000)+hex(0x10000)+hex(0x10000);
  };
  B.escape = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  B.normalize = function (s) {
    return String(s == null ? '' : s).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  };
  B.slug = function (s) {
    return B.normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };
  B.initials = function (name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'BT';
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  };
  B.escapeRegex = function (s) { return String(s == null ? '' : s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  B.truncate = function (s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  };
  B.plural = function (n, one, many) { return n + ' ' + (n > 1 ? (many || one + 's') : one); };
  B.clamp = function (n, min, max) { return Math.min(max, Math.max(min, n)); };

  /* -------------------------------- DOM --------------------------------- */
  B.$ = function (sel, root) { return (root || document).querySelector(sel); };
  B.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  B.on = function (el, ev, sel, fn) {
    if (!el) return;
    el.addEventListener(ev, function (e) {
      const t = e.target.closest(sel);
      if (t && el.contains(t)) fn(e, t);
    });
  };
  B.el = function (html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = String(html).trim();
    return tpl.content.firstElementChild;
  };
  B.html = function (strings) {
    const args = Array.prototype.slice.call(arguments, 1);
    return strings.map(function (s, i) {
      return s + (i < args.length ? (args[i] == null ? '' : args[i]) : '');
    }).join('');
  };
  /* Compteur d'événements pour les animations légères (#147) */
  B.stagger = function (i) { return 'style="animation-delay:' + Math.min(i * 40, 320) + 'ms"'; };

  /* ------------------------------ Divers -------------------------------- */
  B.debounce = function (fn, ms) {
    let t;
    return function () {
      const a = arguments, c = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(c, a); }, ms || 200);
    };
  };
  B.download = function (filename, content, mime) {
    try {
      const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      return true;
    } catch (e) { return false; }
  };
  B.copy = function (text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* ignore */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
      return true;
    } catch (e) { return false; }
  };
  B.waLink = function (phone, text) {
    const p = String(phone || '').replace(/[^\d]/g, '');
    return 'https://wa.me/' + p + '?text=' + encodeURIComponent(text);
  };
})(globalThis.BATIYO = globalThis.BATIYO || {});
