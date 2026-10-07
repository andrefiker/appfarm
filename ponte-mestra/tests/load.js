// Carrega o núcleo do jogo (CONFIG..STRESS_PREVIEW) no Node.
// Usa src/ quando existir; senão extrai do index.html construído.
const fs = require('fs'), path = require('path'), vm = require('vm');
function load() {
  const root = path.join(__dirname, '..');
  let core, levels;
  const html = path.join(root, 'index.html');
  if (process.env.PM_FROM_HTML && fs.existsSync(html)) {
    const s = fs.readFileSync(html, 'utf8');
    levels = s.match(/<script type="application\/json" id="levels-data">([\s\S]*?)<\/script>/)[1];
    core = s.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
  } else {
    levels = fs.readFileSync(path.join(root, 'src/levels.json'), 'utf8');
    core = fs.readFileSync(path.join(root, 'src/core.js'), 'utf8');
  }
  const ctx = { __LEVELS: JSON.parse(levels), module: { exports: {} }, console, Math, JSON, Float64Array, Int8Array, Map, Set };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(core, ctx, { filename: 'core.js' });
  return ctx.module.exports;
}
module.exports = load;
