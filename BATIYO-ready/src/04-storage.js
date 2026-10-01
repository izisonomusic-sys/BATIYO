/* =========================================================================
   BATIYO — 04. COUCHE DE STOCKAGE ABSTRAITE (#158)
   BATIYO est Supabase-first en ligne. Le stockage local sert uniquement de
   cache offline et de file d'attente de synchronisation dans le navigateur ;
   la persistance métier distante est assurée par Supabase.
   Adapters disponibles : LocalStorageAdapter (cache offline), MemoryAdapter.
   ========================================================================= */
(function (B) {
  'use strict';

  function MemoryAdapter() {
    let store = {};
    return {
      id: 'memory',
      available: true,
      read: function () { return store; },
      write: function (db) { store = db; return true; },
      clear: function () { store = {}; return true; }
    };
  }

  function LocalStorageAdapter() {
    let available = false;
    try {
      const k = '__batiyo_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      available = true;
    } catch (e) { available = false; }
    const KEY = B.STORAGE_KEY;
    let cache = null;
    return {
      id: 'localStorage',
      available: available,
      read: function () {
        if (!available) return cache || {};
        try {
          const raw = window.localStorage.getItem(KEY);
          return raw ? JSON.parse(raw) : {};
        } catch (e) {
          return cache || {};
        }
      },
      write: function (db) {
        cache = db;
        if (!available) return false;
        try {
          window.localStorage.setItem(KEY, JSON.stringify(db));
          return true;
        } catch (e) {
          /* Quota dépassé : on tente de retirer les photos les plus lourdes */
          try {
            const copy = JSON.parse(JSON.stringify(db));
            (copy.documents || []).forEach(function (d) { if (d.data_url && String(d.data_url).length > 200000) d.data_url = null; });
            window.localStorage.setItem(KEY, JSON.stringify(copy));
            return true;
          } catch (e2) { return false; }
        }
      },
      clear: function () {
        cache = null;
        try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
        return true;
      }
    };
  }

  function SessionAdapter() {
    return {
      get: function () {
        try { return JSON.parse(window.localStorage.getItem(B.SESSION_KEY) || 'null'); } catch (e) { return null; }
      },
      set: function (v) {
        try { window.localStorage.setItem(B.SESSION_KEY, JSON.stringify(v)); } catch (e) { /* ignore */ }
      },
      clear: function () {
        try { window.localStorage.removeItem(B.SESSION_KEY); } catch (e) { /* ignore */ }
      }
    };
  }

  B.storage = {
    MemoryAdapter: MemoryAdapter,
    LocalStorageAdapter: LocalStorageAdapter,
    SessionAdapter: SessionAdapter,
    create: function () {
      const adapter = LocalStorageAdapter();
      return adapter.available ? adapter : MemoryAdapter();
    }
  };
})(globalThis.BATIYO = globalThis.BATIYO || {});
