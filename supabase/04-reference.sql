-- =============================================================================
-- BATIYO — RÉFÉRENTIEL DE BASE (métiers, unités, catégories, catalogues modèles)
-- -----------------------------------------------------------------------------
-- Fichier GÉNÉRÉ automatiquement — ne pas modifier à la main.
-- Source : src/01-config.js et src/02-professions.js
-- Régénérer avec : node tools/gen-supabase-reference.js
-- À exécuter après 03-functions.sql. Rejouable sans risque (upsert).
-- =============================================================================

-- 1. Unités de mesure
insert into units (code, label, position) values ('sac', 'sac', 0)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('barre', 'barre', 1)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('kg', 'kg', 2)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('tonne', 'tonne', 3)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('m', 'mètre', 4)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('m2', 'm²', 5)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('m3', 'm³', 6)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('litre', 'litre', 7)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('voyage', 'voyage', 8)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('heure', 'heure', 9)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('jour', 'jour', 10)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('forfait', 'forfait', 11)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('unite', 'unité', 12)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('carton', 'carton', 13)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('rouleau', 'rouleau', 14)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('piece', 'pièce', 15)
  on conflict (code) do update set label = excluded.label, position = excluded.position;

-- 2. Catégories de dépenses
insert into expense_categories (code, label, position) values ('materiaux', 'Matériaux', 0)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into expense_categories (code, label, position) values ('main_oeuvre', 'Main-d’œuvre', 1)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into expense_categories (code, label, position) values ('transport', 'Transport', 2)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into expense_categories (code, label, position) values ('carburant', 'Carburant', 3)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into expense_categories (code, label, position) values ('outillage', 'Outillage', 4)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into expense_categories (code, label, position) values ('fournitures', 'Fournitures', 5)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into expense_categories (code, label, position) values ('autres', 'Autres', 6)
  on conflict (code) do update set label = excluded.label, position = excluded.position;

-- 3. Catégories du catalogue
insert into catalog_categories (code, label, position) values ('materiaux', 'Matériaux', 0)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into catalog_categories (code, label, position) values ('services', 'Services', 1)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into catalog_categories (code, label, position) values ('sanitaire', 'Sanitaire', 2)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into catalog_categories (code, label, position) values ('electrique', 'Électrique', 3)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into catalog_categories (code, label, position) values ('finition', 'Finition', 4)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into catalog_categories (code, label, position) values ('outillage', 'Outillage', 5)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into catalog_categories (code, label, position) values ('divers', 'Divers', 6)
  on conflict (code) do update set label = excluded.label, position = excluded.position;

