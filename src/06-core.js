/* =========================================================================
   BATIYO — 06. NOYAU : BUS D'ÉVÉNEMENTS, SESSION, AUTHENTIFICATION
   Prépare l'authentification réelle (#87) et la session persistante.
   ========================================================================= */
(function (B) {
  'use strict';

  /* ------------------------------ Bus d'événements ------------------------ */
  const listeners = {};
  B.bus = {
    on: function (evt, fn) {
      (listeners[evt] = listeners[evt] || []).push(fn);
      return function () { B.bus.off(evt, fn); };
    },
    off: function (evt, fn) {
      listeners[evt] = (listeners[evt] || []).filter(function (f) { return f !== fn; });
    },
    emit: function (evt, payload) {
      (listeners[evt] || []).forEach(function (fn) {
        try { fn(payload); } catch (e) { /* un écouteur ne doit jamais casser l'app */ }
      });
    }
  };

  /* --------------------------------- Session ------------------------------ */
  const repo = function () { return B.DataRepository.local; };

  B.session = {
    user: function () {
      const s = repo().session.get();
      if (!s || !s.user_id) return null;
      return repo().find('users', s.user_id) || null;
    },
    isLoggedIn: function () { return !!B.session.user(); },
    loggedAt: function () { const s = repo().session.get(); return s && s.logged_in_at; },
    login: function (user, remember) {
      if (!user) return null;
      repo().session.set({ user_id: user.id, business_id: user.business_id, logged_in_at: new Date().toISOString(), remember: remember !== false });
      B.bus.emit('session:login', user);
      return user;
    },
    logout: function () { repo().session.clear(); B.bus.emit('session:logout'); },
    profile: function () {
      const u = B.session.user();
      if (!u) return null;
      return repo().query('profiles').find(function (p) { return p.user_id === u.id || p.id === u.id; }) || null;
    },
    business: function () {
      const u = B.session.user();
      if (!u) return null;
      return repo().find('businesses', u.business_id) || null;
    },
    businessId: function () { const b = B.session.business(); return b ? b.id : null; },
    professionId: function () {
      const u = B.session.user();
      const p = B.session.profile();
      return (p && p.profession_id) || (u && u.profession_id) || null;
    },
    profession: function () { return B.getProfession(B.session.professionId()) || B.PROFESSIONS[0]; },
    setProfession: function (id) {
      const p = B.session.profile();
      const u = B.session.user();
      if (!p && !u) return null;
      if (u) repo().update('users', u.id, { profession_id: id });
      if (p) repo().update('profiles', p.user_id || p.id, { profession_id: id });
      B.bus.emit('profession:changed', { profession_id: id });
      return id;
    },
    settings: function () {
      const bid = B.session.businessId();
      if (!bid) return B.defaultSettings();
      let s = repo().query('settings').find(function (x) { return x.business_id === bid; });
      if (!s) s = repo().insert('settings', Object.assign({ business_id: bid }, B.defaultSettings()));
      return s;
    },
    updateSettings: function (patch) {
      const s = B.session.settings();
      if (s.id) return repo().update('settings', s.id, patch);
      return null;
    },
    nextNumber: function (type, dateIso) {
      const d = repo().load();
      const year = String(dateIso || B.today()).slice(0, 4);
      const map = { quote: 'DEV', invoice: 'FAC', project: 'CH', expense: 'DEP' };
      const kind = map[type] || String(type).toUpperCase().slice(0, 3);
      const bid = B.session.businessId ? B.session.businessId() : null;
      d.meta.counters = d.meta.counters || {};
      d.meta.counters_by_business = d.meta.counters_by_business || {};
      if (bid) {
        if (!d.meta.counters_by_business[bid]) d.meta.counters_by_business[bid] = B.session.scanCounters(d, bid);
        const c = d.meta.counters_by_business[bid];
        c[kind] = (c[kind] || 0) + 1;
        repo().importDB(d);
        return kind + '-' + year + '-' + String(c[kind]).padStart(4, '0');
      }
      d.meta.counters[kind] = (d.meta.counters[kind] || 0) + 1;
      repo().importDB(d);
      return kind + '-' + year + '-' + String(d.meta.counters[kind]).padStart(4, '0');
    },
    scanCounters: function (db, businessId) {
      const d = db || repo().load();
      const tables = { DEV: 'quotes', FAC: 'invoices', CH: 'projects', DEP: 'expenses' };
      const out = { DEV: 0, FAC: 0, CH: 0, DEP: 0 };
      Object.keys(tables).forEach(function (kind) {
        (d[tables[kind]] || []).forEach(function (row) {
          if (businessId && row.business_id && row.business_id !== businessId) return;
          const m = String(row.number || '').match(/-(\d{4})$/);
          if (m) out[kind] = Math.max(out[kind], Number(m[1]));
        });
      });
      return out;
    },
    counters: function () {
      const d = repo().load();
      const bid = B.session.businessId ? B.session.businessId() : null;
      return (bid && d.meta.counters_by_business && d.meta.counters_by_business[bid]) || d.meta.counters || { DEV: 0, FAC: 0, CH: 0, DEP: 0 };
    }
  };

  /* ---------------------------- authService (#90) ------------------------- */
  B.authService = {
    register: async function (form) {
      const errors = {};
      if (!form.name || form.name.trim().length < 2) errors.name = 'Indiquez votre nom.';
      if (!form.email || form.email.indexOf('@') < 1) errors.email = 'Indiquez une adresse email valide.';
      if (!form.password || form.password.length < 6) errors.password = 'Le mot de passe doit contenir au moins 6 caractères.';
      if (!form.business_name || form.business_name.trim().length < 2) errors.business_name = 'Indiquez le nom de votre entreprise.';
      if (!form.profession_id) errors.profession_id = 'Choisissez votre métier.';
      if (Object.keys(errors).length) return { ok: false, errors: errors };
      if (!B.DataRepository.remote || !B.DataRepository.remote.ready) return { ok: false, error: 'Supabase n’est pas configuré. Ajoutez la clé publique du projet.' };
      try {
        const res = await B.DataRepository.remote.signUp({
          email: form.email.trim(),
          password: form.password,
          options: { data: {
            name: form.name.trim(),
            business_name: form.business_name.trim(),
            profession_id: form.profession_id,
            phone: form.phone || '',
            address: form.address || ''
          } }
        });
        if (res.error) return { ok: false, error: res.error.message };
        if (!res.data.session || !res.data.user) {
          return { ok: true, pendingVerification: true, user: res.data.user || null };
        }
        await B.DataRepository.hydrate();
        const user = B.session.user();
        return { ok: true, user: user, session: res.data.session };
      } catch (e) {
        return { ok: false, error: e.message || 'Impossible de créer le compte.' };
      }
    },
    login: async function (email, password) {
      if (!B.DataRepository.remote || !B.DataRepository.remote.ready) return { ok: false, error: 'Supabase n’est pas configuré. Ajoutez la clé publique du projet.' };
      try {
        const res = await B.DataRepository.remote.signIn(String(email || '').trim(), password);
        if (res.error) return { ok: false, error: res.error.message };
        await B.DataRepository.hydrate();
        const user = B.session.user();
        if (!user) return { ok: false, error: 'Connexion réussie mais profil introuvable.' };
        return { ok: true, user: user };
      } catch (e) {
        return { ok: false, error: e.message || 'Connexion impossible.' };
      }
    },
    logout: async function () {
      try { if (B.DataRepository.remote && B.DataRepository.remote.ready) await B.DataRepository.remote.signOut(); } catch (e) { /* local session is still cleared */ }
      B.session.logout();
    },
    resetPassword: async function (email) {
      if (!email || email.indexOf('@') < 1) return { ok: false, error: 'Indiquez une adresse email valide.' };
      if (!B.DataRepository.remote || !B.DataRepository.remote.ready) return { ok: false, error: 'Supabase n’est pas configuré.' };
      try {
        const res = await B.DataRepository.remote.resetPassword(email.trim());
        if (res.error) return { ok: false, error: res.error.message };
        return { ok: true, message: 'Un lien de réinitialisation a été envoyé à votre adresse email.' };
      } catch (e) {
        return { ok: false, error: e.message || 'Impossible d’envoyer le lien.' };
      }
    },
    completeOnboarding: async function (patch) {
      const u = B.session.user();
      if (!u) return null;
      const business = B.session.business();
      if (business) repo().update('businesses', business.id, {
        name: patch.business_name || business.name,
        address: patch.address !== undefined ? patch.address : business.address,
        phone: patch.phone !== undefined ? patch.phone : business.phone,
        email: patch.email !== undefined ? patch.email : business.email,
        manager_name: patch.name || business.manager_name
      });
      const p = B.session.profile();
      if (p) repo().update('profiles', p.id || p.user_id, {
        full_name: patch.name || p.full_name,
        phone: patch.phone || p.phone,
        address: patch.address !== undefined ? patch.address : p.address,
        profession_id: patch.profession_id || p.profession_id,
        onboarding_done: true
      });
      if (patch.logo && business && B.profileService && typeof B.profileService.setLogo === 'function') {
        try { await B.profileService.setLogo(patch.logo); } catch (e) { /* logo remains local until retry */ }
      }
      const localBusiness = B.session.business();
      if (localBusiness) repo().update('businesses', localBusiness.id, { logo: patch.logo || localBusiness.logo || null });
      B.bus.emit('onboarding:done');
      B.DataRepository.scheduleSync();
      return true;
    }
  };

  /* ------------------------- profileService (#90) ------------------------- */
  B.profileService = {
    get: function () { return B.session.profile(); },
    business: function () { return B.session.business(); },
    updatePersonal: function (patch) {
      const u = B.session.user();
      if (u) repo().update('users', u.id, { name: patch.name || u.name, avatar: patch.avatar !== undefined ? patch.avatar : u.avatar });
      const p = B.session.profile();
      if (p) repo().update('profiles', p.id || p.user_id, { full_name: patch.name || p.full_name, phone: patch.phone || p.phone, email: patch.email || p.email, address: patch.address !== undefined ? patch.address : p.address });
      B.bus.emit('profile:updated');
      return true;
    },
    updateBusiness: function (patch) {
      const b = B.session.business();
      repo().update('businesses', b.id, patch);
      B.bus.emit('profile:updated');
      return true;
    },
    setLogo: async function (dataUrl) {
      const b = B.session.business();
      if (!b) return false;
      if (B.DataRepository.uploadDataUrl && B.DataRepository.remote && B.DataRepository.remote.ready) {
        try {
          const uploaded = await B.DataRepository.uploadDataUrl('logos', b.id + '/logo', dataUrl, 'image');
          repo().update('businesses', b.id, { logo: uploaded.publicUrl || dataUrl, logo_url: uploaded.publicUrl || dataUrl });
        } catch (e) {
          repo().update('businesses', b.id, { logo: dataUrl });
        }
      } else {
        repo().update('businesses', b.id, { logo: dataUrl });
      }
      B.bus.emit('profile:updated');
      return true;
    },
    setProfession: function (id) { return B.session.setProfession(id); }
  };
})(globalThis.BATIYO = globalThis.BATIYO || {});
