/* =========================================================================
   BATIYO — 07. DATA REPOSITORY
   Source de vérité UI = cache local; Supabase = persistance distante.
   Offline-first : lecture locale, synchronisation lorsque la connexion existe.
   ========================================================================= */
(function (B) {
  'use strict';

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function local() { return B.DataRepository.local; }

  /* -----------------------------------------------------------------------
     Base locale — aucune donnée de démonstration.
     ----------------------------------------------------------------------- */
  B.emptyDB = function () {
    return {
      meta: {
        version: B.VERSION,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        reference_loaded: false,
        demo: false,
        remote: false,
        counters: { DEV: 0, FAC: 0, CH: 0, DEP: 0 }
      },
      users: [],
      profiles: [],
      businesses: [],
      professions: [],
      catalog_categories: [],
      units: [],
      catalog_items: [],
      clients: [],
      projects: [],
      quotes: [],
      invoices: [],
      expenses: [],
      expense_categories: [],
      documents: [],
      photos: [],
      notifications: [],
      assistant_messages: [],
      settings: [],
      suppliers: [],
      purchases: [],
      purchase_items: [],
      sync_queue: []
    };
  };

  /* -----------------------------------------------------------------------
     LocalRepository — même contrat que l'ancien code, sans seed métier.
     ----------------------------------------------------------------------- */
  function LocalRepository() {
    const adapter = B.storage.create();
    let db = null;

    function load() {
      if (db) return db;
      const raw = adapter.read();
      const base = B.emptyDB();
      db = raw && raw.meta ? Object.assign(base, raw) : base;
      db.meta = Object.assign(base.meta, db.meta || {});
      Object.keys(base).forEach(function (k) { if (db[k] == null) db[k] = base[k]; });
      return db;
    }

    function persist(row, table, action) {
      const d = load();
      d.meta.updated_at = new Date().toISOString();
      if (table && row) {
        d.sync_queue = d.sync_queue || [];
        const item = {
          id: B.uid('sq'),
          table: table,
          row_id: row.id || null,
          action: action || 'upsert',
          payload: clone(row),
          at: new Date().toISOString(),
          status: 'pending'
        };
        d.sync_queue.push(item);
        if (d.sync_queue.length > 1000) d.sync_queue = d.sync_queue.slice(-1000);
      }
      adapter.write(d);
      if (B.DataRepository && typeof B.DataRepository.scheduleSync === 'function') {
        B.DataRepository.scheduleSync();
      }
      return d;
    }

    function stamp(row, isNew) {
      const now = new Date().toISOString();
      const uid = B.session && B.session.user ? B.session.user() : null;
      if (isNew) {
        row.id = row.id || B.uid('row');
        row.created_at = row.created_at || now;
        row.created_by = row.created_by || (uid ? uid.id : null);
        row.sync_status = 'local';
        row.local_id = row.local_id || row.id;
        row.deleted_at = null;
      }
      row.updated_at = now;
      row.updated_by = uid ? uid.id : null;
      return row;
    }

    const api = {
      id: 'local',
      load: load,
      reset: function () { db = null; adapter.clear(); return api; },
      raw: function () { return load(); },
      importDB: function (obj) { db = obj; adapter.write(db); return db; },
      table: function (name) { return load()[name] || []; },
      insert: function (name, row) {
        const d = load();
        if (!d[name]) d[name] = [];
        stamp(row, true);
        d[name].push(row);
        persist(row, name, 'insert');
        B.bus.emit('data:changed', { table: name, action: 'insert', row: row });
        return row;
      },
      insertMany: function (name, rows) {
        const d = load();
        if (!d[name]) d[name] = [];
        rows.forEach(function (r) { stamp(r, true); d[name].push(r); });
        persist(rows[rows.length - 1] || null, name, 'insertMany');
        B.bus.emit('data:changed', { table: name, action: 'insertMany', count: rows.length });
        return rows;
      },
      update: function (name, id, patch, opts) {
        const d = load();
        const row = d[name].find(function (r) { return r.id === id; });
        if (!row) return null;
        Object.assign(row, patch);
        stamp(row, false);
        if (opts && opts.versioned) row.version = (row.version || 1) + 1;
        persist(row, name, 'update');
        B.bus.emit('data:changed', { table: name, action: 'update', row: row });
        return row;
      },
      remove: function (name, id, hard) {
        const d = load();
        const row = d[name].find(function (r) { return r.id === id; });
        if (!row) return false;
        if (hard) {
          row.deleted_at = new Date().toISOString();
          row.sync_status = 'deleted';
          stamp(row, false);
        } else {
          row.deleted_at = new Date().toISOString();
          row.sync_status = 'deleted';
          stamp(row, false);
        }
        persist(row, name, 'delete');
        B.bus.emit('data:changed', { table: name, action: 'remove', id: id });
        return true;
      },
      find: function (name, id) {
        return (load()[name] || []).find(function (r) { return r.id === id && !r.deleted_at; }) || null;
      },
      query: function (name, fn) {
        return (load()[name] || []).filter(function (r) { return !r.deleted_at; }).filter(fn || function () { return true; });
      },
      where: function (name, match) {
        return api.query(name, function (r) {
          return Object.keys(match).every(function (k) { return r[k] === match[k]; });
        });
      },
      count: function (name, fn) { return api.query(name, fn).length; },
      session: B.storage.SessionAdapter(),
      syncQueue: function () { return load().sync_queue || []; },
      pendingCount: function () { return api.syncQueue().filter(function (x) { return x.status === 'pending'; }).length; },
      markSynced: function () {
        const d = load();
        d.sync_queue = (d.sync_queue || []).map(function (x) {
          return x.status === 'pending' ? Object.assign({}, x, { status: 'synced', synced_at: new Date().toISOString() }) : x;
        });
        adapter.write(d);
      },
      storageInfo: function () {
        let bytes = 0;
        try { bytes = new Blob([JSON.stringify(load())]).size; } catch (e) { bytes = 0; }
        return { adapter: adapter.id, bytes: bytes, kb: Math.round(bytes / 1024) };
      }
    };
    return api;
  }

  /* -----------------------------------------------------------------------
     SupabaseRepository — Auth + lecture/écriture distante.
     Les écrans continuent d'utiliser LocalRepository; la synchro est traitée
     ici pour préserver le fonctionnement offline-first.
     ----------------------------------------------------------------------- */
  function SupabaseRepository(config) {
    const cfg = config || {};
    let client = null;
    let ready = false;

    const remoteTables = [
      'businesses','profiles','settings','catalog_items','clients','projects',
      'quotes','quote_items','invoices','invoice_items','payments','expenses',
      'documents','photos','notifications','assistant_messages','suppliers',
      'purchases','purchase_items'
    ];

    function ensure() {
      if (!ready || !client) throw new Error('Supabase non configuré.');
      return client;
    }

    async function fetchRows(table, filter) {
      let q = ensure().from(table).select('*');
      if (filter) q = filter(q);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }

    function mapProfile(row) {
      return Object.assign({}, row, { user_id: row.id, email: row.email || '' });
    }

    function mapBusiness(row) {
      return Object.assign({}, row, { logo: row.logo_url || row.logo || null });
    }

    function quoteToLocal(q, items) {
      return Object.assign({}, q, {
        lines: (items || []).filter(function (x) { return x.quote_id === q.id && !x.deleted_at; }).sort(function (a,b){ return (a.position||0)-(b.position||0); }).map(function (x) {
          return {
            id: x.id,
            catalog_item_id: x.catalog_item_id,
            description: x.description,
            quantity: Number(x.quantity) || 0,
            unit: x.unit,
            unit_price: Number(x.unit_price) || 0,
            total: Number(x.line_total) || 0
          };
        })
      });
    }

    function invoiceToLocal(i, items, payments) {
      return Object.assign({}, i, {
        lines: (items || []).filter(function (x) { return x.invoice_id === i.id && !x.deleted_at; }).sort(function (a,b){ return (a.position||0)-(b.position||0); }).map(function (x) {
          return {
            id: x.id,
            catalog_item_id: x.catalog_item_id,
            description: x.description,
            quantity: Number(x.quantity) || 0,
            unit: x.unit,
            unit_price: Number(x.unit_price) || 0,
            total: Number(x.line_total) || 0
          };
        }),
        payments: (payments || []).filter(function (x) { return x.invoice_id === i.id && !x.deleted_at; }).map(function (p) {
          return {
            id: p.id,
            date: p.date,
            amount: Number(p.amount) || 0,
            method: p.method || '',
            reference: p.reference || '',
            note: p.notes || ''
          };
        })
      });
    }

    function businessPayload(b) {
      return {
        id: b.id,
        name: b.name,
        phone: b.phone || null,
        email: b.email || null,
        address: b.address || null,
        manager_name: b.manager_name || null,
        country: b.country || 'TG',
        currency: b.currency || 'FCFA',
        logo_url: b.logo_url || b.logo || null,
        notes: b.notes || null,
        created_at: b.created_at,
        updated_at: b.updated_at,
        created_by: b.created_by,
        updated_by: b.updated_by,
        deleted_at: b.deleted_at || null,
        sync_status: 'synced',
        local_id: b.local_id || b.id,
        remote_id: b.id
      };
    }

    function profilePayload(p) {
      return {
        id: p.user_id || p.id,
        business_id: p.business_id,
        profession_id: p.profession_id || null,
        full_name: p.full_name || p.name || null,
        phone: p.phone || null,
        email: p.email || null,
        address: p.address || null,
        avatar_url: p.avatar_url || p.avatar || null,
        role: p.role || 'proprietaire',
        language: p.language || 'fr',
        preferences: p.preferences || { notifications: true, currency: 'FCFA' },
        onboarding_done: p.onboarding_done !== false,
        created_at: p.created_at,
        updated_at: p.updated_at,
        created_by: p.created_by,
        updated_by: p.updated_by,
        deleted_at: p.deleted_at || null,
        sync_status: 'synced',
        local_id: p.local_id || p.user_id || p.id,
        remote_id: p.remote_id || p.user_id || p.id
      };
    }

    function cleanGeneric(row, omit) {
      const out = Object.assign({}, row);
      (omit || []).forEach(function(k){ delete out[k]; });
      return out;
    }

    async function upsert(table, rows) {
      if (!rows || !rows.length) return;
      const { error } = await ensure().from(table).upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }

    async function updateExisting(table, row) {
      if (!row || !row.id) return;
      const { data, error } = await ensure().from(table).update(row).eq('id', row.id).select('id').limit(1);
      if (error) throw error;
      if (!data || !data.length) throw new Error('Impossible de mettre à jour ' + table + ' : enregistrement introuvable ou non autorisé.');
    }

    async function uploadDataUrlRemote(bucket, path, dataUrl) {
      const parts = String(dataUrl || '').match(/^data:([^;]+);base64,(.*)$/);
      if (!parts) return { path: path, publicUrl: dataUrl };
      const mime = parts[1];
      const binary = atob(parts[2]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const ext = mime.indexOf('png') >= 0 ? 'png' : (mime.indexOf('webp') >= 0 ? 'webp' : 'jpg');
      const objectPath = path.replace(/\.[a-z0-9]+$/i, '') + '.' + ext;
      const { error } = await ensure().storage.from(bucket).upload(objectPath, bytes, { contentType: mime, upsert: true });
      if (error) throw error;
      if (bucket === 'logos') {
        const url = ensure().storage.from(bucket).getPublicUrl(objectPath);
        return { path: objectPath, publicUrl: url && url.data ? url.data.publicUrl : objectPath };
      }
      return { path: objectPath, publicUrl: null };
    }

    async function signedStorageUrl(bucket, path) {
      if (!path || /^https?:\/\//.test(path) || /^data:/.test(path)) return path;
      const res = await ensure().storage.from(bucket).createSignedUrl(path, 3600);
      if (res.error) return null;
      return res.data && res.data.signedUrl ? res.data.signedUrl : null;
    }

    async function syncBusiness(db, businessId) {
      if (!ready || !businessId) return { ok: false, skipped: true };

      const business = (db.businesses || []).find(function (b) { return b.id === businessId; });
      if (business) await updateExisting('businesses', businessPayload(business));

      const prof = (db.profiles || []).find(function (p) { return (p.business_id === businessId) && !p.deleted_at; });
      if (prof) await updateExisting('profiles', profilePayload(prof));

      const settings = (db.settings || []).filter(function(s){ return s.business_id === businessId; });
      if (settings.length) await upsert('settings', settings.map(function(s){ return cleanGeneric(s, ['logo']); }));

      const expenseRows = [];
      for (const x of (db.expenses || []).filter(function(x){ return x.business_id === businessId; })) {
        const out = cleanGeneric(x, ['receipt', 'receipt_path']);
        let receiptPath = x.receipt_path || x.receipt_url || null;
        if (typeof x.receipt === 'string' && /^data:/.test(x.receipt)) {
          const uploaded = await uploadDataUrlRemote('receipts', businessId + '/expenses/' + x.id, x.receipt);
          receiptPath = uploaded.path;
          x.receipt_path = receiptPath;
        }
        out.receipt_url = receiptPath;
        expenseRows.push(out);
      }
      const photoRows = [];
      for (const x of (db.photos || []).filter(function(x){ return x.business_id === businessId; })) {
        const out = cleanGeneric(x, ['date', 'notes', 'storage_path']);
        let storagePath = x.storage_path || null;
        if (!storagePath && typeof x.file_url === 'string' && /^data:/.test(x.file_url)) {
          const uploaded = await uploadDataUrlRemote('photos', businessId + '/photos/' + x.id, x.file_url);
          storagePath = uploaded.path;
          x.storage_path = storagePath;
        }
        out.file_url = storagePath || x.file_url || null;
        out.taken_at = x.taken_at || (x.date ? x.date : null);
        photoRows.push(out);
      }
      const generic = [
        ['catalog_items', (db.catalog_items || []).filter(function(x){ return x.business_id === businessId; })],
        ['clients', (db.clients || []).filter(function(x){ return x.business_id === businessId; })],
        ['projects', (db.projects || []).filter(function(x){ return x.business_id === businessId; })],
        ['expenses', expenseRows],
        ['documents', (db.documents || []).filter(function(x){ return x.business_id === businessId; })],
        ['photos', photoRows],
        ['notifications', (db.notifications || []).filter(function(x){ return x.business_id === businessId; }).map(function(x){
          const out = cleanGeneric(x, ['key', 'project_id', 'date']);
          out.payload = Object.assign({}, x.payload || {}, x.key ? { key: x.key } : {}, x.project_id ? { project_id: x.project_id } : {});
          return out;
        })],
        ['assistant_messages', (db.assistant_messages || []).filter(function(x){ return x.business_id === businessId; })],
        ['suppliers', (db.suppliers || []).filter(function(x){ return x.business_id === businessId; })],
        ['purchases', (db.purchases || []).filter(function(x){ return x.business_id === businessId; })],
        ['purchase_items', (db.purchase_items || []).filter(function(x){ return x.business_id === businessId; })]
      ];
      for (const pair of generic) {
        if (pair[1].length) await upsert(pair[0], pair[1]);
      }

      const quotes = (db.quotes || []).filter(function(q){ return q.business_id === businessId; });
      if (quotes.length) {
        await upsert('quotes', quotes.map(function(q){ return cleanGeneric(q, ['lines']); }));
        const quoteItems = [];
        quotes.forEach(function(q){
          (q.lines || []).forEach(function(l, i){
            quoteItems.push({
              id: l.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(l.id) ? l.id : B.uid('qi'),
              quote_id: q.id,
              business_id: businessId,
              position: i,
              catalog_item_id: l.catalog_item_id || null,
              description: l.description || '',
              quantity: Number(l.quantity) || 0,
              unit: l.unit || 'unité',
              unit_price: Number(l.unit_price) || 0,
              line_total: Number(l.total != null ? l.total : l.line_total) || 0
            });
          });
        });
        for (const q of quotes) {
          const del = await ensure().from('quote_items').delete().eq('quote_id', q.id).eq('business_id', businessId);
          if (del.error) throw del.error;
          const items = quoteItems.filter(function (x) { return x.quote_id === q.id; });
          if (items.length) await upsert('quote_items', items);
        }
      }

      const invoices = (db.invoices || []).filter(function(i){ return i.business_id === businessId; });
      if (invoices.length) {
        await upsert('invoices', invoices.map(function(i){ return cleanGeneric(i, ['lines', 'payments', 'paid']); }));
        const invoiceItems = [];
        const payments = [];
        invoices.forEach(function(i){
          (i.lines || []).forEach(function(l, idx){
            invoiceItems.push({
              id: l.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(l.id) ? l.id : B.uid('ii'),
              invoice_id: i.id,
              business_id: businessId,
              position: idx,
              catalog_item_id: l.catalog_item_id || null,
              description: l.description || '',
              quantity: Number(l.quantity) || 0,
              unit: l.unit || 'unité',
              unit_price: Number(l.unit_price) || 0,
              line_total: Number(l.total != null ? l.total : l.line_total) || 0
            });
          });
          (i.payments || []).forEach(function(p){
            payments.push({
              id: p.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id) ? p.id : B.uid('pay'),
              business_id: businessId,
              invoice_id: i.id,
              amount: Number(p.amount) || 0,
              date: p.date || B.today(),
              method: p.method || null,
              reference: p.reference || null,
              notes: p.note || p.notes || null
            });
          });
        });
        for (const inv of invoices) {
          const delItems = await ensure().from('invoice_items').delete().eq('invoice_id', inv.id).eq('business_id', businessId);
          if (delItems.error) throw delItems.error;
          const items = invoiceItems.filter(function (x) { return x.invoice_id === inv.id; });
          if (items.length) await upsert('invoice_items', items);
          const delPayments = await ensure().from('payments').delete().eq('invoice_id', inv.id).eq('business_id', businessId);
          if (delPayments.error) throw delPayments.error;
          const invPayments = payments.filter(function (x) { return x.invoice_id === inv.id; });
          if (invPayments.length) await upsert('payments', invPayments);
        }
      }

      local().markSynced();
      const db2 = local().load();
      db2.meta.remote = true;
      db2.meta.sync_error = null;
      local().importDB(db2);
      return { ok: true };
    }

    async function hydrate(businessId) {
      if (!ready || !businessId) return { ok: false, skipped: true };
      const db = local().load();
      const user = (await ensure().auth.getUser()).data.user;
      if (!user) return { ok: false, error: 'Utilisateur non authentifié.' };

      const results = await Promise.all([
        fetchRows('businesses', q => q.eq('id', businessId).limit(1)),
        fetchRows('profiles', q => q.eq('id', user.id).limit(1)),
        fetchRows('settings', q => q.eq('business_id', businessId)),
        fetchRows('professions', q => q.order('position', { ascending: true })),
        fetchRows('catalog_categories', q => q.order('position', { ascending: true })),
        fetchRows('expense_categories', q => q.order('position', { ascending: true })),
        fetchRows('units', q => q.order('position', { ascending: true })),
        fetchRows('catalog_items', q => q.or('business_id.is.null,business_id.eq.' + businessId)),
        fetchRows('clients', q => q.eq('business_id', businessId)),
        fetchRows('projects', q => q.eq('business_id', businessId)),
        fetchRows('quotes', q => q.eq('business_id', businessId)),
        fetchRows('quote_items', q => q.eq('business_id', businessId)),
        fetchRows('invoices', q => q.eq('business_id', businessId)),
        fetchRows('invoice_items', q => q.eq('business_id', businessId)),
        fetchRows('payments', q => q.eq('business_id', businessId)),
        fetchRows('expenses', q => q.eq('business_id', businessId)),
        fetchRows('documents', q => q.eq('business_id', businessId)),
        fetchRows('photos', q => q.eq('business_id', businessId)),
        fetchRows('notifications', q => q.eq('business_id', businessId)),
        fetchRows('assistant_messages', q => q.eq('business_id', businessId)),
        fetchRows('suppliers', q => q.eq('business_id', businessId)),
        fetchRows('purchases', q => q.eq('business_id', businessId)),
        fetchRows('purchase_items', q => q.eq('business_id', businessId))
      ]);

      const businesses = results[0].map(mapBusiness);
      const profiles = results[1].map(mapProfile);
      const quotes = results[10].map(function(q){ return quoteToLocal(q, results[11]); });
      const invoices = results[12].map(function(i){ return invoiceToLocal(i, results[13], results[14]); });
      const users = [{
        id: user.id,
        identifier: user.email || '',
        email: user.email || '',
        name: profiles[0] && profiles[0].full_name ? profiles[0].full_name : (user.user_metadata && user.user_metadata.name) || '',
        profession_id: profiles[0] ? profiles[0].profession_id : null,
        business_id: businessId,
        role: profiles[0] ? profiles[0].role : 'proprietaire',
        onboarding_done: profiles[0] ? profiles[0].onboarding_done !== false : false,
        avatar: profiles[0] ? profiles[0].avatar_url : null
      }];

      db.users = users;
      db.businesses = businesses;
      db.profiles = profiles;
      db.settings = results[2];
      db.professions = results[3];
      db.catalog_categories = results[4];
      db.expense_categories = results[5];
      db.units = results[6];
      db.catalog_items = results[7];
      db.clients = results[8];
      db.projects = results[9];
      db.quotes = quotes;
      db.invoices = invoices;
      db.expenses = await Promise.all(results[15].map(async function(x){
        const path = x.receipt_url || null;
        const signed = path && !/^https?:\/\//.test(path) && !/^data:/.test(path) ? await signedStorageUrl('receipts', path) : path;
        return Object.assign({}, x, { receipt: signed || path || null, receipt_path: path });
      }));
      db.documents = results[16];
      db.photos = await Promise.all(results[17].map(async function(x){
        const path = x.file_url || null;
        const signed = path && !/^https?:\/\//.test(path) && !/^data:/.test(path) ? await signedStorageUrl('photos', path) : path;
        return Object.assign({}, x, { file_url: signed || path, storage_path: path, date: x.date || (x.taken_at ? String(x.taken_at).slice(0,10) : null) });
      }));
      db.notifications = results[18].map(function(x){ return Object.assign({}, x, { key: x.payload && x.payload.key ? x.payload.key : x.key, project_id: x.payload && x.payload.project_id ? x.payload.project_id : x.project_id }); });
      db.assistant_messages = results[19];
      db.suppliers = results[20];
      db.purchases = results[21];
      db.purchase_items = results[22];
      db.meta.reference_loaded = true;
      db.meta.demo = false;
      db.meta.remote = true;
      db.meta.updated_at = new Date().toISOString();
      local().importDB(db);
      return { ok: true, user: users[0], business: businesses[0] || null };
    }

    return {
      id: 'supabase',
      get client() { return client; },
      get ready() { return ready; },
      init: function () {
        const sdk = window.supabase;
        if (!sdk || typeof sdk.createClient !== 'function' || !cfg.url || !cfg.publishableKey) {
          ready = false;
          return false;
        }
        client = sdk.createClient(cfg.url, cfg.publishableKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
        });
        ready = true;
        return true;
      },
      getSession: async function () { return ensure().auth.getSession(); },
      getUser: async function () { return ensure().auth.getUser(); },
      signUp: async function (payload) {
        return ensure().auth.signUp(payload);
      },
      signIn: async function (email, password) {
        return ensure().auth.signInWithPassword({ email: email, password: password });
      },
      signOut: async function () { return ensure().auth.signOut(); },
      resetPassword: async function (email, redirectTo) {
        return ensure().auth.resetPasswordForEmail(email, { redirectTo: redirectTo || location.origin + location.pathname + '#/login' });
      },
      resolveBusinessId: async function (userId) {
        const rows = await fetchRows('profiles', function (q) { return q.eq('id', userId).limit(1); });
        return rows[0] ? rows[0].business_id : null;
      },
      uploadDataUrl: uploadDataUrlRemote,
      onAuthStateChange: function (fn) { return ensure().auth.onAuthStateChange(fn); },
      hydrate: hydrate,
      syncBusiness: syncBusiness
    };
  }

  B.DataRepository = {
    local: null,
    remote: null,
    _syncTimer: null,
    init: function () {
      this.local = LocalRepository();
      this.remote = SupabaseRepository(B.SUPABASE_CONFIG);
      this.remote.init();
      return this;
    },
    scheduleSync: function () {
      if (!this.remote || !this.remote.ready || !this.local) return;
      clearTimeout(this._syncTimer);
      this._syncTimer = setTimeout(function () {
        B.DataRepository.syncNow().catch(function (err) {
          const d = B.DataRepository.local.load();
          d.meta.sync_error = err && err.message ? err.message : String(err);
          B.DataRepository.local.importDB(d);
          B.bus.emit('sync:error', err);
        });
      }, 500);
    },
    syncNow: async function () {
      if (!this.remote || !this.remote.ready) return { ok: false, skipped: true };
      const bid = B.session.businessId();
      if (!bid || B.network && B.network.state() === 'offline') return { ok: false, skipped: true };
      const result = await this.remote.syncBusiness(this.local.load(), bid);
      B.bus.emit('sync:done', result);
      return result;
    },
    uploadDataUrl: async function (bucket, path, dataUrl, kind) {
      if (!this.remote || !this.remote.ready) return { publicUrl: dataUrl, path: path };
      return this.remote.uploadDataUrl(bucket, path, dataUrl);
    },
    hydrate: async function () {
      if (!this.remote || !this.remote.ready) return { ok: false, skipped: true };
      const session = await this.remote.getSession();
      const user = session && session.data ? session.data.session && session.data.session.user : null;
      if (!user) return { ok: false, skipped: true };
      const meta = user.user_metadata || {};
      let businessId = meta.business_id || (B.session.profile() && B.session.profile().business_id) || null;
      if (!businessId) businessId = await this.remote.resolveBusinessId(user.id);
      if (!businessId) return { ok: false, error: 'Entreprise introuvable pour cet utilisateur.' };
      const result = await this.remote.hydrate(businessId);
      if (result && result.user) {
        B.session.login(result.user, true);
      }
      return result;
    },
    markLocalSynced: function () { this.local.markSynced(); }
  };

  B.SUPABASE_CONFIG = {
    url: 'https://oawalbnivqcuzbvhuvnc.supabase.co',
    publishableKey: 'sb_publishable_ZqIxoXQC-nlzhFA3sXAmdA_qYX2Bbtp',
    tables: [
      'professions','catalog_categories','expense_categories','units','businesses','profiles','settings',
      'catalog_items','clients','projects','quotes','quote_items','invoices','invoice_items','payments',
      'expenses','documents','photos','notifications','assistant_messages','suppliers','purchases',
      'purchase_items'
    ]
  };
})(globalThis.BATIYO = globalThis.BATIYO || {});
