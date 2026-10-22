# QA — NEUROATLAS 1.2.0

Data: 22/10/2026. Resultado: APK assinado, conteúdo e interface verificados nas condições abaixo. Não equivale a instalação confirmada em Android nem a validação clínica independente.

## Correção após relato de instalação

O proprietário forneceu uma captura com “App not installed” para 1.0.0. A inspeção encontrou `resources.arsc` comprimido e desalinhado; a tabela abaixo substitui a conclusão anterior de QA de pacote. O teste `zipalign -c` e a assinatura, isoladamente, não cobriam essa regra de instalação. Em 1.0.1, quatro testes de regressão passam e o APK assinado passa na nova verificação de compressão/deslocamento. O arquivo 1.0.0 real é rejeitado pelo mesmo verificador. Ver `INSTALLATION-FIX.md` e `qa/install-fix-results.json`.

Na versão 1.2.0, o conteúdo, a biblioteca e os mapas foram ampliados. O empacotamento corrigido permanece. Todos os testes abaixo foram executados novamente sobre a versão atual; não são testes de aparelho. Contornos, sulcos e fundo dos cortes foram refinados; as posições dos 40 marcadores foram reconferidas. As redes agora são mostradas em planos anatômicos, sem projetar estruturas profundas sobre uma única superfície.

## Matriz de evidências

| Categoria | Resultado | Evidência / limite |
|---|---|---|
| Unidade e conteúdo | 9 grupos de verificações aprovados | IDs, campos, links, bibliografia, relações topográficas, busca, preferências, modelo numérico e fronteiras de privacidade; `qa/content-results.json` |
| Navegador | 12 grupos aprovados em 1.2.0 | 21 regiões, 11 redes, 28 temas, 64 fontes, 6 módulos, favoritos, modos, configurações e ausência de erros/requisições externas; `qa/browser-results.json` |
| Geometria, toque e acessibilidade | 5 grupos aprovados em 1.2.0 | 40 centros de marcadores dentro de suas formas; toque real via protocolo do navegador, pinça, arraste, modo offline, contraste e foco; `qa/anatomy-touch-results.json` |
| Mapas: conteúdo | 5 grupos aprovados | 20 mapas, 53 recortes; referências, regiões, redes e pares resolvidos, contagens e destaques em todas as vistas; `qa/circuit-content-results.json` |
| Mapas: navegador | 9 grupos aprovados | 365 combinações renderizadas (20 conjuntos + 53 recortes, cada um em cinco vistas), toque/pinça/arraste, retorno, fontes, paciente, persistência, offline e telas pequenas; `qa/circuit-browser-results.json` |
| Explorador e ensino: conteúdo | 6 grupos aprovados | 132 inclusões regionais, 79 linhas editoriais, 8 funções e 6 histórias; `qa/explorer-content-results.json` |
| Explorador e ensino: navegador | 10 grupos aprovados | 40 vistas de comparação, apresentações dos 20 temas, 30 etapas de histórias, navegação e fontes; `qa/explorer-browser-results.json` |
| Telas pequenas | Aprovado no navegador | 320, 360, 390 e 430 CSS px; claro/escuro; texto normal, ampliado e 200% por CSS. 96 telas dos novos fluxos; não equivale à escala não linear Android |
| Pacote Android | Verificações estáticas aprovadas em 1.2.0 | Manifesto, versão, zero permissões, assets idênticos, ZIP íntegro, tabela sem compressão com deslocamento alinhado, assinatura v2/v3 e certificado original; `qa/package-results.json` |
| Regressão de instalação | 4 testes aprovados; APK antigo rejeitado | Tabela comprimida, tabela desalinhada, tabela válida e normalização; `tests/apk-layout.py`, `qa/install-fix-results.json` |
| Reprodutibilidade | Aprovado com toolchain fixo | Dois builds limpos consecutivos byte a byte idênticos; `qa/reproducibility.json` |
| Anatomia e linguagem | Revisão editorial realizada | Cinco desenhos revisados visualmente e confrontados com relações de fontes públicas; não houve neuroanatomista independente |
| Validação clínica | **Não realizada** | A revisão assistida por IA e os testes de conteúdo não substituem especialistas nem estudo de uso |
| Emulador Android | **Não executado** | Não há emulador/ADB/imagem de sistema disponíveis neste ambiente |
| Telefone real | **1.0.0 falhou; 1.2.0 pendente** | Captura fornecida pelo proprietário confirma falha do APK anterior. Sem ADB/log do instalador; a nova instalação ainda não foi observada |

