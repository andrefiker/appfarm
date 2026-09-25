import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; import { readFileSync } from 'node:fs'; import { createHash } from 'node:crypto';

export default defineConfig({
    plugins: [react(),  { name: 'quiet-knight-offline-shell', enforce: 'post', generateBundle(_, bundle) { const html = bundle['index.html']; if (!html || html.type !== 'asset') throw new Error('Offline shell missing'); const assets = Object.keys(bundle).filter(name => name !== 'index.html' && !name.endsWith('.map')); const version = createHash('sha256').update(String(html.source)).update(assets.join('|')).digest('hex').slice(0,16); this.emitFile({type:'asset',fileName:'offline-shell.html',source:html.source}); const precache = ['offline-shell.html','icon.svg','manifest.webmanifest',...assets]; const worker = readFileSync('public/sw.js','utf8').replace('__QK_BUILD__', version).replace('__QK_PRECACHE__', JSON.stringify(precache)).replace('__QK_HTML__', () => JSON.stringify(String(html.source))); this.emitFile({type:'asset',fileName:'sw.js',source:worker}); } }],
    base: './',
    build: {
        outDir: process.env.APPDEPLOY_VITE_OUT_DIR || 'dist',
        sourcemap: process.env.APPDEPLOY_VITE_SOURCEMAP === 'hidden' ? 'hidden' : false,
        rollupOptions: {
            maxParallelFileOps: 128,
        },
    },
});
