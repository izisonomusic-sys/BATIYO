/* BATIYO — génération du référentiel Supabase à partir de la configuration
   de l'application. Objectif : les métiers, unités, catégories et catalogues
   modèles ne peuvent pas diverger entre le front (src/01, src/02) et la base.
   Usage : node tools/gen-supabase-reference.js [chemin de sortie] */
const fs = require('fs');
const path = require('path');
const { B } = require('../tests/load.js');

const OUT = path.resolve(__dirname, '..', process.argv[2] || 'supabase/04-reference.sql');
const q = (v) => (v === null || v === undefined ? 'null' : "'" + String(v).replace(/'/g, "''") + "'");
const j = (v) => "'" + JSON.stringify(v).replace(/'/g, "''") + "'::jsonb";
const n = (v) => (v === null || v === undefined ? 'null' : String(Number(v)));

const lines = [];
lines.push('-- =============================================================================');
lines.push('-- BATIYO — RÉFÉRENTIEL DE BASE (métiers, unités, catégories, catalogues modèles)');
lines.push('-- -----------------------------------------------------------------------------');
lines.push('-- Fichier GÉNÉRÉ automatiquement — ne pas modifier à la main.');
lines.push('-- Source : src/01-config.js et src/02-professions.js');
lines.push('-- Régénérer avec : node tools/gen-supabase-reference.js');
lines.push('-- À exécuter après 03-functions.sql. Rejouable sans risque (upsert).');
lines.push('-- =============================================================================');
lines.push('');

lines.push('-- 1. Unités de mesure');
B.UNITS.forEach((u, i) => {
  lines.push('insert into units (code, label, position) values (' + q(u.id) + ', ' + q(u.label || u.id) + ', ' + i + ')');
  lines.push('  on conflict (code) do update set label = excluded.label, position = excluded.position;');
});
lines.push('');

lines.push('-- 2. Catégories de dépenses');
B.EXPENSE_CATEGORIES.forEach((c, i) => {
  lines.push('insert into expense_categories (code, label, position) values (' + q(c.id) + ', ' + q(c.label) + ', ' + i + ')');
  lines.push('  on conflict (code) do update set label = excluded.label, position = excluded.position;');
});
lines.push('');

lines.push('-- 3. Catégories du catalogue');
B.CATALOG_CATEGORIES.forEach((c, i) => {
  lines.push('insert into catalog_categories (code, label, position) values (' + q(c.id) + ', ' + q(c.label) + ', ' + i + ')');
  lines.push('  on conflict (code) do update set label = excluded.label, position = excluded.position;');
});
lines.push('');

lines.push('-- 4. Métiers et catalogues modèles (business_id NULL = article partagé)');
B.PROFESSIONS.forEach((p, i) => {
  lines.push('insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (');
  lines.push('  ' + q(p.id) + ', ' + q(p.name) + ', ' + q(p.icon || null) + ', ' + j(p.tags || []) + ',');
  lines.push('  ' + j(p.items || []) + '::jsonb,');
  lines.push('  ' + j(p.templates || []) + '::jsonb,');
  lines.push('  ' + j(p.budget_profile || {}) + '::jsonb,');
  lines.push('  ' + (p.active === false ? 'false' : 'true') + ', ' + ((p.order || i) + 1) + ')');
  lines.push("  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;");
});
lines.push('');

lines.push('-- 5. Catalogue global par métier (consultable par toutes les entreprises de ce métier)');
const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
B.PROFESSIONS.forEach((p) => {
  (p.items || []).forEach((it, idx) => {
    const sku = slug(p.id) + '-' + idx + '-' + slug(it.name);
    lines.push('insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (');
    lines.push('  null, ' + q(p.id) + ', ' + q(it.name) + ', ' + q(it.description || '') + ', ' + q(it.unit) + ', ' +
      n(it.default_price || 0) + ', ' + q(it.category || 'materiaux') + ', ' + (it.favorite ? 'true' : 'false') + ', ' +
      q(it.keywords || '') + ', ' + (it.active === false ? 'false' : 'true') + ", 'ci_" + sku + "')");
    lines.push('  on conflict (local_id) where business_id is null do update set');
    lines.push('    name = excluded.name, description = excluded.description, unit = excluded.unit,');
    lines.push('    default_price = excluded.default_price, category = excluded.category,');
    lines.push('    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;');
  });
});
lines.push('');
lines.push("-- Note : les prix ci-dessus sont des repères indicatifs pour le Togo ;");
lines.push("-- chaque entreprise peut les modifier, la modification ne touche jamais");
lines.push("-- un document déjà créé (les lignes enregistrent leur propre prix).");

fs.writeFileSync(OUT, lines.join('\n') + '\n');
console.log('Référentiel écrit : ' + OUT);
console.log('  ' + B.PROFESSIONS.length + ' métiers · ' +
  B.PROFESSIONS.reduce((s, p) => s + (p.items || []).length, 0) + ' articles · ' +
  B.UNITS.length + ' unités · ' + B.EXPENSE_CATEGORIES.length + ' catégories de dépenses · ' +
  B.CATALOG_CATEGORIES.length + ' catégories catalogue');
