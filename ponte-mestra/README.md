# Ponte Mestra

Jogo de construção de pontes com física, em **um único arquivo HTML5** (`index.html`, ~146 KB): HTML, CSS e JS inline, canvas, sem dependências e sem rede. Feito para Android WebView, paisagem, toque primeiro.

**Entregável:** `ponte-mestra/index.html`, que já vem montado. Os arquivos em `src/` são o código-fonte de onde ele é gerado.

## Estrutura
| Caminho | Conteúdo |
|---|---|
| `src/core.js` | CONFIG, MATERIALS, LEVELS (helpers), EVENTS, PHYSICS (XPBD), VEHICLES, STRESS_PREVIEW (solver linear) |
| `src/app.js` | STORAGE, AUDIO (WebAudio sintetizado), RENDER, UI, INPUT, editor oculto, loop |
| `src/levels.json` | 40 níveis artesanais (4 mundos) em JSON |
| `src/shell.html` | HTML + CSS (tema blueprint claro) |
| `build.mjs` | monta `index.html` (níveis em `<script type="application/json" id="levels-data">`) |
| `tests/` | testes de física em Node, projetista automático, calibração de orçamentos, soluções de referência |
| `scripts/` | smoke tests no Chromium (Playwright) |

## Comandos
```sh
npm run build       # gera index.html a partir de src/
npm test            # 11 testes de física (Node, sem navegador)
npm run calibrate   # re-solve todos os níveis e recalibra orçamentos (reescreve levels.json e tests/solutions.json)
npm run smoke       # Playwright: menu → nível 1 por toque → TESTAR → 3★; níveis com eventos; interações de toque
```
Para `smoke`, o pacote `playwright` precisa estar resolvível (ex.: `ln -s /opt/node22/lib/node_modules/playwright node_modules/playwright`).

## Física
- XPBD "small steps": passo fixo de 1/60 s, 24 subpassos, 1 iteração. Determinístico (sem `Math.random` na simulação).
- Força na barra = λ/h²; tensão filtrada (passa-baixa) e ruptura quando > 100% do limite do material. A barra quebra em dois cotos que caem.
- Soldas: restrições angulares (900 kN·m/rad) que viram pino acima de 28 kN·m.
- Veículos: chassi rígido de 4 partículas + rodas com suspensão complacente. Tração limitada por atrito (μ·N) e força do motor. Colidem só com a pista e o topo das margens.
- A gravidade da estrutura entra gradualmente em 0,6 s, para que a ponte assente sem choque de carga súbita.
- Água: empuxo e arrasto nas barras submersas. Veículo que toca a água reprova.
- Eventos: represa (nível sobe), vento em rajadas, terremoto (âncoras e chão oscilam), barco (canal precisa ficar livre), pistões numa linha do tempo, tráfego nos dois sentidos, parada obrigatória, comboios.
- O preview de tensão monta a matriz de rigidez K, fatora por Cholesky uma vez e resolve um caso por posição do veículo mais pesado (envoltória). Mecanismos são detectados por pivô nulo.

## Verificação (self-review)
- **Nível 1:** uma treliça Warren simples (pista + madeira, R$ 2.870 de R$ 3.000) passa com pico de 56% (3★) e o preview estima 53%. Só a pista sem treliça é marcada instável e cai.
- **Todos os 40 níveis** têm uma ponte de referência gerada pelo projetista automático que passa dentro do orçamento (`tests/solutions.json`, conferido por teste).
- **Estabilidade:** caminhão sobre ponte fraca não produz NaN nem velocidades explosivas, e caminhão parado 3 s numa ponte de aço fica em equilíbrio.
- **Sem tunneling:** um teste instrumentado em 7 níveis confirma que nenhuma roda atravessa a pista.
- **Desempenho:** no Chromium de desktop, ~0,1–0,2 ms de simulação por quadro e ~1 ms para o preview estático.

## Android WebView
O wrapper precisa de `setJavaScriptEnabled(true)` e `setDomStorageEnabled(true)` (para salvar o progresso no localStorage), além de orientação paisagem. O padrão de wrapper offline do repo é `settlement-zero-android/`.