-- 4. Métiers et catalogues modèles (business_id NULL = article partagé)
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'maçon', 'Maçon', 'brick', '[]'::jsonb,
  '[{"id":null,"name":"Ciment CPJ 45","unit":"sac","default_price":5500,"category":"materiaux","favorite":true,"keywords":"ciment cpj sac liant","active":true},{"id":null,"name":"Ciment CPA 45","unit":"sac","default_price":6200,"category":"materiaux","favorite":false,"keywords":"ciment cpa sac","active":true},{"id":null,"name":"Sable","unit":"voyage","default_price":35000,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Sable fin","unit":"m3","default_price":9000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Gravier 15/25","unit":"voyage","default_price":48000,"category":"materiaux","favorite":true,"keywords":"gravier cailloux beton","active":true},{"id":null,"name":"Gravier 5/15","unit":"voyage","default_price":45000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Fer 6","unit":"barre","default_price":2500,"category":"materiaux","favorite":true,"keywords":"fer a beton rond","active":true},{"id":null,"name":"Fer 8","unit":"barre","default_price":4500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Fer 10","unit":"barre","default_price":6500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Fer 12","unit":"barre","default_price":9500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Fer 14","unit":"barre","default_price":12500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Fer 16","unit":"barre","default_price":16500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Agglo 10","unit":"unité","default_price":275,"category":"materiaux","favorite":false,"keywords":"agglo bloc parpaing","active":true},{"id":null,"name":"Agglo 15","unit":"unité","default_price":350,"category":"materiaux","favorite":true,"keywords":"agglo bloc parpaing","active":true},{"id":null,"name":"Agglo 20","unit":"unité","default_price":425,"category":"materiaux","favorite":false,"keywords":"agglo bloc parpaing","active":true},{"id":null,"name":"Brique rouge","unit":"unité","default_price":200,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Coffrage","unit":"forfait","default_price":35000,"category":"services","favorite":false,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre maçonnerie","unit":"forfait","default_price":150000,"category":"services","favorite":true,"keywords":"main oeuvre macon","active":true},{"id":null,"name":"Transport","unit":"voyage","default_price":15000,"category":"services","favorite":true,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"mur","name":"Devis construction mur","hint":"Agglos, ciment, fer, sable, main-d’œuvre","items":[{"name":"Agglo 15","qty":800,"unit":"unité"},{"name":"Ciment CPJ 45","qty":25,"unit":"sac"},{"name":"Sable","qty":3,"unit":"voyage"},{"name":"Fer 8","qty":20,"unit":"barre"},{"name":"Main-d’œuvre maçonnerie","qty":1,"unit":"forfait"}],"budget":{"ciment":140000,"fer":90000,"sable":105000,"gravier":0,"main_oeuvre":250000,"transport":40000,"autres":30000}},{"id":"dalle","name":"Devis dalle béton","hint":"Béton, ferraillage, coffrage","items":[{"name":"Ciment CPJ 45","qty":60,"unit":"sac"},{"name":"Sable","qty":6,"unit":"voyage"},{"name":"Gravier 15/25","qty":8,"unit":"voyage"},{"name":"Fer 10","qty":60,"unit":"barre"},{"name":"Coffrage","qty":1,"unit":"forfait"},{"name":"Main-d’œuvre maçonnerie","qty":1,"unit":"forfait"}],"budget":{"ciment":335000,"fer":330000,"sable":210000,"gravier":220000,"main_oeuvre":450000,"transport":90000,"autres":60000}}]'::jsonb::jsonb,
  '{"ciment":24,"fer":17,"sable":9,"gravier":8,"main_oeuvre":31,"transport":6,"autres":5}'::jsonb::jsonb,
  true, 1)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'plombier', 'Plombier', 'drop', '[]'::jsonb,
  '[{"id":null,"name":"PVC 20","unit":"barre","default_price":2200,"category":"sanitaire","favorite":false,"keywords":"tube pvc tuyau","active":true},{"id":null,"name":"PVC 25","unit":"barre","default_price":3000,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"PVC 32","unit":"barre","default_price":4200,"category":"sanitaire","favorite":true,"keywords":"","active":true},{"id":null,"name":"PVC 40","unit":"barre","default_price":6000,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"Coude","unit":"unité","default_price":550,"category":"sanitaire","favorite":true,"keywords":"","active":true},{"id":null,"name":"Té","unit":"unité","default_price":750,"category":"sanitaire","favorite":true,"keywords":"","active":true},{"id":null,"name":"Vanne","unit":"unité","default_price":3500,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"Robinet","unit":"unité","default_price":8500,"category":"sanitaire","favorite":true,"keywords":"","active":true},{"id":null,"name":"Flexible","unit":"unité","default_price":1500,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"Joint","unit":"unité","default_price":250,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"Colle PVC","unit":"unité","default_price":3200,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"PPR 20","unit":"barre","default_price":3800,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"PPR 25","unit":"barre","default_price":5200,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"Chauffe-eau","unit":"unité","default_price":95000,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"WC complet","unit":"unité","default_price":85000,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"Lavabo","unit":"unité","default_price":45000,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre plomberie","unit":"forfait","default_price":85000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Pose","unit":"unité","default_price":12000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Déplacement","unit":"forfait","default_price":5000,"category":"services","favorite":false,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"sdb","name":"Devis installation sanitaire","hint":"Tuyaux, raccords, pose","items":[{"name":"PVC 32","qty":30,"unit":"barre"},{"name":"Coude","qty":25,"unit":"unité"},{"name":"Té","qty":15,"unit":"unité"},{"name":"Colle PVC","qty":4,"unit":"unité"},{"name":"Robinet","qty":4,"unit":"unité"},{"name":"Main-d’œuvre plomberie","qty":1,"unit":"forfait"}],"budget":{"ciment":25000,"main_oeuvre":260000,"transport":40000,"autres":60000,"fer":0,"sable":0,"gravier":0}}]'::jsonb::jsonb,
  '{"ciment":5,"fer":3,"sable":4,"gravier":3,"main_oeuvre":62,"transport":11,"autres":12}'::jsonb::jsonb,
  true, 2)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'electricien', 'Électricien', 'bolt', '[]'::jsonb,
  '[{"id":null,"name":"Câble 1,5","unit":"rouleau","default_price":12500,"category":"electrique","favorite":true,"keywords":"cable fil souple","active":true},{"id":null,"name":"Câble 2,5","unit":"rouleau","default_price":18500,"category":"electrique","favorite":true,"keywords":"","active":true},{"id":null,"name":"Câble 4","unit":"rouleau","default_price":26000,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Câble 6","unit":"rouleau","default_price":38000,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Disjoncteur","unit":"unité","default_price":6500,"category":"electrique","favorite":true,"keywords":"","active":true},{"id":null,"name":"Prise","unit":"unité","default_price":1800,"category":"electrique","favorite":true,"keywords":"","active":true},{"id":null,"name":"Interrupteur","unit":"unité","default_price":1500,"category":"electrique","favorite":true,"keywords":"","active":true},{"id":null,"name":"Gaine","unit":"barre","default_price":750,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Boîte d’encastrement","unit":"unité","default_price":350,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Tableau électrique","unit":"unité","default_price":45000,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Ampoule LED","unit":"unité","default_price":1500,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Réglette LED","unit":"unité","default_price":9500,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Douille","unit":"unité","default_price":800,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Domino","unit":"unité","default_price":150,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre électricité","unit":"forfait","default_price":75000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Installation","unit":"unité","default_price":5000,"category":"services","favorite":false,"keywords":"","active":true},{"id":null,"name":"Dépannage","unit":"forfait","default_price":15000,"category":"services","favorite":true,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"tableau","name":"Devis installation électrique","hint":"Câbles, appareillage, tableau","items":[{"name":"Câble 1,5","qty":5,"unit":"rouleau"},{"name":"Câble 2,5","qty":4,"unit":"rouleau"},{"name":"Gaine","qty":40,"unit":"barre"},{"name":"Tableau électrique","qty":1,"unit":"unité"},{"name":"Disjoncteur","qty":8,"unit":"unité"},{"name":"Prise","qty":12,"unit":"unité"},{"name":"Interrupteur","qty":8,"unit":"unité"},{"name":"Main-d’œuvre électricité","qty":1,"unit":"forfait"}],"budget":{"ciment":20000,"fer":30000,"main_oeuvre":280000,"transport":50000,"autres":90000,"sable":0,"gravier":0}}]'::jsonb::jsonb,
  '{"ciment":5,"fer":6,"sable":3,"gravier":3,"main_oeuvre":58,"transport":11,"autres":14}'::jsonb::jsonb,
  true, 3)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'peintre', 'Peintre', 'brush', '[]'::jsonb,
  '[{"id":null,"name":"Peinture acrylique","unit":"unité","default_price":18500,"category":"finition","favorite":true,"keywords":"peinture pot seau","active":true},{"id":null,"name":"Peinture à l’huile","unit":"unité","default_price":22000,"category":"finition","favorite":false,"keywords":"","active":true},{"id":null,"name":"Sous-couche","unit":"unité","default_price":14500,"category":"finition","favorite":true,"keywords":"","active":true},{"id":null,"name":"Enduit de lissage","unit":"sac","default_price":6500,"category":"finition","favorite":true,"keywords":"","active":true},{"id":null,"name":"Mastic","unit":"kg","default_price":1800,"category":"finition","favorite":false,"keywords":"","active":true},{"id":null,"name":"Rouleau","unit":"unité","default_price":2500,"category":"outillage","favorite":true,"keywords":"","active":true},{"id":null,"name":"Pinceau","unit":"unité","default_price":1200,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Brosse","unit":"unité","default_price":1000,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Papier abrasif","unit":"unité","default_price":500,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Bâche de protection","unit":"unité","default_price":3500,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Diluant","unit":"litre","default_price":2200,"category":"finition","favorite":false,"keywords":"","active":true},{"id":null,"name":"Préparation des supports","unit":"m2","default_price":1200,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Finition","unit":"m2","default_price":1500,"category":"services","favorite":false,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre peinture","unit":"forfait","default_price":45000,"category":"services","favorite":true,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"appart","name":"Devis peinture appartement","hint":"Peinture, enduit, préparation","items":[{"name":"Peinture acrylique","qty":12,"unit":"unité"},{"name":"Sous-couche","qty":6,"unit":"unité"},{"name":"Enduit de lissage","qty":15,"unit":"sac"},{"name":"Papier abrasif","qty":20,"unit":"unité"},{"name":"Préparation des supports","qty":1,"unit":"forfait"},{"name":"Main-d’œuvre peinture","qty":1,"unit":"forfait"}],"budget":{"ciment":30000,"main_oeuvre":220000,"transport":35000,"autres":90000,"fer":0,"sable":0,"gravier":0}}]'::jsonb::jsonb,
  '{"ciment":6,"fer":2,"sable":3,"gravier":2,"main_oeuvre":55,"transport":10,"autres":22}'::jsonb::jsonb,
  true, 4)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'menuisier', 'Menuisier', 'hammer', '[]'::jsonb,
  '[{"id":null,"name":"Planche","unit":"unité","default_price":6500,"category":"materiaux","favorite":true,"keywords":"planche bois","active":true},{"id":null,"name":"Bois chevron","unit":"unité","default_price":4500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Contreplaqué","unit":"unité","default_price":18500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"MDF","unit":"unité","default_price":22000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Porte bois","unit":"unité","default_price":45000,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Cadre de porte","unit":"unité","default_price":25000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Charnière","unit":"unité","default_price":1200,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Serrure","unit":"unité","default_price":12500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Poignée","unit":"unité","default_price":3500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Vis à bois","unit":"kg","default_price":2200,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Colle à bois","unit":"unité","default_price":2800,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Vernis","unit":"litre","default_price":4500,"category":"finition","favorite":false,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre menuiserie","unit":"forfait","default_price":95000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Pose","unit":"unité","default_price":15000,"category":"services","favorite":false,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"bois","name":"Devis menuiserie bois","hint":"Bois, quincaillerie, pose","items":[{"name":"Planche","qty":30,"unit":"unité"},{"name":"Bois chevron","qty":40,"unit":"unité"},{"name":"Contreplaqué","qty":8,"unit":"unité"},{"name":"Charnière","qty":12,"unit":"unité"},{"name":"Main-d’œuvre menuiserie","qty":1,"unit":"forfait"}],"budget":{"ciment":20000,"fer":40000,"main_oeuvre":260000,"transport":60000,"autres":80000,"sable":0,"gravier":0}}]'::jsonb::jsonb,
  '{"ciment":5,"fer":8,"sable":4,"gravier":3,"main_oeuvre":52,"transport":13,"autres":15}'::jsonb::jsonb,
  true, 5)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'carreleur', 'Carreleur', 'grid', '[]'::jsonb,
  '[{"id":null,"name":"Carrelage 40x40","unit":"m2","default_price":6500,"category":"materiaux","favorite":true,"keywords":"carrelage carreau sol","active":true},{"id":null,"name":"Carrelage 60x60","unit":"m2","default_price":9500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Faïence murale","unit":"m2","default_price":7800,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Colle à carrelage","unit":"sac","default_price":4800,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Joint de carrelage","unit":"sac","default_price":3500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Croisillons","unit":"unité","default_price":1500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Plinthe","unit":"m","default_price":1800,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Ciment CPJ 45","unit":"sac","default_price":5500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Sable","unit":"voyage","default_price":35000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Meuleuse","unit":"unité","default_price":35000,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre carrelage","unit":"forfait","default_price":65000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Pose carrelage","unit":"m2","default_price":2500,"category":"services","favorite":true,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"sol","name":"Devis pose carrelage","hint":"Carrelage, colle, joint","items":[{"name":"Carrelage 40x40","qty":90,"unit":"m2"},{"name":"Colle à carrelage","qty":25,"unit":"sac"},{"name":"Joint de carrelage","qty":12,"unit":"sac"},{"name":"Croisillons","qty":10,"unit":"unité"},{"name":"Main-d’œuvre carrelage","qty":1,"unit":"forfait"}],"budget":{"ciment":100000,"main_oeuvre":180000,"transport":30000,"autres":40000,"fer":0,"sable":0,"gravier":0}}]'::jsonb::jsonb,
  '{"ciment":22,"fer":3,"sable":8,"gravier":4,"main_oeuvre":47,"transport":8,"autres":8}'::jsonb::jsonb,
  true, 6)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'soudeur', 'Soudeur', 'flame', '[]'::jsonb,
  '[{"id":null,"name":"Fer 12","unit":"barre","default_price":9500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Fer 16","unit":"barre","default_price":16500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Fer 20","unit":"barre","default_price":25000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Fer cornière","unit":"barre","default_price":12500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Tôle","unit":"unité","default_price":22000,"category":"materiaux","favorite":true,"keywords":"tole bac","active":true},{"id":null,"name":"Tube carré","unit":"barre","default_price":8500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Électrode","unit":"kg","default_price":3500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Gaz soudure","unit":"unité","default_price":18000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Disque à tronçonner","unit":"unité","default_price":2500,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Peinture antirouille","unit":"unité","default_price":9500,"category":"finition","favorite":false,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre soudure","unit":"forfait","default_price":65000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Soudure sur site","unit":"heure","default_price":5000,"category":"services","favorite":false,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"portail","name":"Devis portail métallique","hint":"Fer, peinture, soudure","items":[{"name":"Fer 12","qty":35,"unit":"barre"},{"name":"Fer 16","qty":12,"unit":"barre"},{"name":"Fer cornière","qty":10,"unit":"barre"},{"name":"Électrode","qty":8,"unit":"kg"},{"name":"Peinture antirouille","qty":6,"unit":"unité"},{"name":"Main-d’œuvre soudure","qty":1,"unit":"forfait"}],"budget":{"ciment":25000,"fer":320000,"main_oeuvre":150000,"transport":40000,"autres":50000,"sable":0,"gravier":0}}]'::jsonb::jsonb,
  '{"ciment":6,"fer":40,"sable":3,"gravier":3,"main_oeuvre":33,"transport":8,"autres":7}'::jsonb::jsonb,
  true, 7)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'climaticien', 'Climaticien', 'wind', '[]'::jsonb,
  '[{"id":null,"name":"Climatiseur 1 CV","unit":"unité","default_price":185000,"category":"materiaux","favorite":true,"keywords":"clim split climatiseur","active":true},{"id":null,"name":"Climatiseur 1,5 CV","unit":"unité","default_price":235000,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Climatiseur 2 CV","unit":"unité","default_price":320000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Support climatiseur","unit":"unité","default_price":12000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Tuyau cuivre","unit":"m","default_price":6500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Gaz R410","unit":"kg","default_price":15000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Câble 2,5","unit":"rouleau","default_price":18500,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Disjoncteur","unit":"unité","default_price":6500,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Télécommande","unit":"unité","default_price":8500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre climatisation","unit":"forfait","default_price":45000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Entretien climatiseur","unit":"unité","default_price":15000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Recharge gaz","unit":"unité","default_price":25000,"category":"services","favorite":false,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"split","name":"Devis installation climatiseur","hint":"Split, supports, mise en service","items":[{"name":"Climatiseur 1 CV","qty":2,"unit":"unité"},{"name":"Support climatiseur","qty":2,"unit":"unité"},{"name":"Tuyau cuivre","qty":12,"unit":"m"},{"name":"Câble 2,5","qty":1,"unit":"rouleau"},{"name":"Main-d’œuvre climatisation","qty":1,"unit":"forfait"}],"budget":{"ciment":20000,"main_oeuvre":180000,"transport":45000,"autres":120000,"fer":0,"sable":0,"gravier":0}}]'::jsonb::jsonb,
  '{"ciment":4,"fer":5,"sable":2,"gravier":2,"main_oeuvre":52,"transport":13,"autres":22}'::jsonb::jsonb,
  true, 8)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'mecanicien', 'Mécanicien', 'wrench', '[]'::jsonb,
  '[{"id":null,"name":"Huile moteur","unit":"litre","default_price":4500,"category":"materiaux","favorite":true,"keywords":"huile vidange","active":true},{"id":null,"name":"Filtre à huile","unit":"unité","default_price":6500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Filtre à air","unit":"unité","default_price":8500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Filtre à gasoil","unit":"unité","default_price":9500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Plaquettes de frein","unit":"unité","default_price":12500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Bougie","unit":"unité","default_price":4500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Batterie","unit":"unité","default_price":55000,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Courroie","unit":"unité","default_price":15000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Pneu","unit":"unité","default_price":45000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Liquide de frein","unit":"litre","default_price":3500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre mécanique","unit":"forfait","default_price":25000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Diagnostic","unit":"forfait","default_price":10000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Sortie véhicule","unit":"forfait","default_price":15000,"category":"services","favorite":false,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"revision","name":"Devis révision véhicule","hint":"Vidange, filtres, freins","items":[{"name":"Huile moteur","qty":5,"unit":"litre"},{"name":"Filtre à huile","qty":1,"unit":"unité"},{"name":"Filtre à air","qty":1,"unit":"unité"},{"name":"Plaquettes de frein","qty":4,"unit":"unité"},{"name":"Main-d’œuvre mécanique","qty":1,"unit":"forfait"}],"budget":{"ciment":0,"fer":10000,"sable":0,"gravier":0,"main_oeuvre":60000,"transport":15000,"autres":40000}}]'::jsonb::jsonb,
  '{"ciment":0,"fer":10,"sable":0,"gravier":0,"main_oeuvre":60,"transport":10,"autres":20}'::jsonb::jsonb,
  true, 9)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'quincaillier', 'Quincaillier', 'store', '[]'::jsonb,
  '[{"id":null,"name":"Ciment CPJ 45","unit":"sac","default_price":5500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Fer 6","unit":"barre","default_price":2500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Fer 8","unit":"barre","default_price":4500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Fer 10","unit":"barre","default_price":6500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Fer 12","unit":"barre","default_price":9500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Agglo 15","unit":"unité","default_price":350,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Agglo 20","unit":"unité","default_price":425,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Tube PVC 32","unit":"barre","default_price":4200,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"Robinet","unit":"unité","default_price":8500,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"Câble 1,5","unit":"rouleau","default_price":12500,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Câble 2,5","unit":"rouleau","default_price":18500,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Prise","unit":"unité","default_price":1800,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Interrupteur","unit":"unité","default_price":1500,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Ampoule LED","unit":"unité","default_price":1500,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Peinture acrylique","unit":"unité","default_price":18500,"category":"finition","favorite":false,"keywords":"","active":true},{"id":null,"name":"Marteau","unit":"unité","default_price":5500,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Truelle","unit":"unité","default_price":2500,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Mètre ruban","unit":"unité","default_price":2200,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Niveau à bulle","unit":"unité","default_price":6500,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Pelle","unit":"unité","default_price":4500,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Brouette","unit":"unité","default_price":35000,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Livraison","unit":"forfait","default_price":15000,"category":"services","favorite":false,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"chantier","name":"Facture matériaux de chantier","hint":"Vente de matériaux","items":[{"name":"Ciment CPJ 45","qty":20,"unit":"sac"},{"name":"Fer 8","qty":10,"unit":"barre"},{"name":"Agglo 15","qty":100,"unit":"unité"},{"name":"Livraison","qty":1,"unit":"forfait"}],"budget":{"ciment":110000,"fer":45000,"sable":0,"gravier":0,"main_oeuvre":15000,"transport":20000,"autres":20000}}]'::jsonb::jsonb,
  '{"ciment":30,"fer":20,"sable":5,"gravier":5,"main_oeuvre":10,"transport":10,"autres":20}'::jsonb::jsonb,
  true, 10)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'commercant', 'Commerçant', 'cart', '[]'::jsonb,
  '[{"id":null,"name":"Article divers","unit":"unité","default_price":5000,"category":"divers","favorite":true,"keywords":"","active":true},{"id":null,"name":"Sac de riz 50 kg","unit":"sac","default_price":32000,"category":"divers","favorite":true,"keywords":"","active":true},{"id":null,"name":"Huile 5 L","unit":"unité","default_price":8500,"category":"divers","favorite":false,"keywords":"","active":true},{"id":null,"name":"Carton de savon","unit":"carton","default_price":12000,"category":"divers","favorite":false,"keywords":"","active":true},{"id":null,"name":"Bouteille d’eau","unit":"unité","default_price":300,"category":"divers","favorite":false,"keywords":"","active":true},{"id":null,"name":"Boîte de tomate","unit":"carton","default_price":15000,"category":"divers","favorite":false,"keywords":"","active":true},{"id":null,"name":"Spaghetti (carton)","unit":"carton","default_price":9000,"category":"divers","favorite":false,"keywords":"","active":true},{"id":null,"name":"Sucre 50 kg","unit":"sac","default_price":35000,"category":"divers","favorite":false,"keywords":"","active":true},{"id":null,"name":"Livraison","unit":"forfait","default_price":15000,"category":"services","favorite":false,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"vente","name":"Facture de vente","hint":"Produits vendus","items":[{"name":"Article A","qty":10,"unit":"unité"},{"name":"Livraison","qty":1,"unit":"forfait"}],"budget":{"ciment":0,"fer":0,"sable":0,"gravier":0,"main_oeuvre":25000,"transport":25000,"autres":50000}}]'::jsonb::jsonb,
  '{"ciment":0,"fer":0,"sable":0,"gravier":0,"main_oeuvre":20,"transport":25,"autres":55}'::jsonb::jsonb,
  true, 11)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'autre', 'Autre', 'dots', '[]'::jsonb,
  '[{"id":null,"name":"Fourniture","unit":"forfait","default_price":25000,"category":"divers","favorite":true,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre","unit":"forfait","default_price":100000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Transport","unit":"forfait","default_price":15000,"category":"services","favorite":false,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"generique","name":"Devis général","hint":"Prestations et fournitures","items":[{"name":"Fourniture","qty":1,"unit":"forfait"},{"name":"Main-d’œuvre","qty":1,"unit":"forfait"}],"budget":{"ciment":0,"fer":0,"sable":0,"gravier":0,"main_oeuvre":100000,"transport":20000,"autres":50000}}]'::jsonb::jsonb,
  '{"ciment":15,"fer":10,"sable":5,"gravier":5,"main_oeuvre":40,"transport":10,"autres":15}'::jsonb::jsonb,
  true, 12)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;

