/* =========================================================================
   BATIYO — 05. MOTEUR DE CALCUL (#306, #269, #114)
   Toutes les fonctions sont déterministes et pures (#63).
   ========================================================================= */
(function (B) {
  'use strict';

  /* --------------------------------- Lignes ------------------------------ */
  function calculateLineTotal(line) {
    const qty = Number(line && line.quantity) || 0;
    const price = Number(line && line.unit_price) || 0;
    if (qty < 0 || price < 0) return 0;             /* #260 */
    return B.round(qty * price);
  }
  function calculateQuoteLines(lines) {
    const list = (lines || []).map(function (l) {
      return Object.assign({}, l, { total: calculateLineTotal(l) });
    });
    const subtotal = B.round(list.reduce(function (s, l) { return s + l.total; }, 0));
    return { lines: list, subtotal: subtotal };
  }
  function calculateSubtotal(linesOrQuote) {
    if (Array.isArray(linesOrQuote)) return calculateQuoteLines(linesOrQuote).subtotal;
    if (linesOrQuote && Array.isArray(linesOrQuote.lines)) return calculateQuoteLines(linesOrQuote.lines).subtotal;
    return Number(linesOrQuote && linesOrQuote.subtotal) || 0;
  }
  /* Remise : amount (FCFA) ou percent (%) */
  function calculateDiscount(subtotal, discount) {
    const d = discount || {};
    if (!d.value) return 0;
    const raw = d.mode === 'percent' ? subtotal * (Number(d.value) / 100) : Number(d.value);
    return B.round(B.clamp(raw, 0, subtotal));
  }
  function calculateTax(base, settings) {
    const s = settings || {};
    const enabled = s.tax_enabled !== false && Number(s.tax_rate) > 0 && s.tax_mode !== 'none';
    if (!enabled) return 0;
    const rate = Number(s.tax_rate) || 0;
    if (s.tax_mode === 'inclusive') {
      /* Le prix unitaire contient déjà la taxe : on isole la part de taxe */
      return B.round(base - base / (1 + rate / 100));
    }
    return B.round(base * (rate / 100));
  }
  function calculateTotal(subtotal, discountAmount, taxAmount, settings) {
    const base = B.round(Math.max(0, subtotal - discountAmount));
    if (settings && settings.tax_mode === 'inclusive') return B.round(base);
    return B.round(base + taxAmount);
  }
  /* Récapitulatif complet d'un devis / facture (#36) */
  function calculateDocumentTotals(doc, settings) {
    const s = settings || {};
    const calc = calculateQuoteLines(doc && doc.lines);
    const discount = calculateDiscount(calc.subtotal, doc && doc.discount);
    const afterDiscount = B.round(calc.subtotal - discount);
    const tax = calculateTax(afterDiscount, s);
    const total = calculateTotal(calc.subtotal, discount, tax, s);
    const deposit = B.round(Number(doc && doc.deposit) || 0);
    const paid = B.round(
      (doc && doc.payments ? doc.payments.reduce(function (a, p) { return a + (Number(p.amount) || 0); }, 0) : 0) ||
      Number(doc && doc.paid_amount) || 0
    );
    return {
      lines: calc.lines,
      subtotal: calc.subtotal,
      discount: discount,
      discountLabel: discount ? (doc.discount.mode === 'percent' ? doc.discount.value + ' %' : B.money(discount)) : null,
      afterDiscount: afterDiscount,
      tax: tax,
      taxLabel: tax ? (s.tax_name || 'Taxe') + ' ' + (Number(s.tax_rate) || 0) + ' %' : null,
      total: total,
      deposit: deposit,
      balance: B.round(Math.max(0, total - deposit)),
      paid: paid,
      remaining: B.round(Math.max(0, total - paid))
    };
  }

  /* -------------------------------- Chantiers --------------------------- */
  function calculateSums(expenses) {
    return B.round((expenses || []).reduce(function (s, e) { return s + (Number(e.amount) || 0); }, 0));
  }
  function calculateBudgetTotal(budget) {
    if (!budget) return 0;
    if (typeof budget === 'number') return B.round(budget);
    return B.round(Object.keys(budget).reduce(function (s, k) { return s + (Number(budget[k]) || 0); }, 0));
  }
  function calculateBudgetRemaining(budgetTotal, spent) {
    return B.round((Number(budgetTotal) || 0) - (Number(spent) || 0));   /* #269 */
  }
  function calculateEstimatedMargin(quoteTotal, budgetTotal) {
    return B.round((Number(quoteTotal) || 0) - (Number(budgetTotal) || 0)); /* #112, #114 */
  }
  function calculateActualResult(quoteTotal, spent) {
    return B.round((Number(quoteTotal) || 0) - (Number(spent) || 0));   /* #114 */
  }
  function marginRate(value, base) {
    const b = Number(base) || 0;
    return b ? Math.round((Number(value) / b) * 1000) / 10 : 0;
  }
  /* --------------------------------- Écarts ------------------------------ */
  /* Analyse budget / réel par poste (#58) */
  function analyzeBudgetVariance(project, expenses, settings) {
    const budget = project.budget || {};
    const rows = B.BUDGET_LINES.filter(function (line) {
      return (Number(budget[line]) || 0) > 0 || (expenses || []).some(function (e) { return budgetLineOf(e) === line; });
    }).map(function (line) {
      const planned = B.round(Number(budget[line]) || 0);
      const actual = B.round((expenses || [])
        .filter(function (e) { return budgetLineOf(e) === line; })
        .reduce(function (s, e) { return s + (Number(e.amount) || 0); }, 0));
      const variance = B.round(actual - planned);
      const rate = planned > 0 ? Math.round((variance / planned) * 1000) / 10 : (actual > 0 ? 100 : 0);
      return {
        line: line,
        label: B.budgetLineLabel(line),
        planned: planned,
        actual: actual,
        variance: variance,
        rate: rate,
        ratio: planned > 0 ? actual / planned : (actual > 0 ? 1.2 : 0),
        status: budgetStatus(planned, actual)
      };
    });
    const plannedTotal = calculateBudgetTotal(budget);
    const actualTotal = calculateSums(expenses);
    return {
      rows: rows,
      planned_total: plannedTotal,
      actual_total: actualTotal,
      remaining: calculateBudgetRemaining(plannedTotal, actualTotal),
      variance: B.round(actualTotal - plannedTotal),
      rate: plannedTotal > 0 ? Math.round(((actualTotal - plannedTotal) / plannedTotal) * 1000) / 10 : 0,
      status: budgetStatus(plannedTotal, actualTotal)
    };
  }
  function budgetLineOf(expense) {
    const e = expense || {};
    if (e.budget_line && B.BUDGET_LINES.indexOf(e.budget_line) >= 0) return e.budget_line;
    const map = {
      materiaux: 'autres', main_oeuvre: 'main_oeuvre', transport: 'transport',
      carburant: 'transport', outillage: 'autres', fournitures: 'autres', autres: 'autres'
    };
    /* Les catégories de service ou de transport priment : « Transport du sable »
       est une dépense de transport, pas un achat de sable. */
    const direct = { main_oeuvre: 'main_oeuvre', transport: 'transport', carburant: 'transport' }[e.category];
    if (direct) return direct;
    const d = B.normalize(e.description);
    if (/ciment|\bsac/.test(d)) return 'ciment';
    if (/fer|barre|acier/.test(d)) return 'fer';
    if (/sable/.test(d)) return 'sable';
    if (/gravier|caillou/.test(d)) return 'gravier';
    return map[e.category] || 'autres';
  }
  function budgetStatus(planned, actual) {
    if (!planned && !actual) return 'normal';
    if (!planned) return 'normal';
    const r = actual / planned;
    if (r > 1) return 'depassement';
    if (r >= 0.85) return 'attention';
    return 'normal';
  }
  B.BUDGET_STATUS = {
    normal: { id: 'normal', label: 'Normal', tone: 'success', icon: 'check', message: 'Les dépenses restent dans le budget prévu.' },
    attention: { id: 'attention', label: 'Attention', tone: 'warn', icon: 'alert', message: 'Le budget est bientôt atteint.' },
    depassement: { id: 'depassement', label: 'Dépassement', tone: 'danger', icon: 'alert', message: 'Les dépenses dépassent le budget prévu.' }
  };

  /* --------------------------- Synthèse chantier (#312, #114) ------------- */
  function projectSummary(project, expenses, settings) {
    const spent = calculateSums(expenses);
    const budgetTotal = calculateBudgetTotal(project.budget);
    const contract = B.round(Number(project.quote_total) || 0);
    const paid = B.round((project.payments || []).reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0));
    const estimated = calculateEstimatedMargin(contract, budgetTotal);
    const actual = calculateActualResult(contract, spent);
    const analysis = analyzeBudgetVariance(project, expenses, settings);
    const marginAlert = (project.baseline_margin != null && estimated < project.baseline_margin * 0.7);
    return {
      contract: contract,
      budget_total: budgetTotal,
      spent: spent,
      budget_remaining: calculateBudgetRemaining(budgetTotal, spent),
      paid: paid,
      remaining_to_pay: B.round(Math.max(0, contract - paid)),
      estimated_margin: estimated,
      estimated_margin_rate: marginRate(estimated, contract),
      actual_result: actual,
      actual_margin_rate: marginRate(actual, contract),
      variance: analysis.variance,
      variance_rate: analysis.rate,
      status: analysis.status,
      health: healthOf(actual, contract, budgetTotal, spent),
      analysis: analysis,
      margin_alert: marginAlert
    };
  }
  /* Indicateur simple de rentabilité (#205) */
  function healthOf(actual, contract, budgetTotal, spent) {
    const rate = marginRate(actual, contract);
    if (spent > budgetTotal && budgetTotal > 0) return { id: 'risque', label: 'Dépassement budget', tone: 'danger' };
    if (rate >= 20) return { id: 'bonne', label: 'Bonne marge', tone: 'success' };
    if (rate >= 8) return { id: 'attention', label: 'Marge à surveiller', tone: 'warn' };
    return { id: 'faible', label: 'Faible marge', tone: 'danger' };
  }

  /* ------------------------------ Alertes (#57) --------------------------- */
  function buildAlerts(project, summary) {
    const alerts = [];
    (summary.analysis.rows || []).forEach(function (r) {
      if (r.planned > 0 && r.actual > r.planned) {
        alerts.push({
          tone: 'danger', level: 'Dépassement', project_id: project.id, line: r.line,
          title: 'Dépassement — ' + r.label,
          message: 'Les dépenses ' + r.label.toLowerCase() + ' dépassent le budget prévu de ' + Math.abs(r.rate) + ' %.',
          amount: r.variance
        });
      } else if (r.planned > 0 && r.actual / r.planned >= 0.85) {
        alerts.push({
          tone: 'warn', level: 'Attention', project_id: project.id, line: r.line,
          title: 'Attention — ' + r.label,
          message: 'Le budget ' + r.label.toLowerCase() + ' est presque atteint.',
          amount: r.variance
        });
      }
    });
    if (summary.margin_alert) {
      alerts.push({
        tone: 'warn', level: 'Marge', project_id: project.id,
        title: 'Marge prévue en baisse',
        message: 'La marge prévue a diminué en raison des dépenses supplémentaires.'
      });
    }
    if (!alerts.length) {
      alerts.push({
        tone: 'success', level: 'Normal', project_id: project.id, line: null,
        title: 'Budget maîtrisé',
        message: 'Les dépenses restent dans le budget prévu.'
      });
    }
    return alerts;
  }

  /* --------------------------- Répartition budgétaire (#50, #112) --------- */
  /* Construit un budget par poste à partir des lignes d'un devis + profil du métier */
  function budgetFromQuote(quote, lines, profession, settings) {
    const totals = calculateDocumentTotals(Object.assign({}, quote, { lines: lines }), settings || quote.settings || {});
    const ratio = (profession && profession.budget_profile) || B.getProfession(quote.profession_id).budget_profile;
    const total = totals.total;
    const raw = {};
    Object.keys(ratio).forEach(function (k) { raw[k] = (total * ratio[k]) / 100; });
    /* Arrondis à la centaine et ajustement du dernier poste pour tomber juste */
    const keys = Object.keys(raw);
    let acc = 0;
    keys.forEach(function (k, i) {
      if (i < keys.length - 1) { raw[k] = Math.round(raw[k] / 500) * 500; acc += raw[k]; }
      else { raw[k] = Math.round((total - acc) / 500) * 500; }
    });
    return raw;
  }

  /* --------------------------- Tableau de bord (#20) ---------------------- */
  /* Chiffre d'affaires = devis acceptés (non convertis) + factures émises hors devis.
     Les devis convertis sont comptés via leur facture : aucune double comptabilisation. */
  function calculateRevenue(quotes, invoices) {
    const accepted = (quotes || [])
      .filter(function (q) { return q.status === 'accepte'; })
      .reduce(function (s, q) { return s + (Number(q.total) || 0); }, 0);
    const direct = (invoices || [])
      .filter(function (i) { return !i.quote_id && i.status !== 'brouillon' && i.status !== 'annulee'; })
      .reduce(function (s, i) { return s + (Number(i.total) || 0); }, 0);
    return B.round(accepted + direct);
  }
  function dashboardStats(data) {
    const revenue = calculateRevenue(data.quotes, data.invoices);
    const spent = calculateSums(data.expenses);
    const quotesTotal = B.round(data.quotes.reduce(function (s, q) { return s + (Number(q.total) || 0); }, 0));
    let estimated = 0;
    data.projects.forEach(function (p) {
      estimated += calculateEstimatedMargin(p.quote_total, calculateBudgetTotal(p.budget));
    });
    const active = data.projects.filter(function (p) { return B.ACTIVE_PROJECT_STATUSES.indexOf(p.status) >= 0; });
    return {
      revenue: revenue,
      spent: spent,
      margin_estimated: B.round(estimated),
      margin_actual: B.round(revenue - spent),
      quotes_total: quotesTotal,
      active_projects: active.length,
      projects_total: data.projects.length,
      clients: data.clients.length,
      quotes_count: data.quotes.length,
      invoices_count: data.invoices.length,
      unpaid: B.round(data.invoices.reduce(function (s, i) {
        return s + (i.status === 'payee' || i.status === 'annulee' ? 0 : Math.max(0, (Number(i.total) || 0) - (Number(i.paid_amount) || 0)));
      }, 0))
    };
  }

  /* ------------------------------- Analyses ------------------------------- */
  function expensesByCategory(expenses) {
    const map = {};
    (expenses || []).forEach(function (e) {
      const id = e.category || 'autres';
      map[id] = (map[id] || 0) + (Number(e.amount) || 0);
    });
    return Object.keys(map).map(function (id) {
      return { id: id, label: B.expenseCategory(id).label, icon: B.expenseCategory(id).icon, value: B.round(map[id]) };
    }).sort(function (a, b) { return b.value - a.value; });
  }
  function seriesByMonth(items, dateField, amountFn, months) {
    const n = months || 6;
    const out = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = B.toISODate(d).slice(0, 7);
      out.push({ key: key, label: B.monthLabel(key), value: 0 });
    }
    (items || []).forEach(function (it) {
      const key = B.monthKey(it[dateField]);
      const slot = out.find(function (o) { return o.key === key; });
      if (slot) slot.value = B.round(slot.value + (amountFn ? amountFn(it) : Number(it.total) || 0));
    });
    return out;
  }
  function quotesByStatus(quotes) {
    return B.QUOTE_STATUSES.map(function (s) {
      return { id: s.id, label: s.label, tone: s.tone, value: (quotes || []).filter(function (q) { return q.status === s.id; }).length };
    }).filter(function (r) { return r.value > 0; });
  }

  /* Écritures comptables d'une facture (#270) */
  function invoiceSummary(invoice, settings) {
    const paid = B.round(invoice.paid_amount || 0);
    const total = B.round(invoice.total || 0);
    const remaining = B.round(Math.max(0, total - paid));
    let status = invoice.status;
    if (status !== 'annulee' && status !== 'brouillon') {
      if (paid >= total && total > 0) status = 'payee';
      else if (paid > 0) status = 'partielle';
      else status = invoice.due_date && invoice.due_date < B.today() ? 'retard' : 'emise';
    }
    return { total: total, paid: paid, remaining: remaining, status: status };
  }

  B.calc = {
    calculateRevenue: calculateRevenue,
    calculateLineTotal: calculateLineTotal,
    calculateQuoteLines: calculateQuoteLines,
    calculateSubtotal: calculateSubtotal,
    calculateDiscount: calculateDiscount,
    calculateTax: calculateTax,
    calculateTotal: calculateTotal,
    calculateDocumentTotals: calculateDocumentTotals,
    calculateSums: calculateSums,
    calculateBudgetTotal: calculateBudgetTotal,
    calculateBudgetRemaining: calculateBudgetRemaining,
    calculateEstimatedMargin: calculateEstimatedMargin,
    calculateActualResult: calculateActualResult,
    marginRate: marginRate,
    analyzeBudgetVariance: analyzeBudgetVariance,
    budgetLineOf: budgetLineOf,
    budgetStatus: budgetStatus,
    buildAlerts: buildAlerts,
    budgetFromQuote: budgetFromQuote,
    dashboardStats: dashboardStats,
    expensesByCategory: expensesByCategory,
    seriesByMonth: seriesByMonth,
    quotesByStatus: quotesByStatus,
    projectSummary: projectSummary,
    invoiceSummary: invoiceSummary
  };
})(globalThis.BATIYO = globalThis.BATIYO || {});
