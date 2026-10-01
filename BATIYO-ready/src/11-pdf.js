/* =========================================================================
   BATIYO — 11. DOCUMENTS PDF
   Modèle professionnel (A4), aperçu avant téléchargement, impression / PDF.
   Le document reflète exactement la version enregistrée (#184) : aucun calcul
   n'est refait ici, on affiche les montants du document.
   ========================================================================= */
(function (B) {
  'use strict';

  const BRAND = '#0F766E';
  const BRAND_DARK = '#115E59';
  const INK = '#0F172A';
  const MUTED = '#64748B';
  const LINE = '#E2E8F0';
  const BG = '#F8FAFC';

  function esc(s) { return B.escape(s); }
  function money(n) { return B.money(n); }

  /* -------------------------------- Styles -------------------------------- */
  function styles() {
    return `
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #EEF2F6; font-family: Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: ${INK}; }
    .sheet { width: 210mm; min-height: 297mm; margin: 12px auto; background: #fff; padding: 16mm 14mm 20mm; position: relative; box-shadow: 0 6px 24px rgba(15,23,42,.12); }
    .top { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
    .brand { display: flex; gap: 12px; align-items: flex-start; }
    .logo { width: 62px; height: 62px; border-radius: 14px; background: ${BRAND}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 24px; letter-spacing: .5px; overflow: hidden; }
    .logo img { width: 100%; height: 100%; object-fit: cover; }
    .biz-name { font-size: 19px; font-weight: 800; letter-spacing: -.2px; }
    .biz-line { font-size: 11.5px; color: ${MUTED}; line-height: 1.5; }
    .doc-head { text-align: right; min-width: 190px; }
    .doc-title { font-size: 25px; font-weight: 800; color: ${BRAND}; letter-spacing: .5px; text-transform: uppercase; }
    .doc-number { font-size: 14px; font-weight: 700; margin-top: 2px; }
    .doc-meta { font-size: 11.5px; color: ${MUTED}; line-height: 1.6; margin-top: 6px; }
    .rule { height: 3px; background: linear-gradient(90deg, ${BRAND} 0%, ${BRAND} 45%, #F59E0B 45%, #F59E0B 60%, ${LINE} 60%); margin: 14px 0 18px; border-radius: 2px; }
    .parties { display: flex; gap: 14px; }
    .card { flex: 1; border: 1px solid ${LINE}; border-radius: 10px; padding: 12px 14px; background: ${BG}; }
    .card h3 { margin: 0 0 6px; font-size: 10.5px; text-transform: uppercase; letter-spacing: .8px; color: ${BRAND_DARK}; font-weight: 700; }
    .card .strong { font-size: 14px; font-weight: 700; }
    .card .muted { font-size: 11.5px; color: ${MUTED}; line-height: 1.55; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    thead th { background: ${BRAND}; color: #fff; font-size: 10.5px; text-transform: uppercase; letter-spacing: .6px; padding: 9px 10px; text-align: left; }
    thead th.num, td.num { text-align: right; white-space: nowrap; }
    tbody td { padding: 9px 10px; font-size: 12px; border-bottom: 1px solid ${LINE}; vertical-align: top; }
    tbody tr:nth-child(even) { background: #FAFBFC; }
    tbody td .sub { font-size: 10.5px; color: ${MUTED}; }
    .desc { font-weight: 600; }
    .totals { margin-top: 16px; display: flex; justify-content: flex-end; }
    .totals table { width: 62%; margin: 0; border-collapse: collapse; }
    .totals td { padding: 7px 10px; font-size: 12.5px; border: none; }
    .totals tr.strong td { background: ${BRAND}; color: #fff; font-weight: 800; font-size: 15px; padding: 11px 10px; }
    .totals tr.sub td { color: ${MUTED}; font-size: 11.5px; }
    .blocks { display: flex; gap: 14px; margin-top: 20px; }
    .block { flex: 1; border: 1px solid ${LINE}; border-radius: 10px; padding: 12px 14px; }
    .block h3 { margin: 0 0 6px; font-size: 10.5px; text-transform: uppercase; letter-spacing: .7px; color: ${BRAND_DARK}; }
    .block p { margin: 0; font-size: 11.5px; color: ${MUTED}; line-height: 1.6; white-space: pre-wrap; }
    .sign { margin-top: 22px; display: flex; gap: 14px; }
    .sign .zone { flex: 1; border: 1px dashed #CBD5E1; border-radius: 10px; padding: 10px 14px 34px; font-size: 11px; color: ${MUTED}; }
    .foot { position: absolute; left: 14mm; right: 14mm; bottom: 10mm; border-top: 1px solid ${LINE}; padding-top: 8px; font-size: 10px; color: ${MUTED}; display: flex; justify-content: space-between; gap: 10px; }
    .badge { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 700; letter-spacing: .3px; }
    .badge.paid { background: #DCFCE7; color: #166534; }
    .badge.due { background: #FEF3C7; color: #92400E; }
    .badge.draft { background: #E2E8F0; color: #334155; }
    .mention { margin-top: 12px; font-size: 10px; color: ${MUTED}; font-style: italic; }
    @media print {
      html, body { background: #fff; }
      .sheet { width: auto; min-height: auto; margin: 0; box-shadow: none; padding: 12mm 12mm 16mm; }
      .no-print { display: none !important; }
      thead { display: table-header-group; }
      tr, .card, .block { page-break-inside: avoid; }
    }`;
  }

  /* ------------------------------ Constructeurs --------------------------- */
  function headerHTML(doc, business, opts) {
    const logo = business.logo
      ? '<div class="logo"><img src="' + esc(business.logo) + '" alt="Logo"></div>'
      : '<div class="logo">' + esc(B.initials(business.name)) + '</div>';
    const docTitle = opts.title;
    const statusBadge = opts.badge || '';
    return `
      <div class="top">
        <div class="brand">
          ${logo}
          <div>
            <div class="biz-name">${esc(business.name || 'Mon entreprise')}</div>
            <div class="biz-line">
              ${business.address ? esc(business.address) + '<br>' : ''}
              ${business.phone ? 'Tél. ' + esc(business.phone) + '<br>' : ''}
              ${business.email ? esc(business.email) : ''}
            </div>
          </div>
        </div>
        <div class="doc-head">
          <div class="doc-title">${esc(docTitle)}</div>
          <div class="doc-number">${esc(doc.number || '')}</div>
          <div class="doc-meta">
            Date : ${esc(B.dateLong(doc.date))}<br>
            ${opts.extraMeta || ''}
            ${statusBadge}
          </div>
        </div>
      </div>
      <div class="rule"></div>`;
  }

  function partiesHTML(doc, client, opts) {
    return `
      <div class="parties">
        <div class="card">
          <h3>Client</h3>
          <div class="strong">${esc(client ? client.name : 'Client à préciser')}</div>
          <div class="muted">
            ${client && client.address ? esc(client.address) + '<br>' : ''}
            ${client && client.phone ? 'Tél. ' + esc(client.phone) + '<br>' : ''}
            ${client && client.email ? esc(client.email) : ''}
          </div>
        </div>
        <div class="card">
          <h3>${esc(opts.contextTitle || 'Objet')}</h3>
          <div class="strong">${esc(opts.contextTitleValue || doc.notes || '—')}</div>
          <div class="muted">${esc(opts.contextSub || '')}</div>
        </div>
      </div>`;
  }

  function linesHTML(doc) {
    const rows = (doc.lines || []).map(function (l) {
      return `<tr>
        <td><span class="desc">${esc(l.description)}</span>${l.note ? '<div class="sub">' + esc(l.note) + '</div>' : ''}</td>
        <td class="num">${B.num(l.quantity)}<div class="sub">${esc(B.unitLabel(l.unit))}</div></td>
        <td class="num">${money(l.unit_price)}</td>
        <td class="num">${money(l.total)}</td>
      </tr>`;
    }).join('');
    return `
      <table>
        <thead>
          <tr><th>Désignation</th><th class="num">Quantité</th><th class="num">Prix unitaire</th><th class="num">Total</th></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="4">Aucun élément.</td></tr>'}</tbody>
      </table>`;
  }

  function totalsHTML(doc, opts) {
    const rows = [];
    rows.push('<tr><td>Sous-total</td><td class="num">' + money(doc.subtotal) + '</td></tr>');
    if (doc.discount && doc.discount.value) {
      const d = doc.discount;
      rows.push('<tr class="sub"><td>Remise' + (d.mode === 'percent' ? ' (' + d.value + ' %)' : '') + '</td><td class="num">− ' + money(B.calc.calculateDiscount(doc.subtotal, d)) + '</td></tr>');
    }
    if (doc.tax) rows.push('<tr class="sub"><td>' + esc(doc.tax_label || 'Taxe') + '</td><td class="num">' + money(doc.tax) + '</td></tr>');
    rows.push('<tr class="strong"><td>Total</td><td class="num">' + money(doc.total) + '</td></tr>');
    if (doc.deposit) rows.push('<tr><td>Acompte</td><td class="num">' + money(doc.deposit) + '</td></tr>');
    if (doc.deposit) rows.push('<tr class="sub"><td>Reste à payer</td><td class="num">' + money(doc.balance != null ? doc.balance : doc.total - doc.deposit) + '</td></tr>');
    if (opts.showPaid && doc.paid_amount != null) {
      rows.push('<tr><td>Montant payé</td><td class="num">' + money(doc.paid_amount) + '</td></tr>');
      rows.push('<tr class="sub"><td>Reste à payer</td><td class="num">' + money(Math.max(0, doc.total - doc.paid_amount)) + '</td></tr>');
    }
    return '<div class="totals"><table>' + rows.join('') + '</table></div>';
  }

  /* --------------------------- Devis (#38, #212) -------------------------- */
  function quoteHTML(quote, opts) {
    const o = opts || {};
    const business = B.session.business();
    const client = B.clientService.get(quote.client_id);
    const project = quote.project_id ? B.projectService.get(quote.project_id) : null;
    const st = B.status(B.QUOTE_STATUSES, quote.status);
    const badge = '<span class="badge ' + (quote.status === 'accepte' || quote.status === 'converti' ? 'paid' : quote.status === 'brouillon' ? 'draft' : 'due') + '">' + esc(st.label) + '</span>';
    const validUntil = quote.valid_until ? 'Valable jusqu’au : ' + B.dateShort(quote.valid_until) + '<br>' : '';
    const content = `
      <div class="sheet">
        ${headerHTML(quote, business, { title: 'Devis', badge: badge, extraMeta: validUntil })}
        ${partiesHTML(quote, client, {
          contextTitle: 'Chantier / objet',
          contextTitleValue: project ? project.name : (quote.notes ? B.truncate(quote.notes, 80) : 'Prestation'),
          contextSub: project ? (project.address || '') : ''
        })}
        ${linesHTML(quote)}
        ${totalsHTML(quote, { showPaid: false })}
        <div class="blocks">
          ${quote.notes ? '<div class="block"><h3>Notes</h3><p>' + esc(quote.notes) + '</p></div>' : ''}
          ${quote.conditions ? '<div class="block"><h3>Conditions</h3><p>' + esc(quote.conditions) + '</p></div>' : ''}
        </div>
        ${(quote.reference ? '<div class="mention">Référence : ' + esc(quote.reference) + '</div>' : '')}
        <div class="mention">Montants exprimés en ${esc((B.session.settings() || {}).currency || 'FCFA')}. Document non contractuel tant qu’il n’est pas signé. Aucun paiement n’est encaissé par BATIYO : le règlement se fait directement entre vous et votre client.</div>
        <div class="mention">Document ${esc(quote.number)} · version ${quote.version || 1} · généré le ${B.dateLong(B.today())}${quote.valid_until ? ' · valable jusqu’au ' + B.dateLong(quote.valid_until) : ''}.</div>
        <div class="sign">
          <div class="zone">Signature de l’entreprise<br>${esc(business.manager_name || business.name || '')}</div>
          <div class="zone">Bon pour accord — signature du client</div>
        </div>
        <div class="foot">
          <div>${esc(business.name || '')} ${business.phone ? '· ' + esc(business.phone) : ''}</div>
          <div>${esc(business.name || 'BATIYO')} — ${esc(quote.number)}</div>
        </div>
      </div>`;
    return page(('Devis ' + (quote.number || '') + ' — ' + (business.name || '')).trim(), content, o);
  }

  /* -------------------------- Facture (#45, #212) ------------------------- */
  function invoiceHTML(invoice, opts) {
    const o = opts || {};
    const business = B.session.business();
    const client = B.clientService.get(invoice.client_id);
    const project = invoice.project_id ? B.projectService.get(invoice.project_id) : null;
    const summary = B.calc.invoiceSummary(invoice);
    const st = B.status(B.INVOICE_STATUSES, summary.status);
    const badge = '<span class="badge ' + (summary.status === 'payee' ? 'paid' : summary.status === 'brouillon' ? 'draft' : 'due') + '">' + esc(st.label) + '</span>';
    const content = `
      <div class="sheet">
        ${headerHTML(invoice, business, {
          title: 'Facture', badge: badge,
          extraMeta: 'Échéance : ' + B.dateShort(invoice.due_date) + '<br>'
        })}
        ${partiesHTML(invoice, client, {
          contextTitle: 'Chantier / objet',
          contextTitleValue: project ? project.name : (invoice.notes ? B.truncate(invoice.notes, 80) : 'Prestation'),
          contextSub: project ? (project.address || '') : ''
        })}
        ${linesHTML(invoice)}
        ${totalsHTML(invoice, { showPaid: true })}
        <div class="blocks">
          ${invoice.notes ? '<div class="block"><h3>Notes</h3><p>' + esc(invoice.notes) + '</p></div>' : ''}
          ${invoice.conditions ? '<div class="block"><h3>Conditions de paiement</h3><p>' + esc(invoice.conditions) + '</p></div>' : ''}
        </div>
        ${(invoice.payments && invoice.payments.length) ? '<div class="block" style="margin-top:14px"><h3>Paiements enregistrés</h3><p>' + invoice.payments.map(function (p) {
          return B.dateLong(p.date) + ' — ' + money(p.amount) + (p.method ? ' (' + esc(p.method) + ')' : '') + (p.note ? ' · ' + esc(p.note) : '');
        }).join('\n') + '</p></div>' : ''}
        <div class="mention">Document ${esc(invoice.number)} · version ${invoice.version || 1} · généré le ${B.dateLong(B.today())}${invoice.reference ? ' · référence ' + esc(invoice.reference) : ''}.</div>
        <div class="mention">Le montant payé est un suivi manuel enregistré dans BATIYO. Aucun paiement n’est effectué par l’application.</div>
        <div class="sign">
          <div class="zone">Signature de l’entreprise<br>${esc(business.manager_name || business.name || '')}</div>
          <div class="zone">Cachet / signature du client</div>
        </div>
        <div class="foot">
          <div>${esc(business.name || '')} ${business.phone ? '· ' + esc(business.phone) : ''}</div>
          <div>${esc(business.name || 'BATIYO')} — ${esc(invoice.number)}</div>
        </div>
      </div>`;
    return page(('Facture ' + (invoice.number || '') + ' — ' + (business.name || '')).trim(), content, o);
  }

  /* ----------------------------- Page complète ---------------------------- */
  function page(title, content, opts) {
    const o = opts || {};
    const actions = o.actions === false ? '' : `
      <div class="no-print" style="position:fixed;left:0;right:0;bottom:0;padding:10px 14px;background:#0F172A;display:flex;gap:10px;justify-content:center;align-items:center;font-size:13px;color:#E2E8F0">
        <span style="opacity:.7">Aperçu du document</span>
        <button onclick="window.print()" style="background:#0F766E;color:#fff;border:0;border-radius:8px;padding:9px 16px;font-weight:600;font-size:13px;cursor:pointer">Imprimer / Enregistrer en PDF</button>
        <span style="opacity:.6">Astuce : choisissez « Enregistrer au format PDF » dans la fenêtre d’impression.</span>
      </div>`;
    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — BATIYO</title>
<style>${styles()}</style>
</head><body>${content}${actions}</body></html>`;
  }

  /* --------------------- Ouverture / impression / export ------------------ */
  function openPreview(html, opts) {
    const o = opts || {};
    /* Fenêtre dédiée : utile comme aperçu universel et fallback impression. */
    let win = null;
    try { win = window.open('', '_blank'); } catch (e) { win = null; }
    if (win && win.document) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      return { ok: true, mode: 'window' };
    }
    const ok = B.download((o.filename || 'batiyo-document') + '.html', html, 'text/html;charset=utf-8');
    return { ok: ok, mode: 'download' };
  }

  function htmlRoot(html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const root = document.createElement('div');
    root.className = 'batiyo-pdf-export-root';
    root.style.position = 'fixed';
    root.style.left = '-100000px';
    root.style.top = '0';
    root.style.width = '210mm';
    root.style.background = '#fff';
    root.style.zIndex = '-1';
    Array.from(parsed.head.querySelectorAll('style')).forEach(function(style){
      root.appendChild(style.cloneNode(true));
    });
    Array.from(parsed.body.childNodes).forEach(function(node){
      root.appendChild(node.cloneNode(true));
    });
    document.body.appendChild(root);
    return root;
  }

  async function renderPdfBlob(html, filename) {
    if (!window.html2pdf) throw new Error('Le moteur PDF n’est pas encore chargé.');
    const root = htmlRoot(html);
    try {
      const target = root.querySelector('.sheet') || root;
      const options = {
        margin: [8, 8, 10, 8],
        filename: (filename || 'batiyo-document') + '.pdf',
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['css', 'legacy'] }
      };
      return await window.html2pdf().set(options).from(target).outputPdf('blob');
    } finally {
      root.remove();
    }
  }

  async function downloadPdf(html, filename) {
    try {
      const blob = await renderPdfBlob(html, filename);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (filename || 'batiyo-document') + '.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 10000);
      return { ok: true, blob: blob };
    } catch (e) {
      openPreview(html, { filename: filename });
      return { ok: false, fallback: true, error: e };
    }
  }

  async function sharePdf(html, filename, shareText) {
    try {
      const blob = await renderPdfBlob(html, filename);
      const safeName = (filename || 'batiyo-document') + '.pdf';
      const file = new File([blob], safeName, { type: 'application/pdf' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: safeName, text: shareText || '' });
        return { ok: true, mode: 'file-share' };
      }
      return { ok: false, mode: 'no-file-share', blob: blob, file: file };
    } catch (e) {
      return { ok: false, error: e };
    }
  }

  /* Partage : message + lien WhatsApp (#41, #214) — aucune API WhatsApp */
  function shareMessage(entity, doc) {
    const business = B.session.business();
    const client = B.clientService.get(doc.client_id);
    const label = entity === 'quote' ? 'devis' : 'facture';
    const amount = B.money(doc.total);
    let msg = 'Bonjour' + (client ? ' ' + client.name : '') + ', ';
    msg += 'veuillez trouver ci-joint votre ' + label + ' BATIYO ' + (doc.number || '') + ' d’un montant de ' + amount + '. ';
    msg += 'Merci pour votre confiance.';
    if (business && business.name) msg += '\n\n' + business.name + (business.phone ? ' — ' + business.phone : '');
    return msg;
  }

  B.pdf = {
    quoteHTML: quoteHTML,
    invoiceHTML: invoiceHTML,
    page: page,
    openPreview: openPreview,
    renderPdfBlob: renderPdfBlob,
    downloadPdf: downloadPdf,
    sharePdf: sharePdf,
    shareMessage: shareMessage,
    previewQuote: function (quote, opts) { return openPreview(quoteHTML(quote, opts), { filename: (quote.number || 'devis') }); },
    previewInvoice: function (invoice, opts) { return openPreview(invoiceHTML(invoice, opts), { filename: (invoice.number || 'facture') }); },
    /* Export CSV préparé (#137) */
    csv: function (filename, rows, headers) {
      const lines = [headers.join(';')].concat(rows.map(function (r) {
        return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(';');
      }));
      return B.download(filename, '\ufeff' + lines.join('\n'), 'text/csv;charset=utf-8');
    }
  };
})(globalThis.BATIYO = globalThis.BATIYO || {});