## Mapas e novos fluxos: revisão visual

Lista → Iluminar redes → recorte → vista → região → fonte → Voltar foi exercitado. Todos os 20 mapas e os 53 recortes renderizaram as regiões esperadas nas cinco vistas. As regiões profundas só são iluminadas nos planos onde estão desenhadas. Selecionar um nome no diagrama localiza a estrutura, e o retorno de uma fonte mantém o recorte. Favoritos usam os mesmos IDs de temas da versão anterior. Não há migração de dados nem persistência de pesquisa/seleção de mapas.

Foram inspecionadas capturas reais da lista, TOC em vista inferior, conjunto do TOC em modo claro com texto ampliado a 320 px, diagrama de relações em escuro e pânico na vista para paciente. Controles alternativos têm pelo menos 44 CSS px; rótulos anatômicos menores continuam acessíveis pelo zoom e pelos botões textuais. A geometria dos 40 marcadores e os principais contrastes também foram reexecutados.

A revisão 1.2.0 encontrou uma falha real: rótulos longos ampliavam a largura de layout e interferiam no toque da navegação em 320 px. A grade agora usa colunas que podem encolher e rótulos quebráveis; o teste compara a largura do documento com `clientWidth`, pois `innerWidth` podia crescer com o erro. Também houve corte de rótulo a 200% no diagrama antigo de altura fixa: os nós passaram a usar grade de altura automática e as linhas acompanham os centros reais dos botões por ResizeObserver. A revisão visual também reduziu os rótulos de duração, encurtou o limite fixo e limitou o crescimento de títulos na apresentação a 200%, preservando o texto explicativo ampliado. Os fluxos foram reexecutados após os reparos.

Na nova apresentação, uma figura aparece por etapa; o limite permanece visível e o modo global não é alterado. Funções levam a recortes existentes. Comparações impedem escolher a mesma condição nos dois lados e mostram que interseção editorial não é identidade causal. As histórias percorrem 30 passos, sem campos pessoais; voltar de uma região preserva o passo. Fontes por região/linha abrem a referência real e o retorno preserva a seleção.

## O que foi exercitado

- Cinco vistas e todos os botões “Localizar no atlas”. Geometria de cada marcador e relações relativas motor/sensitivo, lobos, caloso/ventrículo e tálamo/hipotálamo.
- Seleção por toque, zoom por botões, reset, pinça multitoque e arraste com eventos de toque do Chrome. Controles da interface medem pelo menos 44 CSS px; marcadores anatômicos pequenos possuem botões textuais alternativos com 48 px e zoom até 4×.
- Busca insensível a acentos por região, função, tema e rede; fonte e retorno; favoritos após recarregar; recentes limitados e apagáveis.
- Alternância clínica/paciente; a seção técnica de diferenciação não aparece no modo paciente. Fontes e mitos permanecem acessíveis como material geral.
- Seis modelos: sliders modificam as figuras; reset restaura os valores; mudança de contexto altera a demonstração de ameaça. Números são arbitrários e não são pontuações de uma pessoa.
- Claro, escuro, controles destros/canhotos e texto ampliado; persistência após reabertura do documento web. Foco de teclado delimitado nos diálogos e Escape fecha.
- Desconexão do navegador após carregar os assets: navegar, abrir fontes, buscar, salvar e retornar continua funcionando. **Recarregamento offline do servidor de QA não é o mecanismo Android**: no APK os assets são interceptados localmente. Sua presença e igualdade de bytes foram auditadas.
- Apenas uma chave local `neuroatlas-v1`, com os sete campos esperados. Busca não é persistida; não há chamadas externas, uploads, formulários de casos, câmera ou microfone.
- Contraste de texto principal, secundário e destaque contra três superfícies em ambos os temas: mínimo medido acima de 5,3:1. Não é uma auditoria WCAG integral; cores anatômicas também usam números, nomes e seleção, sem depender somente da cor.

