/* =========================================================================
   BATIYO — 02. MÉTIERS, CATALOGUES, BUDGETS TYPES, MODÈLES
   Le métier est la donnée centrale (#16, #228, #244, #326).
   Ajouter un métier = ajouter un objet ici (#245).
   ========================================================================= */
(function (B) {
  'use strict';

  /* Helper de création d'un article de catalogue */
  function item(name, unit, price, category, opts) {
    const extra = opts || {};
    return {
      id: null,                       /* généré à l'installation */
      name: name,
      unit: unit,
      default_price: price || 0,
      category: category || 'materiaux',
      favorite: !!extra.favorite,
      keywords: extra.keywords || '',
      active: true
    };
  }

  /* -------------------------------------------------------------------------
     CATÉGORIES DE CATALOGUE (catalog_categories)
     ------------------------------------------------------------------------- */
  B.CATALOG_CATEGORIES = [
    { id: 'materiaux', label: 'Matériaux', icon: 'brick' },
    { id: 'services', label: 'Services', icon: 'hammer' },
    { id: 'sanitaire', label: 'Sanitaire', icon: 'drop' },
    { id: 'electrique', label: 'Électrique', icon: 'bolt' },
    { id: 'finition', label: 'Finition', icon: 'brush' },
    { id: 'outillage', label: 'Outillage', icon: 'tool' },
    { id: 'divers', label: 'Divers', icon: 'box' }
  ];
  B.catalogCategory = function (id) {
    return B.CATALOG_CATEGORIES.find(function (c) { return c.id === id; }) || { id: id, label: id || 'Divers', icon: 'box' };
  };

  /* -------------------------------------------------------------------------
     MÉTIERS
     mode: artisan (orienté chantier) | commerce (orienté catalogue/vente) [#247]
     ------------------------------------------------------------------------- */
  B.PROFESSIONS = [
    /* ---------------------------------- MAÇON ---------------------------- */
    {
      id: 'maçon', slug: 'macon', name: 'Maçon', icon: 'brick', mode: 'artisan', active: true, flagship: true,
      description: 'Gros œuvre, maçonnerie, dalles et fondations.',
      dashboard_focus: ['projects', 'quotes', 'expenses'],
      budget_profile: { ciment: 24, fer: 17, sable: 9, gravier: 8, main_oeuvre: 31, transport: 6, autres: 5 },
      service_line: 'Main-d’œuvre maçonnerie',
      templates: [
        { id: 'mur', name: 'Devis construction mur', hint: 'Agglos, ciment, fer, sable, main-d’œuvre',
          items: [
            { name: 'Agglo 15', qty: 800, unit: 'unité' },
            { name: 'Ciment CPJ 45', qty: 25, unit: 'sac' },
            { name: 'Sable', qty: 3, unit: 'voyage' },
            { name: 'Fer 8', qty: 20, unit: 'barre' },
            { name: 'Main-d’œuvre maçonnerie', qty: 1, unit: 'forfait' }
          ], budget: { ciment: 140000, fer: 90000, sable: 105000, gravier: 0, main_oeuvre: 250000, transport: 40000, autres: 30000 } },
        { id: 'dalle', name: 'Devis dalle béton', hint: 'Béton, ferraillage, coffrage',
          items: [
            { name: 'Ciment CPJ 45', qty: 60, unit: 'sac' },
            { name: 'Sable', qty: 6, unit: 'voyage' },
            { name: 'Gravier 15/25', qty: 8, unit: 'voyage' },
            { name: 'Fer 10', qty: 60, unit: 'barre' },
            { name: 'Coffrage', qty: 1, unit: 'forfait' },
            { name: 'Main-d’œuvre maçonnerie', qty: 1, unit: 'forfait' }
          ], budget: { ciment: 335000, fer: 330000, sable: 210000, gravier: 220000, main_oeuvre: 450000, transport: 90000, autres: 60000 } }
      ],
      items: [
        item('Ciment CPJ 45', 'sac', 5500, 'materiaux', { favorite: true, keywords: 'ciment cpj sac liant' }),
        item('Ciment CPA 45', 'sac', 6200, 'materiaux', { keywords: 'ciment cpa sac' }),
        item('Sable', 'voyage', 35000, 'materiaux', { favorite: true }),
        item('Sable fin', 'm3', 9000, 'materiaux'),
        item('Gravier 15/25', 'voyage', 48000, 'materiaux', { favorite: true, keywords: 'gravier cailloux beton' }),
        item('Gravier 5/15', 'voyage', 45000, 'materiaux'),
        item('Fer 6', 'barre', 2500, 'materiaux', { favorite: true, keywords: 'fer a beton rond' }),
        item('Fer 8', 'barre', 4500, 'materiaux', { favorite: true }),
        item('Fer 10', 'barre', 6500, 'materiaux', { favorite: true }),
        item('Fer 12', 'barre', 9500, 'materiaux'),
        item('Fer 14', 'barre', 12500, 'materiaux'),
        item('Fer 16', 'barre', 16500, 'materiaux'),
        item('Agglo 10', 'unité', 275, 'materiaux', { keywords: 'agglo bloc parpaing' }),
        item('Agglo 15', 'unité', 350, 'materiaux', { favorite: true, keywords: 'agglo bloc parpaing' }),
        item('Agglo 20', 'unité', 425, 'materiaux', { keywords: 'agglo bloc parpaing' }),
        item('Brique rouge', 'unité', 200, 'materiaux'),
        item('Coffrage', 'forfait', 35000, 'services'),
        item('Main-d’œuvre maçonnerie', 'forfait', 150000, 'services', { favorite: true, keywords: 'main oeuvre macon' }),
        item('Transport', 'voyage', 15000, 'services', { favorite: true })
      ]
    },

    /* -------------------------------- PLOMBIER --------------------------- */
    {
      id: 'plombier', slug: 'plombier', name: 'Plombier', icon: 'drop', mode: 'artisan', active: true, flagship: true,
      description: 'Installation et réparation sanitaire.',
      dashboard_focus: ['quotes', 'projects', 'expenses'],
      budget_profile: { ciment: 5, fer: 3, sable: 4, gravier: 3, main_oeuvre: 62, transport: 11, autres: 12 },
      service_line: 'Main-d’œuvre plomberie',
      templates: [
        { id: 'sdb', name: 'Devis installation sanitaire', hint: 'Tuyaux, raccords, pose',
          items: [
            { name: 'PVC 32', qty: 30, unit: 'barre' },
            { name: 'Coude', qty: 25, unit: 'unité' },
            { name: 'Té', qty: 15, unit: 'unité' },
            { name: 'Colle PVC', qty: 4, unit: 'unité' },
            { name: 'Robinet', qty: 4, unit: 'unité' },
            { name: 'Main-d’œuvre plomberie', qty: 1, unit: 'forfait' }
          ], budget: { ciment: 25000, main_oeuvre: 260000, transport: 40000, autres: 60000, fer: 0, sable: 0, gravier: 0 } }
      ],
      items: [
        item('PVC 20', 'barre', 2200, 'sanitaire', { keywords: 'tube pvc tuyau' }),
        item('PVC 25', 'barre', 3000, 'sanitaire'),
        item('PVC 32', 'barre', 4200, 'sanitaire', { favorite: true }),
        item('PVC 40', 'barre', 6000, 'sanitaire'),
        item('Coude', 'unité', 550, 'sanitaire', { favorite: true }),
        item('Té', 'unité', 750, 'sanitaire', { favorite: true }),
        item('Vanne', 'unité', 3500, 'sanitaire'),
        item('Robinet', 'unité', 8500, 'sanitaire', { favorite: true }),
        item('Flexible', 'unité', 1500, 'sanitaire'),
        item('Joint', 'unité', 250, 'sanitaire'),
        item('Colle PVC', 'unité', 3200, 'sanitaire'),
        item('PPR 20', 'barre', 3800, 'sanitaire'),
        item('PPR 25', 'barre', 5200, 'sanitaire'),
        item('Chauffe-eau', 'unité', 95000, 'sanitaire'),
        item('WC complet', 'unité', 85000, 'sanitaire'),
        item('Lavabo', 'unité', 45000, 'sanitaire'),
        item('Main-d’œuvre plomberie', 'forfait', 85000, 'services', { favorite: true }),
        item('Pose', 'unité', 12000, 'services', { favorite: true }),
        item('Déplacement', 'forfait', 5000, 'services')
      ]
    },

    /* ------------------------------- ÉLECTRICIEN ------------------------- */
    {
      id: 'electricien', slug: 'electricien', name: 'Électricien', icon: 'bolt', mode: 'artisan', active: true, flagship: true,
      description: 'Installation et dépannage électrique.',
      dashboard_focus: ['quotes', 'projects', 'expenses'],
      budget_profile: { ciment: 5, fer: 6, sable: 3, gravier: 3, main_oeuvre: 58, transport: 11, autres: 14 },
      service_line: 'Main-d’œuvre électricité',
      templates: [
        { id: 'tableau', name: 'Devis installation électrique', hint: 'Câbles, appareillage, tableau',
          items: [
            { name: 'Câble 1,5', qty: 5, unit: 'rouleau' },
            { name: 'Câble 2,5', qty: 4, unit: 'rouleau' },
            { name: 'Gaine', qty: 40, unit: 'barre' },
            { name: 'Tableau électrique', qty: 1, unit: 'unité' },
            { name: 'Disjoncteur', qty: 8, unit: 'unité' },
            { name: 'Prise', qty: 12, unit: 'unité' },
            { name: 'Interrupteur', qty: 8, unit: 'unité' },
            { name: 'Main-d’œuvre électricité', qty: 1, unit: 'forfait' }
          ], budget: { ciment: 20000, fer: 30000, main_oeuvre: 280000, transport: 50000, autres: 90000, sable: 0, gravier: 0 } }
      ],
      items: [
        item('Câble 1,5', 'rouleau', 12500, 'electrique', { favorite: true, keywords: 'cable fil souple' }),
        item('Câble 2,5', 'rouleau', 18500, 'electrique', { favorite: true }),
        item('Câble 4', 'rouleau', 26000, 'electrique'),
        item('Câble 6', 'rouleau', 38000, 'electrique'),
        item('Disjoncteur', 'unité', 6500, 'electrique', { favorite: true }),
        item('Prise', 'unité', 1800, 'electrique', { favorite: true }),
        item('Interrupteur', 'unité', 1500, 'electrique', { favorite: true }),
        item('Gaine', 'barre', 750, 'electrique'),
        item('Boîte d’encastrement', 'unité', 350, 'electrique'),
        item('Tableau électrique', 'unité', 45000, 'electrique'),
        item('Ampoule LED', 'unité', 1500, 'electrique'),
        item('Réglette LED', 'unité', 9500, 'electrique'),
        item('Douille', 'unité', 800, 'electrique'),
        item('Domino', 'unité', 150, 'electrique'),
        item('Main-d’œuvre électricité', 'forfait', 75000, 'services', { favorite: true }),
        item('Installation', 'unité', 5000, 'services'),
        item('Dépannage', 'forfait', 15000, 'services', { favorite: true })
      ]
    },

    /* --------------------------------- PEINTRE --------------------------- */
    {
      id: 'peintre', slug: 'peintre', name: 'Peintre', icon: 'brush', mode: 'artisan', active: true, flagship: true,
      description: 'Peinture intérieure et extérieure, finitions.',
      dashboard_focus: ['quotes', 'expenses', 'projects'],
      budget_profile: { ciment: 6, fer: 2, sable: 3, gravier: 2, main_oeuvre: 55, transport: 10, autres: 22 },
      service_line: 'Main-d’œuvre peinture',
      templates: [
        { id: 'appart', name: 'Devis peinture appartement', hint: 'Peinture, enduit, préparation',
          items: [
            { name: 'Peinture acrylique', qty: 12, unit: 'unité' },
            { name: 'Sous-couche', qty: 6, unit: 'unité' },
            { name: 'Enduit de lissage', qty: 15, unit: 'sac' },
            { name: 'Papier abrasif', qty: 20, unit: 'unité' },
            { name: 'Préparation des supports', qty: 1, unit: 'forfait' },
            { name: 'Main-d’œuvre peinture', qty: 1, unit: 'forfait' }
          ], budget: { ciment: 30000, main_oeuvre: 220000, transport: 35000, autres: 90000, fer: 0, sable: 0, gravier: 0 } }
      ],
      items: [
        item('Peinture acrylique', 'unité', 18500, 'finition', { favorite: true, keywords: 'peinture pot seau' }),
        item('Peinture à l’huile', 'unité', 22000, 'finition'),
        item('Sous-couche', 'unité', 14500, 'finition', { favorite: true }),
        item('Enduit de lissage', 'sac', 6500, 'finition', { favorite: true }),
        item('Mastic', 'kg', 1800, 'finition'),
        item('Rouleau', 'unité', 2500, 'outillage', { favorite: true }),
        item('Pinceau', 'unité', 1200, 'outillage'),
        item('Brosse', 'unité', 1000, 'outillage'),
        item('Papier abrasif', 'unité', 500, 'outillage'),
        item('Bâche de protection', 'unité', 3500, 'outillage'),
        item('Diluant', 'litre', 2200, 'finition'),
        item('Préparation des supports', 'm2', 1200, 'services', { favorite: true }),
        item('Finition', 'm2', 1500, 'services'),
        item('Main-d’œuvre peinture', 'forfait', 45000, 'services', { favorite: true })
      ]
    },

    /* -------------------------------- MENUISIER -------------------------- */
    {
      id: 'menuisier', slug: 'menuisier', name: 'Menuisier', icon: 'hammer', mode: 'artisan', active: true,
      description: 'Bois, portes, fenêtres et agencement.',
      dashboard_focus: ['quotes', 'projects', 'expenses'],
      budget_profile: { ciment: 5, fer: 8, sable: 4, gravier: 3, main_oeuvre: 52, transport: 13, autres: 15 },
      service_line: 'Main-d’œuvre menuiserie',
      templates: [
        { id: 'bois', name: 'Devis menuiserie bois', hint: 'Bois, quincaillerie, pose',
          items: [
            { name: 'Planche', qty: 30, unit: 'unité' },
            { name: 'Bois chevron', qty: 40, unit: 'unité' },
            { name: 'Contreplaqué', qty: 8, unit: 'unité' },
            { name: 'Charnière', qty: 12, unit: 'unité' },
            { name: 'Main-d’œuvre menuiserie', qty: 1, unit: 'forfait' }
          ], budget: { ciment: 20000, fer: 40000, main_oeuvre: 260000, transport: 60000, autres: 80000, sable: 0, gravier: 0 } }
      ],
      items: [
        item('Planche', 'unité', 6500, 'materiaux', { favorite: true, keywords: 'planche bois' }),
        item('Bois chevron', 'unité', 4500, 'materiaux'),
        item('Contreplaqué', 'unité', 18500, 'materiaux', { favorite: true }),
        item('MDF', 'unité', 22000, 'materiaux'),
        item('Porte bois', 'unité', 45000, 'materiaux', { favorite: true }),
        item('Cadre de porte', 'unité', 25000, 'materiaux'),
        item('Charnière', 'unité', 1200, 'materiaux'),
        item('Serrure', 'unité', 12500, 'materiaux', { favorite: true }),
        item('Poignée', 'unité', 3500, 'materiaux'),
        item('Vis à bois', 'kg', 2200, 'materiaux'),
        item('Colle à bois', 'unité', 2800, 'materiaux'),
        item('Vernis', 'litre', 4500, 'finition'),
        item('Main-d’œuvre menuiserie', 'forfait', 95000, 'services', { favorite: true }),
        item('Pose', 'unité', 15000, 'services')
      ]
    },

    /* -------------------------------- CARRELEUR -------------------------- */
    {
      id: 'carreleur', slug: 'carreleur', name: 'Carreleur', icon: 'grid', mode: 'artisan', active: true,
      description: 'Pose de carrelage et faïence.',
      dashboard_focus: ['quotes', 'expenses', 'projects'],
      budget_profile: { ciment: 22, fer: 3, sable: 8, gravier: 4, main_oeuvre: 47, transport: 8, autres: 8 },
      service_line: 'Main-d’œuvre carrelage',
      templates: [
        { id: 'sol', name: 'Devis pose carrelage', hint: 'Carrelage, colle, joint',
          items: [
            { name: 'Carrelage 40x40', qty: 90, unit: 'm2' },
            { name: 'Colle à carrelage', qty: 25, unit: 'sac' },
            { name: 'Joint de carrelage', qty: 12, unit: 'sac' },
            { name: 'Croisillons', qty: 10, unit: 'unité' },
            { name: 'Main-d’œuvre carrelage', qty: 1, unit: 'forfait' }
          ], budget: { ciment: 100000, main_oeuvre: 180000, transport: 30000, autres: 40000, fer: 0, sable: 0, gravier: 0 } }
      ],
      items: [
        item('Carrelage 40x40', 'm2', 6500, 'materiaux', { favorite: true, keywords: 'carrelage carreau sol' }),
        item('Carrelage 60x60', 'm2', 9500, 'materiaux', { favorite: true }),
        item('Faïence murale', 'm2', 7800, 'materiaux'),
        item('Colle à carrelage', 'sac', 4800, 'materiaux', { favorite: true }),
        item('Joint de carrelage', 'sac', 3500, 'materiaux'),
        item('Croisillons', 'unité', 1500, 'materiaux'),
        item('Plinthe', 'm', 1800, 'materiaux'),
        item('Ciment CPJ 45', 'sac', 5500, 'materiaux'),
        item('Sable', 'voyage', 35000, 'materiaux'),
        item('Meuleuse', 'unité', 35000, 'outillage'),
        item('Main-d’œuvre carrelage', 'forfait', 65000, 'services', { favorite: true }),
        item('Pose carrelage', 'm2', 2500, 'services', { favorite: true })
      ]
    },

    /* --------------------------------- SOUDEUR --------------------------- */
    {
      id: 'soudeur', slug: 'soudeur', name: 'Soudeur', icon: 'flame', mode: 'artisan', active: true,
      description: 'Métallerie, portails et structures métalliques.',
      dashboard_focus: ['quotes', 'expenses', 'projects'],
      budget_profile: { ciment: 6, fer: 40, sable: 3, gravier: 3, main_oeuvre: 33, transport: 8, autres: 7 },
      service_line: 'Main-d’œuvre soudure',
      templates: [
        { id: 'portail', name: 'Devis portail métallique', hint: 'Fer, peinture, soudure',
          items: [
            { name: 'Fer 12', qty: 35, unit: 'barre' },
            { name: 'Fer 16', qty: 12, unit: 'barre' },
            { name: 'Fer cornière', qty: 10, unit: 'barre' },
            { name: 'Électrode', qty: 8, unit: 'kg' },
            { name: 'Peinture antirouille', qty: 6, unit: 'unité' },
            { name: 'Main-d’œuvre soudure', qty: 1, unit: 'forfait' }
          ], budget: { ciment: 25000, fer: 320000, main_oeuvre: 150000, transport: 40000, autres: 50000, sable: 0, gravier: 0 } }
      ],
      items: [
        item('Fer 12', 'barre', 9500, 'materiaux', { favorite: true }),
        item('Fer 16', 'barre', 16500, 'materiaux', { favorite: true }),
        item('Fer 20', 'barre', 25000, 'materiaux'),
        item('Fer cornière', 'barre', 12500, 'materiaux'),
        item('Tôle', 'unité', 22000, 'materiaux', { favorite: true, keywords: 'tole bac' }),
        item('Tube carré', 'barre', 8500, 'materiaux'),
        item('Électrode', 'kg', 3500, 'materiaux', { favorite: true }),
        item('Gaz soudure', 'unité', 18000, 'materiaux'),
        item('Disque à tronçonner', 'unité', 2500, 'outillage'),
        item('Peinture antirouille', 'unité', 9500, 'finition'),
        item('Main-d’œuvre soudure', 'forfait', 65000, 'services', { favorite: true }),
        item('Soudure sur site', 'heure', 5000, 'services')
      ]
    },

    /* ------------------------------- CLIMATICIEN ------------------------- */
    {
      id: 'climaticien', slug: 'climaticien', name: 'Climaticien', icon: 'wind', mode: 'artisan', active: true,
      description: 'Installation et entretien de climatisation.',
      dashboard_focus: ['quotes', 'expenses', 'projects'],
      budget_profile: { ciment: 4, fer: 5, sable: 2, gravier: 2, main_oeuvre: 52, transport: 13, autres: 22 },
      service_line: 'Main-d’œuvre climatisation',
      templates: [
        { id: 'split', name: 'Devis installation climatiseur', hint: 'Split, supports, mise en service',
          items: [
            { name: 'Climatiseur 1 CV', qty: 2, unit: 'unité' },
            { name: 'Support climatiseur', qty: 2, unit: 'unité' },
            { name: 'Tuyau cuivre', qty: 12, unit: 'm' },
            { name: 'Câble 2,5', qty: 1, unit: 'rouleau' },
            { name: 'Main-d’œuvre climatisation', qty: 1, unit: 'forfait' }
          ], budget: { ciment: 20000, main_oeuvre: 180000, transport: 45000, autres: 120000, fer: 0, sable: 0, gravier: 0 } }
      ],
      items: [
        item('Climatiseur 1 CV', 'unité', 185000, 'materiaux', { favorite: true, keywords: 'clim split climatiseur' }),
        item('Climatiseur 1,5 CV', 'unité', 235000, 'materiaux', { favorite: true }),
        item('Climatiseur 2 CV', 'unité', 320000, 'materiaux'),
        item('Support climatiseur', 'unité', 12000, 'materiaux'),
        item('Tuyau cuivre', 'm', 6500, 'materiaux', { favorite: true }),
        item('Gaz R410', 'kg', 15000, 'materiaux'),
        item('Câble 2,5', 'rouleau', 18500, 'electrique'),
        item('Disjoncteur', 'unité', 6500, 'electrique'),
        item('Télécommande', 'unité', 8500, 'materiaux'),
        item('Main-d’œuvre climatisation', 'forfait', 45000, 'services', { favorite: true }),
        item('Entretien climatiseur', 'unité', 15000, 'services', { favorite: true }),
        item('Recharge gaz', 'unité', 25000, 'services')
      ]
    },

    /* -------------------------------- MÉCANICIEN ------------------------- */
    {
      id: 'mecanicien', slug: 'mecanicien', name: 'Mécanicien', icon: 'wrench', mode: 'artisan', active: true,
      description: 'Réparation et entretien de véhicules.',
      dashboard_focus: ['expenses', 'invoices', 'clients'],
      budget_profile: { ciment: 0, fer: 10, sable: 0, gravier: 0, main_oeuvre: 60, transport: 10, autres: 20 },
      service_line: 'Main-d’œuvre mécanique',
      templates: [
        { id: 'revision', name: 'Devis révision véhicule', hint: 'Vidange, filtres, freins',
          items: [
            { name: 'Huile moteur', qty: 5, unit: 'litre' },
            { name: 'Filtre à huile', qty: 1, unit: 'unité' },
            { name: 'Filtre à air', qty: 1, unit: 'unité' },
            { name: 'Plaquettes de frein', qty: 4, unit: 'unité' },
            { name: 'Main-d’œuvre mécanique', qty: 1, unit: 'forfait' }
          ], budget: { ciment: 0, fer: 10000, sable: 0, gravier: 0, main_oeuvre: 60000, transport: 15000, autres: 40000 } }
      ],
      items: [
        item('Huile moteur', 'litre', 4500, 'materiaux', { favorite: true, keywords: 'huile vidange' }),
        item('Filtre à huile', 'unité', 6500, 'materiaux', { favorite: true }),
        item('Filtre à air', 'unité', 8500, 'materiaux'),
        item('Filtre à gasoil', 'unité', 9500, 'materiaux'),
        item('Plaquettes de frein', 'unité', 12500, 'materiaux', { favorite: true }),
        item('Bougie', 'unité', 4500, 'materiaux'),
        item('Batterie', 'unité', 55000, 'materiaux', { favorite: true }),
        item('Courroie', 'unité', 15000, 'materiaux'),
        item('Pneu', 'unité', 45000, 'materiaux'),
        item('Liquide de frein', 'litre', 3500, 'materiaux'),
        item('Main-d’œuvre mécanique', 'forfait', 25000, 'services', { favorite: true }),
        item('Diagnostic', 'forfait', 10000, 'services', { favorite: true }),
        item('Sortie véhicule', 'forfait', 15000, 'services')
      ]
    },

    /* ------------------------------- QUINCAILLIER ------------------------ */
    {
      id: 'quincaillier', slug: 'quincaillier', name: 'Quincaillier', icon: 'store', mode: 'commerce', active: true,
      description: 'Vente de matériaux, outillage et quincaillerie.',
      dashboard_focus: ['catalog', 'invoices', 'clients'],
      budget_profile: { ciment: 30, fer: 20, sable: 5, gravier: 5, main_oeuvre: 10, transport: 10, autres: 20 },
      service_line: 'Livraison',
      templates: [
        { id: 'chantier', name: 'Facture matériaux de chantier', hint: 'Vente de matériaux',
          items: [
            { name: 'Ciment CPJ 45', qty: 20, unit: 'sac' },
            { name: 'Fer 8', qty: 10, unit: 'barre' },
            { name: 'Agglo 15', qty: 100, unit: 'unité' },
            { name: 'Livraison', qty: 1, unit: 'forfait' }
          ], budget: { ciment: 110000, fer: 45000, sable: 0, gravier: 0, main_oeuvre: 15000, transport: 20000, autres: 20000 } }
      ],
      items: [
        item('Ciment CPJ 45', 'sac', 5500, 'materiaux', { favorite: true }),
        item('Fer 6', 'barre', 2500, 'materiaux', { favorite: true }),
        item('Fer 8', 'barre', 4500, 'materiaux', { favorite: true }),
        item('Fer 10', 'barre', 6500, 'materiaux'),
        item('Fer 12', 'barre', 9500, 'materiaux'),
        item('Agglo 15', 'unité', 350, 'materiaux', { favorite: true }),
        item('Agglo 20', 'unité', 425, 'materiaux'),
        item('Tube PVC 32', 'barre', 4200, 'sanitaire'),
        item('Robinet', 'unité', 8500, 'sanitaire'),
        item('Câble 1,5', 'rouleau', 12500, 'electrique'),
        item('Câble 2,5', 'rouleau', 18500, 'electrique'),
        item('Prise', 'unité', 1800, 'electrique'),
        item('Interrupteur', 'unité', 1500, 'electrique'),
        item('Ampoule LED', 'unité', 1500, 'electrique'),
        item('Peinture acrylique', 'unité', 18500, 'finition'),
        item('Marteau', 'unité', 5500, 'outillage'),
        item('Truelle', 'unité', 2500, 'outillage'),
        item('Mètre ruban', 'unité', 2200, 'outillage'),
        item('Niveau à bulle', 'unité', 6500, 'outillage'),
        item('Pelle', 'unité', 4500, 'outillage'),
        item('Brouette', 'unité', 35000, 'outillage'),
        item('Livraison', 'forfait', 15000, 'services')
      ]
    },

    /* -------------------------------- COMMERÇANT ------------------------- */
    {
      id: 'commercant', slug: 'commercant', name: 'Commerçant', icon: 'cart', mode: 'commerce', active: true,
      description: 'Vente de produits et marchandises diverses.',
      dashboard_focus: ['invoices', 'catalog', 'clients'],
      budget_profile: { ciment: 0, fer: 0, sable: 0, gravier: 0, main_oeuvre: 20, transport: 25, autres: 55 },
      service_line: 'Livraison',
      templates: [
        { id: 'vente', name: 'Facture de vente', hint: 'Produits vendus',
          items: [
            { name: 'Article A', qty: 10, unit: 'unité' },
            { name: 'Livraison', qty: 1, unit: 'forfait' }
          ], budget: { ciment: 0, fer: 0, sable: 0, gravier: 0, main_oeuvre: 25000, transport: 25000, autres: 50000 } }
      ],
      items: [
        item('Article divers', 'unité', 5000, 'divers', { favorite: true }),
        item('Sac de riz 50 kg', 'sac', 32000, 'divers', { favorite: true }),
        item('Huile 5 L', 'unité', 8500, 'divers'),
        item('Carton de savon', 'carton', 12000, 'divers'),
        item('Bouteille d’eau', 'unité', 300, 'divers'),
        item('Boîte de tomate', 'carton', 15000, 'divers'),
        item('Spaghetti (carton)', 'carton', 9000, 'divers'),
        item('Sucre 50 kg', 'sac', 35000, 'divers'),
        item('Livraison', 'forfait', 15000, 'services')
      ]
    },

    /* ---------------------------------- AUTRE ---------------------------- */
    {
      id: 'autre', slug: 'autre', name: 'Autre', icon: 'dots', mode: 'artisan', active: true,
      description: 'Autre activité : catalogue à personnaliser.',
      dashboard_focus: ['quotes', 'clients', 'expenses'],
      budget_profile: { ciment: 15, fer: 10, sable: 5, gravier: 5, main_oeuvre: 40, transport: 10, autres: 15 },
      service_line: 'Main-d’œuvre',
      templates: [
        { id: 'generique', name: 'Devis général', hint: 'Prestations et fournitures',
          items: [
            { name: 'Fourniture', qty: 1, unit: 'forfait' },
            { name: 'Main-d’œuvre', qty: 1, unit: 'forfait' }
          ], budget: { ciment: 0, fer: 0, sable: 0, gravier: 0, main_oeuvre: 100000, transport: 20000, autres: 50000 } }
      ],
      items: [
        item('Fourniture', 'forfait', 25000, 'divers', { favorite: true }),
        item('Main-d’œuvre', 'forfait', 100000, 'services', { favorite: true }),
        item('Transport', 'forfait', 15000, 'services')
      ]
    }
  ];

  /* Métiers mis en avant dans le MVP (#11) */
  B.FLAGSHIP_PROFESSIONS = B.PROFESSIONS.filter(function (p) { return p.flagship; }).map(function (p) { return p.id; });

  B.getProfession = function (id) {
    return B.PROFESSIONS.find(function (p) { return p.id === id || p.slug === id; }) || B.PROFESSIONS[0];
  };
  B.professionIcon = function (id) { return B.getProfession(id).icon; };
  B.professionMode = function (id) { return B.getProfession(id).mode; };
  B.templatesFor = function (professionId) { return B.getProfession(professionId).templates || []; };
})(globalThis.BATIYO = globalThis.BATIYO || {});