-- 5. Catalogue global par métier (consultable par toutes les entreprises de ce métier)
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Ciment CPJ 45', '', 'sac', 5500, 'materiaux', true, 'ciment cpj sac liant', true, 'ci_macon-0-ciment-cpj-45')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Ciment CPA 45', '', 'sac', 6200, 'materiaux', false, 'ciment cpa sac', true, 'ci_macon-1-ciment-cpa-45')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Sable', '', 'voyage', 35000, 'materiaux', true, '', true, 'ci_macon-2-sable')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Sable fin', '', 'm3', 9000, 'materiaux', false, '', true, 'ci_macon-3-sable-fin')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Gravier 15/25', '', 'voyage', 48000, 'materiaux', true, 'gravier cailloux beton', true, 'ci_macon-4-gravier-15-25')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Gravier 5/15', '', 'voyage', 45000, 'materiaux', false, '', true, 'ci_macon-5-gravier-5-15')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Fer 6', '', 'barre', 2500, 'materiaux', true, 'fer a beton rond', true, 'ci_macon-6-fer-6')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Fer 8', '', 'barre', 4500, 'materiaux', true, '', true, 'ci_macon-7-fer-8')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Fer 10', '', 'barre', 6500, 'materiaux', true, '', true, 'ci_macon-8-fer-10')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Fer 12', '', 'barre', 9500, 'materiaux', false, '', true, 'ci_macon-9-fer-12')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Fer 14', '', 'barre', 12500, 'materiaux', false, '', true, 'ci_macon-10-fer-14')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Fer 16', '', 'barre', 16500, 'materiaux', false, '', true, 'ci_macon-11-fer-16')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Agglo 10', '', 'unité', 275, 'materiaux', false, 'agglo bloc parpaing', true, 'ci_macon-12-agglo-10')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Agglo 15', '', 'unité', 350, 'materiaux', true, 'agglo bloc parpaing', true, 'ci_macon-13-agglo-15')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Agglo 20', '', 'unité', 425, 'materiaux', false, 'agglo bloc parpaing', true, 'ci_macon-14-agglo-20')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Brique rouge', '', 'unité', 200, 'materiaux', false, '', true, 'ci_macon-15-brique-rouge')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Coffrage', '', 'forfait', 35000, 'services', false, '', true, 'ci_macon-16-coffrage')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Main-d’œuvre maçonnerie', '', 'forfait', 150000, 'services', true, 'main oeuvre macon', true, 'ci_macon-17-main-d-uvre-maconnerie')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Transport', '', 'voyage', 15000, 'services', true, '', true, 'ci_macon-18-transport')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'PVC 20', '', 'barre', 2200, 'sanitaire', false, 'tube pvc tuyau', true, 'ci_plombier-0-pvc-20')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'PVC 25', '', 'barre', 3000, 'sanitaire', false, '', true, 'ci_plombier-1-pvc-25')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'PVC 32', '', 'barre', 4200, 'sanitaire', true, '', true, 'ci_plombier-2-pvc-32')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'PVC 40', '', 'barre', 6000, 'sanitaire', false, '', true, 'ci_plombier-3-pvc-40')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Coude', '', 'unité', 550, 'sanitaire', true, '', true, 'ci_plombier-4-coude')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Té', '', 'unité', 750, 'sanitaire', true, '', true, 'ci_plombier-5-te')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Vanne', '', 'unité', 3500, 'sanitaire', false, '', true, 'ci_plombier-6-vanne')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Robinet', '', 'unité', 8500, 'sanitaire', true, '', true, 'ci_plombier-7-robinet')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Flexible', '', 'unité', 1500, 'sanitaire', false, '', true, 'ci_plombier-8-flexible')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Joint', '', 'unité', 250, 'sanitaire', false, '', true, 'ci_plombier-9-joint')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Colle PVC', '', 'unité', 3200, 'sanitaire', false, '', true, 'ci_plombier-10-colle-pvc')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'PPR 20', '', 'barre', 3800, 'sanitaire', false, '', true, 'ci_plombier-11-ppr-20')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'PPR 25', '', 'barre', 5200, 'sanitaire', false, '', true, 'ci_plombier-12-ppr-25')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Chauffe-eau', '', 'unité', 95000, 'sanitaire', false, '', true, 'ci_plombier-13-chauffe-eau')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'WC complet', '', 'unité', 85000, 'sanitaire', false, '', true, 'ci_plombier-14-wc-complet')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Lavabo', '', 'unité', 45000, 'sanitaire', false, '', true, 'ci_plombier-15-lavabo')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Main-d’œuvre plomberie', '', 'forfait', 85000, 'services', true, '', true, 'ci_plombier-16-main-d-uvre-plomberie')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Pose', '', 'unité', 12000, 'services', true, '', true, 'ci_plombier-17-pose')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Déplacement', '', 'forfait', 5000, 'services', false, '', true, 'ci_plombier-18-deplacement')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Câble 1,5', '', 'rouleau', 12500, 'electrique', true, 'cable fil souple', true, 'ci_electricien-0-cable-1-5')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Câble 2,5', '', 'rouleau', 18500, 'electrique', true, '', true, 'ci_electricien-1-cable-2-5')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Câble 4', '', 'rouleau', 26000, 'electrique', false, '', true, 'ci_electricien-2-cable-4')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Câble 6', '', 'rouleau', 38000, 'electrique', false, '', true, 'ci_electricien-3-cable-6')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Disjoncteur', '', 'unité', 6500, 'electrique', true, '', true, 'ci_electricien-4-disjoncteur')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Prise', '', 'unité', 1800, 'electrique', true, '', true, 'ci_electricien-5-prise')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Interrupteur', '', 'unité', 1500, 'electrique', true, '', true, 'ci_electricien-6-interrupteur')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Gaine', '', 'barre', 750, 'electrique', false, '', true, 'ci_electricien-7-gaine')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Boîte d’encastrement', '', 'unité', 350, 'electrique', false, '', true, 'ci_electricien-8-boite-d-encastrement')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Tableau électrique', '', 'unité', 45000, 'electrique', false, '', true, 'ci_electricien-9-tableau-electrique')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Ampoule LED', '', 'unité', 1500, 'electrique', false, '', true, 'ci_electricien-10-ampoule-led')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Réglette LED', '', 'unité', 9500, 'electrique', false, '', true, 'ci_electricien-11-reglette-led')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Douille', '', 'unité', 800, 'electrique', false, '', true, 'ci_electricien-12-douille')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Domino', '', 'unité', 150, 'electrique', false, '', true, 'ci_electricien-13-domino')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Main-d’œuvre électricité', '', 'forfait', 75000, 'services', true, '', true, 'ci_electricien-14-main-d-uvre-electricite')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Installation', '', 'unité', 5000, 'services', false, '', true, 'ci_electricien-15-installation')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Dépannage', '', 'forfait', 15000, 'services', true, '', true, 'ci_electricien-16-depannage')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Peinture acrylique', '', 'unité', 18500, 'finition', true, 'peinture pot seau', true, 'ci_peintre-0-peinture-acrylique')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Peinture à l’huile', '', 'unité', 22000, 'finition', false, '', true, 'ci_peintre-1-peinture-a-l-huile')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Sous-couche', '', 'unité', 14500, 'finition', true, '', true, 'ci_peintre-2-sous-couche')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Enduit de lissage', '', 'sac', 6500, 'finition', true, '', true, 'ci_peintre-3-enduit-de-lissage')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Mastic', '', 'kg', 1800, 'finition', false, '', true, 'ci_peintre-4-mastic')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Rouleau', '', 'unité', 2500, 'outillage', true, '', true, 'ci_peintre-5-rouleau')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Pinceau', '', 'unité', 1200, 'outillage', false, '', true, 'ci_peintre-6-pinceau')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Brosse', '', 'unité', 1000, 'outillage', false, '', true, 'ci_peintre-7-brosse')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Papier abrasif', '', 'unité', 500, 'outillage', false, '', true, 'ci_peintre-8-papier-abrasif')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Bâche de protection', '', 'unité', 3500, 'outillage', false, '', true, 'ci_peintre-9-bache-de-protection')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Diluant', '', 'litre', 2200, 'finition', false, '', true, 'ci_peintre-10-diluant')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Préparation des supports', '', 'm2', 1200, 'services', true, '', true, 'ci_peintre-11-preparation-des-supports')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Finition', '', 'm2', 1500, 'services', false, '', true, 'ci_peintre-12-finition')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Main-d’œuvre peinture', '', 'forfait', 45000, 'services', true, '', true, 'ci_peintre-13-main-d-uvre-peinture')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Planche', '', 'unité', 6500, 'materiaux', true, 'planche bois', true, 'ci_menuisier-0-planche')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Bois chevron', '', 'unité', 4500, 'materiaux', false, '', true, 'ci_menuisier-1-bois-chevron')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Contreplaqué', '', 'unité', 18500, 'materiaux', true, '', true, 'ci_menuisier-2-contreplaque')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'MDF', '', 'unité', 22000, 'materiaux', false, '', true, 'ci_menuisier-3-mdf')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Porte bois', '', 'unité', 45000, 'materiaux', true, '', true, 'ci_menuisier-4-porte-bois')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Cadre de porte', '', 'unité', 25000, 'materiaux', false, '', true, 'ci_menuisier-5-cadre-de-porte')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Charnière', '', 'unité', 1200, 'materiaux', false, '', true, 'ci_menuisier-6-charniere')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Serrure', '', 'unité', 12500, 'materiaux', true, '', true, 'ci_menuisier-7-serrure')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Poignée', '', 'unité', 3500, 'materiaux', false, '', true, 'ci_menuisier-8-poignee')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Vis à bois', '', 'kg', 2200, 'materiaux', false, '', true, 'ci_menuisier-9-vis-a-bois')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Colle à bois', '', 'unité', 2800, 'materiaux', false, '', true, 'ci_menuisier-10-colle-a-bois')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Vernis', '', 'litre', 4500, 'finition', false, '', true, 'ci_menuisier-11-vernis')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Main-d’œuvre menuiserie', '', 'forfait', 95000, 'services', true, '', true, 'ci_menuisier-12-main-d-uvre-menuiserie')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Pose', '', 'unité', 15000, 'services', false, '', true, 'ci_menuisier-13-pose')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Carrelage 40x40', '', 'm2', 6500, 'materiaux', true, 'carrelage carreau sol', true, 'ci_carreleur-0-carrelage-40x40')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Carrelage 60x60', '', 'm2', 9500, 'materiaux', true, '', true, 'ci_carreleur-1-carrelage-60x60')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Faïence murale', '', 'm2', 7800, 'materiaux', false, '', true, 'ci_carreleur-2-faience-murale')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Colle à carrelage', '', 'sac', 4800, 'materiaux', true, '', true, 'ci_carreleur-3-colle-a-carrelage')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Joint de carrelage', '', 'sac', 3500, 'materiaux', false, '', true, 'ci_carreleur-4-joint-de-carrelage')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Croisillons', '', 'unité', 1500, 'materiaux', false, '', true, 'ci_carreleur-5-croisillons')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Plinthe', '', 'm', 1800, 'materiaux', false, '', true, 'ci_carreleur-6-plinthe')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Ciment CPJ 45', '', 'sac', 5500, 'materiaux', false, '', true, 'ci_carreleur-7-ciment-cpj-45')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Sable', '', 'voyage', 35000, 'materiaux', false, '', true, 'ci_carreleur-8-sable')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Meuleuse', '', 'unité', 35000, 'outillage', false, '', true, 'ci_carreleur-9-meuleuse')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Main-d’œuvre carrelage', '', 'forfait', 65000, 'services', true, '', true, 'ci_carreleur-10-main-d-uvre-carrelage')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Pose carrelage', '', 'm2', 2500, 'services', true, '', true, 'ci_carreleur-11-pose-carrelage')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Fer 12', '', 'barre', 9500, 'materiaux', true, '', true, 'ci_soudeur-0-fer-12')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Fer 16', '', 'barre', 16500, 'materiaux', true, '', true, 'ci_soudeur-1-fer-16')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Fer 20', '', 'barre', 25000, 'materiaux', false, '', true, 'ci_soudeur-2-fer-20')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Fer cornière', '', 'barre', 12500, 'materiaux', false, '', true, 'ci_soudeur-3-fer-corniere')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Tôle', '', 'unité', 22000, 'materiaux', true, 'tole bac', true, 'ci_soudeur-4-tole')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Tube carré', '', 'barre', 8500, 'materiaux', false, '', true, 'ci_soudeur-5-tube-carre')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Électrode', '', 'kg', 3500, 'materiaux', true, '', true, 'ci_soudeur-6-electrode')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Gaz soudure', '', 'unité', 18000, 'materiaux', false, '', true, 'ci_soudeur-7-gaz-soudure')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Disque à tronçonner', '', 'unité', 2500, 'outillage', false, '', true, 'ci_soudeur-8-disque-a-tronconner')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Peinture antirouille', '', 'unité', 9500, 'finition', false, '', true, 'ci_soudeur-9-peinture-antirouille')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Main-d’œuvre soudure', '', 'forfait', 65000, 'services', true, '', true, 'ci_soudeur-10-main-d-uvre-soudure')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Soudure sur site', '', 'heure', 5000, 'services', false, '', true, 'ci_soudeur-11-soudure-sur-site')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Climatiseur 1 CV', '', 'unité', 185000, 'materiaux', true, 'clim split climatiseur', true, 'ci_climaticien-0-climatiseur-1-cv')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Climatiseur 1,5 CV', '', 'unité', 235000, 'materiaux', true, '', true, 'ci_climaticien-1-climatiseur-1-5-cv')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Climatiseur 2 CV', '', 'unité', 320000, 'materiaux', false, '', true, 'ci_climaticien-2-climatiseur-2-cv')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Support climatiseur', '', 'unité', 12000, 'materiaux', false, '', true, 'ci_climaticien-3-support-climatiseur')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Tuyau cuivre', '', 'm', 6500, 'materiaux', true, '', true, 'ci_climaticien-4-tuyau-cuivre')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Gaz R410', '', 'kg', 15000, 'materiaux', false, '', true, 'ci_climaticien-5-gaz-r410')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Câble 2,5', '', 'rouleau', 18500, 'electrique', false, '', true, 'ci_climaticien-6-cable-2-5')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Disjoncteur', '', 'unité', 6500, 'electrique', false, '', true, 'ci_climaticien-7-disjoncteur')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Télécommande', '', 'unité', 8500, 'materiaux', false, '', true, 'ci_climaticien-8-telecommande')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Main-d’œuvre climatisation', '', 'forfait', 45000, 'services', true, '', true, 'ci_climaticien-9-main-d-uvre-climatisation')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Entretien climatiseur', '', 'unité', 15000, 'services', true, '', true, 'ci_climaticien-10-entretien-climatiseur')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Recharge gaz', '', 'unité', 25000, 'services', false, '', true, 'ci_climaticien-11-recharge-gaz')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Huile moteur', '', 'litre', 4500, 'materiaux', true, 'huile vidange', true, 'ci_mecanicien-0-huile-moteur')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Filtre à huile', '', 'unité', 6500, 'materiaux', true, '', true, 'ci_mecanicien-1-filtre-a-huile')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Filtre à air', '', 'unité', 8500, 'materiaux', false, '', true, 'ci_mecanicien-2-filtre-a-air')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Filtre à gasoil', '', 'unité', 9500, 'materiaux', false, '', true, 'ci_mecanicien-3-filtre-a-gasoil')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Plaquettes de frein', '', 'unité', 12500, 'materiaux', true, '', true, 'ci_mecanicien-4-plaquettes-de-frein')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Bougie', '', 'unité', 4500, 'materiaux', false, '', true, 'ci_mecanicien-5-bougie')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Batterie', '', 'unité', 55000, 'materiaux', true, '', true, 'ci_mecanicien-6-batterie')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Courroie', '', 'unité', 15000, 'materiaux', false, '', true, 'ci_mecanicien-7-courroie')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Pneu', '', 'unité', 45000, 'materiaux', false, '', true, 'ci_mecanicien-8-pneu')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Liquide de frein', '', 'litre', 3500, 'materiaux', false, '', true, 'ci_mecanicien-9-liquide-de-frein')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Main-d’œuvre mécanique', '', 'forfait', 25000, 'services', true, '', true, 'ci_mecanicien-10-main-d-uvre-mecanique')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Diagnostic', '', 'forfait', 10000, 'services', true, '', true, 'ci_mecanicien-11-diagnostic')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Sortie véhicule', '', 'forfait', 15000, 'services', false, '', true, 'ci_mecanicien-12-sortie-vehicule')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Ciment CPJ 45', '', 'sac', 5500, 'materiaux', true, '', true, 'ci_quincaillier-0-ciment-cpj-45')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Fer 6', '', 'barre', 2500, 'materiaux', true, '', true, 'ci_quincaillier-1-fer-6')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Fer 8', '', 'barre', 4500, 'materiaux', true, '', true, 'ci_quincaillier-2-fer-8')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Fer 10', '', 'barre', 6500, 'materiaux', false, '', true, 'ci_quincaillier-3-fer-10')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Fer 12', '', 'barre', 9500, 'materiaux', false, '', true, 'ci_quincaillier-4-fer-12')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Agglo 15', '', 'unité', 350, 'materiaux', true, '', true, 'ci_quincaillier-5-agglo-15')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Agglo 20', '', 'unité', 425, 'materiaux', false, '', true, 'ci_quincaillier-6-agglo-20')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Tube PVC 32', '', 'barre', 4200, 'sanitaire', false, '', true, 'ci_quincaillier-7-tube-pvc-32')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Robinet', '', 'unité', 8500, 'sanitaire', false, '', true, 'ci_quincaillier-8-robinet')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Câble 1,5', '', 'rouleau', 12500, 'electrique', false, '', true, 'ci_quincaillier-9-cable-1-5')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Câble 2,5', '', 'rouleau', 18500, 'electrique', false, '', true, 'ci_quincaillier-10-cable-2-5')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Prise', '', 'unité', 1800, 'electrique', false, '', true, 'ci_quincaillier-11-prise')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Interrupteur', '', 'unité', 1500, 'electrique', false, '', true, 'ci_quincaillier-12-interrupteur')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Ampoule LED', '', 'unité', 1500, 'electrique', false, '', true, 'ci_quincaillier-13-ampoule-led')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Peinture acrylique', '', 'unité', 18500, 'finition', false, '', true, 'ci_quincaillier-14-peinture-acrylique')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Marteau', '', 'unité', 5500, 'outillage', false, '', true, 'ci_quincaillier-15-marteau')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Truelle', '', 'unité', 2500, 'outillage', false, '', true, 'ci_quincaillier-16-truelle')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Mètre ruban', '', 'unité', 2200, 'outillage', false, '', true, 'ci_quincaillier-17-metre-ruban')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Niveau à bulle', '', 'unité', 6500, 'outillage', false, '', true, 'ci_quincaillier-18-niveau-a-bulle')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Pelle', '', 'unité', 4500, 'outillage', false, '', true, 'ci_quincaillier-19-pelle')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Brouette', '', 'unité', 35000, 'outillage', false, '', true, 'ci_quincaillier-20-brouette')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Livraison', '', 'forfait', 15000, 'services', false, '', true, 'ci_quincaillier-21-livraison')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'commercant', 'Article divers', '', 'unité', 5000, 'divers', true, '', true, 'ci_commercant-0-article-divers')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'commercant', 'Sac de riz 50 kg', '', 'sac', 32000, 'divers', true, '', true, 'ci_commercant-1-sac-de-riz-50-kg')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'commercant', 'Huile 5 L', '', 'unité', 8500, 'divers', false, '', true, 'ci_commercant-2-huile-5-l')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'commercant', 'Carton de savon', '', 'carton', 12000, 'divers', false, '', true, 'ci_commercant-3-carton-de-savon')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'commercant', 'Bouteille d’eau', '', 'unité', 300, 'divers', false, '', true, 'ci_commercant-4-bouteille-d-eau')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'commercant', 'Boîte de tomate', '', 'carton', 15000, 'divers', false, '', true, 'ci_commercant-5-boite-de-tomate')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'commercant', 'Spaghetti (carton)', '', 'carton', 9000, 'divers', false, '', true, 'ci_commercant-6-spaghetti-carton')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'commercant', 'Sucre 50 kg', '', 'sac', 35000, 'divers', false, '', true, 'ci_commercant-7-sucre-50-kg')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'commercant', 'Livraison', '', 'forfait', 15000, 'services', false, '', true, 'ci_commercant-8-livraison')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'autre', 'Fourniture', '', 'forfait', 25000, 'divers', true, '', true, 'ci_autre-0-fourniture')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'autre', 'Main-d’œuvre', '', 'forfait', 100000, 'services', true, '', true, 'ci_autre-1-main-d-uvre')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'autre', 'Transport', '', 'forfait', 15000, 'services', false, '', true, 'ci_autre-2-transport')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;

-- Note : les prix ci-dessus sont des repères indicatifs pour le Togo ;
-- chaque entreprise peut les modifier, la modification ne touche jamais
-- un document déjà créé (les lignes enregistrent leur propre prix).