## Ambiente, desempenho e imagens

Chrome for Testing 131.0.6778.204, Playwright Core, viewport móvel e touch emulado. O lançamento padrão falhou por restrição de IPC Unix; a execução concluída usou o modo headless antigo em processo único. Esse navegador não é Android System WebView. Tempos de carregamento e 1.000 buscas estão no JSON; são medições de navegador desktop e não comprovam FPS, consumo de bateria ou desempenho em aparelho.

Screenshots são capturas da interface implementada com os mesmos arquivos incorporados ao APK, não mockups. Capturas de elemento/página inteira podem mostrar a barra inferior fixa sobre o conteúdo no limite do viewport; a página é rolável e mantém espaçamento final para acesso ao conteúdo. Nenhuma captura é apresentada como tela de um emulador ou telefone.

## Correções feitas durante o QA

- Movidos os marcadores frontal inferior e hipocampal posterior para dentro de suas estruturas.
- Ampliados os números anatômicos; reposicionados caloso/ventrículo medial para separar os marcadores.
- Removida a identificação indevida de todo o manto coronal como lobo frontal; agora neutro, com limitação explícita.
- Alvos dos seletores de modo/vista ampliados para 44 px.
- Metadados de consulta das referências corrigidos para distinguir trechos, resumo e página; data APA de dissociação conferida como 2024.
- Tratamento nativo de insets explicita layout sob barras e aplica margens para barras/recortes/IME; callback Back moderno habilitado. **Verificação estática, ainda sem execução Android.**
- Empacotamento normalizado e D8 em release/thread única para eliminar diferença de bytes entre rebuilds.

## Verificações pendentes em aparelho

1. Instalar o APK assinado em Android 8+ com WebView 92+ e em Android 15/16; abrir pela primeira vez em modo avião.
2. Verificar barras claras/escuras, navegação por gestos e três botões, recorte de tela, teclado de busca, rotação e escala de texto do sistema.
3. Testar Back em fonte → tema → aba → saída; reabrir após encerrar processo; favoritos e preferências devem permanecer.
4. Verificar pinça/arraste, TalkBack, alvos e leitura com usuários reais; testar aparelho com pouca memória.
5. Instalar 1.2.0 (code 4) sobre 1.1.0 (code 3) ou 1.0.1 (code 2), ambas com o mesmo certificado; verificar preservação dos dados locais.
6. Solicitar revisão independente de neuroanatomia, conteúdo clínico e compreensão das explicações. Não chamar a versão de certificada ou clinicamente validada.

## Limites do produto

Figuras esquemáticas sem escala, conexões representativas e conteúdo resumido. Biblioteca não exaustiva, sem diagnóstico individual ou tratamentos. Farmacologia, exportação e inglês omitidos. Fontes do sistema podem alterar a aparência tipográfica entre aparelhos. A chave foi criada especificamente para este aplicativo e fornecida em backup privado separado; continuidade depende da preservação desse backup pelo proprietário.

## Registro de liberação 1.2.0

- Pacote: `com.andrefiker.neuroatlas`; versionName `1.2.0`; versionCode `4`.
- APK: `NEUROATLAS-v1.2.0.apk`; tamanho e SHA-256 definitivos em `qa/package-results.json`.
- Assinatura RSA verificada em v2/v3; certificado SHA-256 `d68626fa70e1de06bdc47dbcb969e8f00f7d0ce7923614ef715eb0797b58e54a`.
- `resources.arsc` sem compressão e deslocamento real de dados alinhado em 4 bytes. Zero permissões; todos os assets offline são idênticos à fonte.
- Ferramentas Android recuperadas conferidas contra os sete hashes de `qa/toolchain.json`. Chrome131 conferido contra o MD5 de distribuição `e3af9bc48045009efd7f84e801106aba`.
- Compilação em Java17/ECJ teve avisos de APIs Android obsoletas já presentes no código de compatibilidade; nenhum erro de compilação.
- Rollback de código: `bc7f1663f1ccdec1b1b89c17026218cc5f51b4de` (1.1.0), mantendo a assinatura e incrementando o versionCode em uma versão de retorno. Não usar o APK1.0.0 defeituoso.
