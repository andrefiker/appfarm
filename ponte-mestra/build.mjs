// Monta o arquivo único index.html a partir de src/ (sem dependências).
import { readFileSync, writeFileSync } from 'node:fs';
const r = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const levels = JSON.stringify(JSON.parse(r('./src/levels.json')), null, 0).replace(/\},\{"id"/g, '},\n{"id"');
let html = r('./src/shell.html');

html = html.replace('/*LEVELS*/', () => levels).replace('/*CORE*/', () => r('./src/core.js')).replace('/*APP*/', () => r('./src/app.js'));
for (const t of ['/*LEVELS*/', '/*CORE*/', '/*APP*/']) if (html.includes(t)) throw new Error('placeholder restante ' + t);
if (/<\/script>/i.test(r('./src/core.js') + r('./src/app.js'))) throw new Error('</script> dentro do JS');
writeFileSync(new URL('./index.html', import.meta.url), html);
console.log('index.html', (html.length / 1024).toFixed(1) + ' KB');
