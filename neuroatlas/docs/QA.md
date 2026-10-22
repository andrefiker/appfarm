# QA — NEUROATLAS 1.0.0

Data: 22/10/2026. Resultado: APK assinado, conteúdo e interface verificados nas condições abaixo. Não equivale a instalação confirmada em Android nem a validação clínica independente.

## Matriz de evidências

| Categoria | Resultado | Evidência / limite |
|---|---|---|
| Unidade e conteúdo | 9 grupos de verificações aprovados | IDs, campos, links, bibliografia, relações topográficas, busca, preferências, modelo numérico e fronteiras de privacidade; `qa/content-results.json` |
| Navegador | 12 grupos aprovados | 21 regiões, 10 redes, 18 temas, 39 fontes, 6 módulos, favoritos, modos, configurações e ausência de erros/requisições externas; `qa/browser-results.json` |
| Geometria, toque e acessibilidade | 5 grupos aprovados | 40 centros de marcadores dentro de suas formas; toque real via protocolo do navegador, pinça, arraste, modo offline, contraste e foco; `qa/anatomy-touch-results.json` |
| Telas pequenas | Aprovado no navegador | 320, 360, 390 e 430 CSS px; claro/escuro e texto ampliado; sem overflow horizontal nas cinco abas |
| Pacote Android | Aprovado | Manifesto compilado, versão, zero permissões, assets idênticos, ZIP íntegro, alinhamento 4 bytes, assinatura v2/v3; `qa/package-results.json` |
| Reprodutibilidade | Aprovado com toolchain fixo | Dois builds limpos consecutivos byte a byte idênticos; `qa/reproducibility.json` |
| Anatomia e linguagem | Revisão editorial realizada | Cinco desenhos revisados visualmente e confrontados com relações de fontes públicas; não houve neuroanatomista independente |
| Validação clínica | **Não realizada** | A revisão assistida por IA e os testes de conteúdo não substituem especialistas nem estudo de uso |
| Emulador Android | **Não executado** | Não há emulador/ADB/imagem de sistema disponíveis neste ambiente |
| Telefone real | **Não executado** | Nenhum aparelho conectado; instalação, barras, teclado, ciclo de vida e desempenho Android não foram observados |

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

1. Instalar o APK assinado em Android 8+ com WebView 92+ e em Android 15; abrir pela primeira vez em modo avião.
2. Verificar barras claras/escuras, navegação por gestos e três botões, recorte de tela, teclado de busca, rotação e escala de texto do sistema.
3. Testar Back em fonte → tema → aba → saída; reabrir após encerrar processo; favoritos e preferências devem permanecer.
4. Verificar pinça/arraste, TalkBack, alvos e leitura com usuários reais; testar aparelho com pouca memória.
5. Atualizar de um build assinado pelo mesmo certificado com versionCode maior; verificar preservação dos dados locais.
6. Solicitar revisão independente de neuroanatomia, conteúdo clínico e compreensão das explicações. Não chamar a versão de certificada ou clinicamente validada.

## Limites do produto

Figuras esquemáticas sem escala, conexões representativas e conteúdo resumido. Biblioteca não exaustiva, sem diagnóstico individual ou tratamentos. Farmacologia, exportação e inglês omitidos. Fontes do sistema podem alterar a aparência tipográfica entre aparelhos. A chave foi criada especificamente para este aplicativo e fornecida em backup privado separado; continuidade depende da preservação desse backup pelo proprietário.
