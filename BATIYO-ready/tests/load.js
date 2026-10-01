/* Charge le noyau BATIYO dans Node (sans DOM) pour vérifier la logique. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'src');
const FILES = ['01-config.js','02-professions.js','03-utils.js','04-storage.js','05-calculations.js','06-core.js','07-repository.js','08-reference.js','09-services.js','10-assistant.js','11-pdf.js'];
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k,v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const ctx = { console, setTimeout, clearTimeout, Date, Math, JSON, Blob: function(){}, URL: { createObjectURL(){}, revokeObjectURL(){} }, navigator: {}, document: undefined };
ctx.globalThis = ctx;
ctx.window = { localStorage: fakeLS, isSecureContext: false };
vm.createContext(ctx);
for (const f of FILES) {
  const p = path.join(SRC, f);
  if (!fs.existsSync(p)) continue;
  vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f });
}
module.exports = { B: ctx.BATIYO, loadFiles: FILES };
