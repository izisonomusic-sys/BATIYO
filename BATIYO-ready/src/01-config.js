/* =========================================================================
   BATIYO — 01. CONFIGURATION GÉNÉRALE
   Constantes produit, unités, catégories, statuts, paramètres par défaut.
   ========================================================================= */
(function (B) {
  'use strict';

  B.VERSION = '1.0.0-mvp';
  B.STORAGE_KEY = 'batiyo.db.v1';
  B.SESSION_KEY = 'batiyo.session.v1';
  B.CURRENCY = 'FCFA';
  B.LOCALE = 'fr-FR';

  /* ------------------------------- Unités (#31) --------------------------- */
  B.UNITS = [
    { id: 'sac', label: 'sac' },
    { id: 'barre', label: 'barre' },
    { id: 'kg', label: 'kg' },
    { id: 'tonne', label: 'tonne' },
    { id: 'm', label: 'mètre' },
    { id: 'm2', label: 'm²' },
    { id: 'm3', label: 'm³' },
    { id: 'litre', label: 'litre' },
    { id: 'voyage', label: 'voyage' },
    { id: 'heure', label: 'heure' },
    { id: 'jour', label: 'jour' },
    { id: 'forfait', label: 'forfait' },
    { id: 'unite', label: 'unité' },
    { id: 'carton', label: 'carton' },
    { id: 'rouleau', label: 'rouleau' },
    { id: 'piece', label: 'pièce' }
  ];
  B.unitLabel = function (id) {
    const u = B.UNITS.find(function (x) { return x.id === id || x.label === id; });
    return u ? u.label : (id || 'unité');
  };

  /* ------------------------- Catégories de dépenses (#52) ----------------- */
  B.EXPENSE_CATEGORIES = [
    { id: 'materiaux', label: 'Matériaux', icon: 'brick' },
    { id: 'main_oeuvre', label: 'Main-d’œuvre', icon: 'users' },
    { id: 'transport', label: 'Transport', icon: 'truck' },
    { id: 'carburant', label: 'Carburant', icon: 'fuel' },
    { id: 'outillage', label: 'Outillage', icon: 'tool' },
    { id: 'fournitures', label: 'Fournitures', icon: 'box' },
    { id: 'autres', label: 'Autres', icon: 'dots' }
  ];
  B.expenseCategory = function (id) {
    return B.EXPENSE_CATEGORIES.find(function (c) { return c.id === id; }) || { id: id, label: id || 'Autres', icon: 'dots' };
  };

  /* Budget : correspondance catégorie de dépense -> poste budgétaire */
  B.BUDGET_LINES = ['ciment', 'fer', 'sable', 'gravier', 'main_oeuvre', 'transport', 'autres'];
  B.budgetLineLabel = function (id) {
    const map = {
      ciment: 'Ciment', fer: 'Fer', sable: 'Sable', gravier: 'Gravier',
      main_oeuvre: 'Main-d’œuvre', transport: 'Transport', autres: 'Autres'
    };
    return map[id] || id;
  };

  /* ------------------------------- Statuts -------------------------------- */
  B.QUOTE_STATUSES = [
    { id: 'brouillon', label: 'Brouillon', tone: 'neutral' },
    { id: 'envoye', label: 'Envoyé', tone: 'info' },
    { id: 'vu', label: 'Vu', tone: 'info' },
    { id: 'accepte', label: 'Accepté', tone: 'success' },
    { id: 'refuse', label: 'Refusé', tone: 'danger' },
    { id: 'converti', label: 'Converti en facture', tone: 'accent' },
    { id: 'expire', label: 'Expiré', tone: 'warn' }
  ];
  B.INVOICE_STATUSES = [
    { id: 'brouillon', label: 'Brouillon', tone: 'neutral' },
    { id: 'emise', label: 'Émise', tone: 'info' },
    { id: 'partielle', label: 'Partiellement payée', tone: 'warn' },
    { id: 'payee', label: 'Payée', tone: 'success' },
    { id: 'en_retard', label: 'En retard', tone: 'danger' },
    { id: 'annulee', label: 'Annulée', tone: 'neutral' }
  ];
  B.PROJECT_STATUSES = [
    { id: 'planifie', label: 'Planifié', tone: 'info' },
    { id: 'en_cours', label: 'En cours', tone: 'accent' },
    { id: 'termine', label: 'Terminé', tone: 'success' },
    { id: 'annule', label: 'Annulé', tone: 'neutral' }
  ];
  B.status = function (list, id) {
    return list.find(function (s) { return s.id === id; }) || { id: id, label: id, tone: 'neutral' };
  };

  /* --------------------------- Paramètres (#240) -------------------------- */
  B.defaultSettings = function () {
    return {
      currency: 'FCFA',
      language: 'fr',
      date_format: 'dd/mm/yyyy',
      tax_enabled: false,
      tax_name: 'TVA',
      tax_rate: 18,
      tax_mode: 'exclusive',      /* exclusive | inclusive | none */
      quote_prefix: 'DEV',
      invoice_prefix: 'FAC',
      project_prefix: 'CH',
      expense_prefix: 'DEP',
      document_footer: 'Merci pour votre confiance.',
      payment_terms: 'Acompte 50 % à la commande, solde à la livraison.',
      valid_days: 30,
      notifications: { budget: true, documents: true, assistant: true }
    };
  };

  /* ------------------------------ Routes (#168) --------------------------- */
  B.PUBLIC_ROUTES = ['/', '/login', '/register', '/onboarding', '/pricing', '/faq', '/legal/terms', '/legal/privacy', '/legal/notice'];
  B.APP_ROUTES = ['/dashboard', '/clients', '/catalog', '/quotes', '/invoices', '/projects', '/expenses', '/documents', '/analysis', '/assistant', '/profile', '/settings'];

  /* ------------------------------- Divers -------------------------------- */
  B.PROGRESS_STEPS = [0, 25, 50, 75, 100];
  B.ACTIVE_PROJECT_STATUSES = ['planifie', 'en_cours'];
})(globalThis.BATIYO = globalThis.BATIYO || {});
