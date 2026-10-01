/* BATIYO — Référentiel local hors connexion.
   Aucun compte, client, devis ou chantier de démonstration n'est créé. */
(function (B) {
  'use strict';
  B.referenceData = function () {
    const db = B.DataRepository.local.load();
    if (db.meta.reference_loaded) return;

    db.professions = (B.PROFESSIONS || []).map(function (p) {
      return {
        code: p.id, name: p.name, icon: p.icon || null, tags: [],
        catalog: (p.items || []).map(function (it) { return Object.assign({}, it); }),
        templates: (p.templates || []).map(function (t) { return Object.assign({}, t); }),
        budget_profile: Object.assign({}, p.budget_profile || {}), active: p.active !== false,
        position: 0
      };
    });
    db.catalog_categories = (B.CATALOG_CATEGORIES || []).map(function (c, i) { return { code: c.id, label: c.label, position: i }; });
    db.expense_categories = (B.EXPENSE_CATEGORIES || []).map(function (c, i) { return { code: c.id, label: c.label, position: i }; });
    db.units = (B.UNITS || []).map(function (u, i) { return { code: u.id, label: u.label, position: i }; });
    db.catalog_items = [];
    (B.PROFESSIONS || []).forEach(function (p) {
      (p.items || []).forEach(function (it) {
        const stableLocalId = 'ci_' + B.slug(p.id) + '-' + p.items.indexOf(it) + '-' + B.slug(it.name);
        const copy = Object.assign({}, it, { id: B.uid('cat'), profession_id: p.id, business_id: null, local_id: stableLocalId });
        db.catalog_items.push(copy);
      });
    });
    db.meta.reference_loaded = true;
    db.meta.demo = false;
    B.DataRepository.local.importDB(db);
  };
})(globalThis.BATIYO = globalThis.BATIYO || {});
