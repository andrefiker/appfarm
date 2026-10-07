/* VÃO 1.3 campaign: varied terrain, structures and environments. */
(function (root) {
'use strict';
var H = 16;
function bank(x0, x1, y0, y1) { return [[x0, y0], [x1, y1], [x1, H], [x0, H]]; }
function flat(x0, x1, y) { return bank(x0, x1, y, y); }
function island(x0, x1, y) { return [[x0, y], [x1, y], [x1, H], [x0, H]]; }
function pier(x, y, w) { w = w || 1.4; return [[x - w / 2, y], [x + w / 2, y], [x + w / 2 + 0.35, H], [x - w / 2 - 0.35, H]]; }
function roof(x0, x1, y0, y1) { return [[x0, -1], [x1, -1], [x1, y1], [x0, y0]]; }
function mats(stage) {
  if (stage < 4) return ['road', 'wood'];
  if (stage < 7) return ['road', 'wood', 'steel'];
  return ['road', 'wood', 'steel', 'cable'];
}
function L(o) {
  o.h = H;
  o.mats = o.mats || mats(o.id);
  o.seed = 1301 + o.id * 37;
  return o;
}
var LEVELS = [
  L({id:1, chapter:'Fundamentos', env:'campina', envName:'Vale', kind:'short-truss', name:'Primeira Fenda',
    hint:'Comece pequeno: una as margens com pista e transforme o vão em triângulos. A geometria é a força.',
    w:26, terrain:[flat(0,10,8),flat(14,26,8)], anchors:[[10,8],[14,8],[10,10],[14,10]], vehicle:'carro',start:3,goal:23,budget:2400}),
  L({id:2, chapter:'Fundamentos', env:'campina', envName:'Barranco', kind:'grade-change', name:'Barranco Inclinado',
    hint:'As margens não estão na mesma altura. Faça a pista subir suavemente e deixe a treliça absorver a diferença.',
    w:27, terrain:[bank(0,9,8,7),bank(16,27,9,8)], anchors:[[9,7],[16,9],[9,10.5],[16,12]], vehicle:'carro',start:3,goal:24,budget:4200}),
  L({id:3, chapter:'Fundamentos', env:'campina', envName:'Ilha', kind:'two-span', name:'Ilha de Pedra',
    hint:'A ilha muda tudo: pense em duas pontes menores ligadas por um apoio central.',
    w:29, terrain:[flat(0,7,8),flat(22,29,8),island(13,16,10)], anchors:[[7,8],[22,8],[7,11],[22,11],[13,10],[16,10]], vehicle:'van',start:3,goal:26,budget:7000}),
  L({id:4, chapter:'Fundamentos', env:'pedreira', envName:'Pedreira', kind:'deep-pier', name:'Corte da Pedreira',
    hint:'O aço chegou. Use o pilar baixo para descarregar compressão sem transformar tudo em aço caro.',
    w:30, terrain:[bank(0,8,7,8),bank(21,30,8,7),pier(14.5,12,1.6)], anchors:[[8,8],[21,8],[8,11],[21,11],[13.7,12],[15.3,12]], vehicle:'van',start:3,goal:27,budget:10000}),

  L({id:5, chapter:'Pedra e Aço', env:'pedreira', envName:'Pedreira', kind:'stepped', name:'Escadaria de Rocha',
    hint:'O apoio central está alto e deslocado. Distribua a carga em três direções, não apenas para baixo.',
    w:31, terrain:[bank(0,8,8,6.5),bank(22,31,9,8),island(14,16.5,9.5)], anchors:[[8,6.5],[22,9],[8,10],[22,12],[14,9.5],[16.5,9.5]], vehicle:'van',start:3,goal:28,budget:12000}),
  L({id:6, chapter:'Pedra e Aço', env:'pedreira', envName:'Garganta', kind:'deep-gorge', name:'Garganta da Mina',
    hint:'Agora não há apoio no meio. Uma treliça alta trabalha melhor que uma pilha de barras curtas.',
    w:32, terrain:[bank(0,7,8,7),bank(24,32,7,8)], anchors:[[7,7],[24,7],[7,13],[24,13]], vehicle:'van',start:3,goal:29,budget:17000}),
  L({id:7, chapter:'Pedra e Aço', env:'canion', envName:'Cânion', kind:'high-cable', name:'Paredões',
    hint:'Cabos trabalham em tração. Use os pontos altos da rocha para pendurar a pista, não para empurrá-la.',
    w:31, terrain:[flat(0,8,9),flat(23,31,9),roof(2,8,2.4,3.2),roof(23,29,3.2,2.4)], anchors:[[8,9],[23,9],[8,3.2],[23,3.2]], vehicle:'carro',start:3,goal:28,budget:13500}),
  L({id:8, chapter:'Pedra e Aço', env:'canion', envName:'Cânion', kind:'asymmetric-cable', name:'Ombro de Rocha',
    hint:'Um lado é alto, o outro baixo. A solução simétrica é tentadora — e ruim. Siga a geologia.',
    w:34, terrain:[bank(0,8,8,5.8),bank(25,34,10,8.5),roof(2,8,1.8,2.6)], anchors:[[8,5.8],[25,10],[8,2.6],[25,13]], vehicle:'van',start:3,goal:31,budget:18000}),

  L({id:9, chapter:'Cânions', env:'canion', envName:'Cânion', kind:'split-needle', name:'Garganta Dupla',
    hint:'A agulha central divide o vão, mas é estreita. Use-a como nó estrutural, não como fundação infinita.',
    w:34, terrain:[flat(0,7,8),flat(27,34,8),pier(17,11.5,1.2),roof(2,7,2.7,3.4),roof(27,32,3.4,2.7)], anchors:[[7,8],[27,8],[7,3.4],[27,3.4],[16.4,11.5],[17.6,11.5]], vehicle:'van',start:3,goal:31,budget:18000}),
  L({id:10, chapter:'Cânions', env:'canion', envName:'Arco natural', kind:'low-clearance', name:'Arco Natural',
    hint:'A rocha ocupa o espaço acima da pista. Construa uma treliça baixa ou trabalhe por baixo do tabuleiro.',
    w:32, terrain:[flat(0,8,9),flat(24,32,9),roof(10,15,3.2,4.6),roof(18,23,4.6,3.2)], anchors:[[8,9],[24,9],[8,12],[24,12]], vehicle:'carro',start:3,goal:29,budget:15500}),
  L({id:11, chapter:'Cânions', env:'canion', envName:'Fenda', kind:'diagonal-gap', name:'Fenda Diagonal',
    hint:'A pista cruza de uma margem alta para outra baixa. Faça o caminho suave e a estrutura assimétrica.',
    w:34, terrain:[bank(0,8,8,5.5),bank(24,34,10.5,8.5)], anchors:[[8,5.5],[24,10.5],[8,2.4],[24,13]], vehicle:'van',start:3,goal:31,budget:19000}),
  L({id:12, chapter:'Cânions', env:'planalto', envName:'Planalto', kind:'wind-gorge', name:'Eco do Cânion',
    hint:'O vento encontra uma estrutura alta como uma vela. Travamentos cruzados e massa bem colocada importam.',
    w:35, terrain:[flat(0,8,8),flat(27,35,8),roof(3,8,2.8,3.4),roof(27,32,3.4,2.8)], anchors:[[8,8],[27,8],[8,3.4],[27,3.4],[8,12],[27,12]], vehicle:'van',start:3,goal:32,budget:20500,wind:{base:0.65,gust:3.0,period:4.7}}),

  L({id:13, chapter:'Carga e Vento', env:'industrial', envName:'Viaduto', kind:'multi-pier', name:'Viaduto de Serviço',
    hint:'O caminhão favorece caminhos de carga claros. Use os dois pilares como apoios independentes.',
    w:36, terrain:[flat(0,7,8),flat(29,36,8),pier(14,12,1.5),pier(22,12,1.5)], anchors:[[7,8],[29,8],[7,11],[29,11],[13.25,12],[14.75,12],[21.25,12],[22.75,12]], vehicle:'caminhao',start:3.5,goal:32,budget:23000}),
  L({id:14, chapter:'Carga e Vento', env:'industrial', envName:'Elevado', kind:'three-span', name:'Pista Elevada',
    hint:'Três vãos curtos podem ser mais eficientes que um vão heroico. Cada pilar deve receber sua parte da carga.',
    w:38, terrain:[flat(0,6,7.5),flat(32,38,7.5),pier(14,11.5,1.4),pier(24,11.5,1.4)], anchors:[[6,7.5],[32,7.5],[6,11],[32,11],[13.3,11.5],[14.7,11.5],[23.3,11.5],[24.7,11.5]], vehicle:'caminhao',start:3,goal:35,budget:27000}),
  L({id:15, chapter:'Carga e Vento', env:'industrial', envName:'Pátio', kind:'cargo-clearance', name:'Pátio Industrial',
    hint:'A carga é frágil e o teto de serviço limita a altura. Rigidez importa mais que força bruta.',
    w:34, terrain:[flat(0,8,8),flat(26,34,8),roof(12,22,2.8,4.1)], anchors:[[8,8],[26,8],[8,11],[26,11]], vehicle:'carga',start:4,goal:30,budget:22500}),
  L({id:16, chapter:'Carga e Vento', env:'planalto', envName:'Planalto', kind:'open-wind', name:'Vento Lateral',
    hint:'Sem pilares e sem abrigo: reduza área exposta e trave a ponte nos dois sentidos.',
    w:36, terrain:[flat(0,7,8),flat(29,36,8)], anchors:[[7,8],[29,8],[7,12],[29,12]], vehicle:'van',start:3,goal:33,budget:24500,wind:{base:0.85,gust:3.5,period:4,uplift:0.25}}),

  L({id:17, chapter:'Rios', env:'rio', envName:'Rio', kind:'rising-water', name:'Canal de Cheia',
    hint:'A água sobe. Estruturas profundas viram obstáculos para a correnteza; leve o trabalho para cima.',
    w:32, terrain:[flat(0,9,8),flat(23,32,8)], anchors:[[9,8],[23,8],[9,11],[23,11]], vehicle:'carro',start:3,goal:29,budget:17500,water:{y0:14.5,y1:9.7,rise:4.2,delay:0.6,current:7.5}}),
  L({id:18, chapter:'Rios', env:'rio', envName:'Várzea', kind:'flood-island', name:'Ilha Alagável',
    hint:'A ilha é útil no início do teste e vira quase parte do rio depois. Não dependa dela demais.',
    w:35, terrain:[flat(0,7,8),flat(28,35,8),island(16,18.5,10.3)], anchors:[[7,8],[28,8],[7,11],[28,11],[16,10.3],[18.5,10.3]], vehicle:'van',start:3,goal:32,budget:22000,water:{y0:14.2,y1:9.4,rise:4.8,delay:0.5,current:8.5}}),
  L({id:19, chapter:'Rios', env:'rio', envName:'Eclusa', kind:'lock-pier', name:'Eclusa',
    hint:'A margem direita é mais baixa e o pilar central fica na zona de corrente. Faça cada apoio valer.',
    w:35, terrain:[bank(0,8,8,7),bank(27,35,9.5,8.5),pier(18,11.5,1.8)], anchors:[[8,7],[27,9.5],[8,11],[27,12.5],[17.1,11.5],[18.9,11.5]], vehicle:'caminhao',start:3,goal:32,budget:27000,water:{y0:13.5,y1:9.6,rise:4.5,delay:0.4,current:8}}),
  L({id:20, chapter:'Rios', env:'rio', envName:'Correnteza', kind:'wind-flood', name:'Correnteza Cruzada',
    hint:'Água embaixo, vento em cima e carga solta. Uma ponte flexível demais falha de um jeito novo.',
    w:36, terrain:[flat(0,8,8),flat(28,36,8),roof(3,8,3,3.5),roof(28,33,3.5,3)], anchors:[[8,8],[28,8],[8,3.5],[28,3.5],[8,11.5],[28,11.5]], vehicle:'carga',start:4,goal:32,budget:28500,wind:{base:0.5,gust:2.2,period:5.2},water:{y0:14,y1:9.5,rise:5,delay:0.5,current:8.5}}),

  L({id:21, chapter:'Costa', env:'costa', envName:'Cais', kind:'pontoon-short', name:'Cais Flutuante',
    hint:'A balsa se move. Conecte-a sem tentar obrigá-la a ser uma fundação de concreto.',
    w:32, terrain:[flat(0,8,8),flat(24,32,8)], anchors:[[8,8],[24,8],[8,11],[24,11]], platform:{x:14,y:8,w:4,amp:0.35,period:5.2,anchors:[[14,8],[18,8],[14,9],[18,9]]}, water:{y0:9.7,y1:9.7,rise:1}, vehicle:'carro',start:3,goal:29,budget:17500}),
  L({id:22, chapter:'Costa', env:'costa', envName:'Estuário', kind:'pontoon-long', name:'Estuário',
    hint:'O vão é largo demais para tratar a balsa como detalhe. Faça duas estruturas capazes de respirar.',
    w:38, terrain:[flat(0,7,8),flat(31,38,8)], anchors:[[7,8],[31,8],[7,12],[31,12]], platform:{x:17,y:8,w:4,amp:0.4,period:5.8,anchors:[[17,8],[21,8],[17,9],[21,9]]}, water:{y0:9.7,y1:9.7,rise:1}, vehicle:'van',start:3,goal:35,budget:26000}),
  L({id:23, chapter:'Costa', env:'costa', envName:'Maré', kind:'moving-grade', name:'Maré Alta',
    hint:'A balsa oscila e as margens têm alturas diferentes. Evite juntas rígidas demais perto do movimento.',
    w:36, terrain:[bank(0,8,8,7),bank(28,36,9,8)], anchors:[[8,7],[28,9],[8,11],[28,12]], platform:{x:16,y:8.2,w:4,amp:0.55,period:4.8,anchors:[[16,8.2],[20,8.2],[16,9.2],[20,9.2]]}, water:{y0:9.6,y1:9.2,rise:8,current:2}, vehicle:'carga',start:4,goal:32,budget:28000}),
  L({id:24, chapter:'Costa', env:'costa', envName:'Baía', kind:'bay-cable-pontoon', name:'Travessia da Baía',
    hint:'Cabos, balsa e vento. Separe funções: suspensão onde há rocha, flexibilidade onde há água.',
    w:42, terrain:[flat(0,7,8),flat(35,42,8),roof(2,7,2.2,3),roof(35,40,3,2.2)], anchors:[[7,8],[35,8],[7,3],[35,3],[7,12],[35,12]], platform:{x:19,y:8,w:4,amp:0.45,period:6.2,anchors:[[19,8],[23,8],[19,9],[23,9]]}, water:{y0:9.7,y1:9.7,rise:1}, wind:{base:0.45,gust:2.1,period:5.5}, vehicle:'van',start:3,goal:39,budget:34000}),

  L({id:25, chapter:'Montanha', env:'montanha', envName:'Serra', kind:'high-low', name:'Passo Alto',
    hint:'Você começa alto e termina baixo. A melhor ponte acompanha a encosta sem criar uma montanha-russa.',
    w:36, terrain:[bank(0,9,8,4.8),bank(27,36,11,8.5)], anchors:[[9,4.8],[27,11],[9,2.2],[27,14]], vehicle:'van',start:3,goal:33,budget:22000}),
  L({id:26, chapter:'Montanha', env:'montanha', envName:'Desfiladeiro', kind:'abyss-cable', name:'Desfiladeiro',
    hint:'Quase não existe apoio por baixo. Faça a ponte trabalhar a partir das paredes do desfiladeiro.',
    w:40, terrain:[bank(0,7,8,6.5),bank(33,40,6.5,8),roof(2,7,1.2,2),roof(33,38,2,1.2)], anchors:[[7,6.5],[33,6.5],[7,2],[33,2],[7,13],[33,13]], vehicle:'carro',start:3,goal:37,budget:31000}),
  L({id:27, chapter:'Montanha', env:'montanha', envName:'Túnel', kind:'roofed-span', name:'Túnel Quebrado',
    hint:'O teto impede uma treliça alta. Explore o espaço abaixo da pista e materiais que tolerem membros longos.',
    w:35, terrain:[flat(0,8,8),flat(27,35,8),roof(11,24,2.3,4.4)], anchors:[[8,8],[27,8],[8,12.5],[27,12.5]], vehicle:'van',start:3,goal:32,budget:23500}),
  L({id:28, chapter:'Montanha', env:'montanha', envName:'Crista', kind:'uplift', name:'Vento de Crista',
    hint:'Rajadas agora levantam a estrutura. O que funciona em peso próprio pode falhar quando a carga muda de sentido.',
    w:38, terrain:[bank(0,7,8,6.5),bank(31,38,7.5,8)], anchors:[[7,6.5],[31,7.5],[7,11.5],[31,12]], vehicle:'carga',start:4,goal:34,budget:28500,wind:{base:0.65,gust:3.2,period:4.3,uplift:0.8}}),

  L({id:29, chapter:'Cidade', env:'cidade', envName:'Ferrovia', kind:'rail-cut', name:'Corte Ferroviário',
    hint:'Dois pilares deixam um corredor livre no centro. Trate cada vão como parte de uma estrutura contínua.',
    w:38, terrain:[flat(0,8,8),flat(30,38,8),pier(14,12,1.2),pier(24,12,1.2)], anchors:[[8,8],[30,8],[8,11],[30,11],[13.4,12],[14.6,12],[23.4,12],[24.6,12]], vehicle:'caminhao',start:4,goal:34,budget:28000}),
  L({id:30, chapter:'Cidade', env:'cidade', envName:'Canal', kind:'urban-canal', name:'Canal Urbano',
    hint:'Paredes altas, água estreita e pouco espaço. Uma ponte compacta é melhor que uma ponte monumental.',
    w:34, terrain:[bank(0,10,8,6),bank(24,34,6,8)], anchors:[[10,6],[24,6],[10,11],[24,11]], vehicle:'van',start:3,goal:31,budget:20500,water:{y0:11.5,y1:10.2,rise:6,current:3}}),
  L({id:31, chapter:'Cidade', env:'industrial', envName:'Manutenção', kind:'one-sided-high', name:'Ponte de Serviço',
    hint:'Só um lado oferece ancoragem alta. Faça uma estrutura que aceite ser desigual.',
    w:36, terrain:[flat(0,7,9),flat(29,36,9),roof(24,29,2.5,3.5)], anchors:[[7,9],[29,9],[7,12],[29,3.5],[29,12]], vehicle:'carga',start:4,goal:32,budget:25500}),
  L({id:32, chapter:'Cidade', env:'industrial', envName:'Terminal', kind:'heavy-clearance', name:'Carga Especial',
    hint:'O caminhão é pesado e o pórtico limita a altura no centro. Rigidez, compressão e caminho de carga têm de coexistir.',
    w:40, terrain:[flat(0,8,8),flat(32,40,8),roof(15,25,2.5,4)], anchors:[[8,8],[32,8],[8,12],[32,12]], vehicle:'caminhao',start:4,goal:36,budget:33000}),

  L({id:33, chapter:'Obras Maiores', env:'planalto', envName:'Viaduto', kind:'three-major-spans', name:'Três Vãos',
    hint:'Dois pilares, três vãos e um caminhão. Evite resolver cada trecho isoladamente: a ponte inteira compartilha esforços.',
    w:42, terrain:[flat(0,6,8),flat(36,42,8),pier(15,12,1.6),pier(27,12,1.6)], anchors:[[6,8],[36,8],[6,12],[36,12],[14.2,12],[15.8,12],[26.2,12],[27.8,12]], vehicle:'caminhao',start:3.5,goal:38.5,budget:34000}),
  L({id:34, chapter:'Obras Maiores', env:'montanha', envName:'Vale partido', kind:'broken-grade', name:'Vale Partido',
    hint:'O apoio central fica baixo e fora do alinhamento da pista. Use-o para estabilizar, não para forçar uma estrada impossível.',
    w:40, terrain:[bank(0,8,8,5.5),bank(32,40,7,9),island(19,21.5,11.5)], anchors:[[8,5.5],[32,7],[8,11],[32,11],[19,11.5],[21.5,11.5]], vehicle:'carga',start:4,goal:36,budget:32000}),
  L({id:35, chapter:'Obras Maiores', env:'costa', envName:'Estuário', kind:'storm-pontoon', name:'Tempestade no Estuário',
    hint:'A plataforma move, a maré sobe e o vento entra de lado. Deixe partes diferentes da ponte fazerem trabalhos diferentes.',
    w:42, terrain:[flat(0,7,8),flat(35,42,8),roof(2,7,2.4,3.2),roof(35,40,3.2,2.4)], anchors:[[7,8],[35,8],[7,3.2],[35,3.2],[7,12],[35,12]], platform:{x:19,y:8,w:4,amp:0.55,period:5.2,anchors:[[19,8],[23,8],[19,9],[23,9]]}, water:{y0:12.5,y1:9.4,rise:5.5,delay:0.5,current:6.5}, wind:{base:0.7,gust:3.0,period:4.8,uplift:0.35}, vehicle:'carga',start:4,goal:38,budget:39000}),
  L({id:36, chapter:'Obras Maiores', env:'canion', envName:'Grande cânion', kind:'finale', name:'O Grande Vão',
    hint:'A última travessia mistura grande distância, paredes altas, plataforma móvel e caminhão. Não existe uma única ponte certa.',
    w:46, terrain:[bank(0,6,8,7),bank(40,46,7,8),roof(1,6,1.6,2.6),roof(40,45,2.6,1.6),pier(23,13,1.4)], anchors:[[6,7],[40,7],[6,2.6],[40,2.6],[6,13],[40,13],[22.3,13],[23.7,13]], platform:{x:28,y:8,w:4,amp:0.35,period:6.5,anchors:[[28,8],[32,8],[28,9],[32,9]]}, water:{y0:10.2,y1:9.6,rise:8,current:3}, wind:{base:0.45,gust:2.2,period:5.7,uplift:0.2}, vehicle:'caminhao',start:3.5,goal:42.5,budget:48000})
];

var BRIEFS = {
  1:{type:'compact',label:'Poucas barras',note:'Conclua com no máximo 12 barras.',maxBeams:12,reward:30},
  2:{type:'calm',label:'Rampa tranquila',note:'Conclua com esforço máximo de 78%.',maxStress:78,reward:30},
  3:{type:'support',label:'Use a ilha',note:'Use ao menos uma âncora da ilha central.',anchorSet:[[13,10],[16,10]],minAnchors:1,reward:35},
  4:{type:'economy',label:'Aço com disciplina',note:'Poupe pelo menos 20% do orçamento.',saveRatio:.20,reward:35},
  5:{type:'support',label:'Apoio deslocado',note:'Use ao menos uma âncora do apoio central e fique abaixo de 85% de esforço.',anchorSet:[[14,9.5],[16.5,9.5]],minAnchors:1,maxStress:85,reward:40},
  6:{type:'compact',label:'Treliça limpa',note:'Conclua o grande vão com no máximo 24 barras.',maxBeams:24,reward:35},
  7:{type:'compact',label:'Suspensão enxuta',note:'Conclua com no máximo 22 barras.',maxBeams:22,reward:35},
  8:{type:'economy',label:'Assimetria eficiente',note:'Poupe pelo menos 15% do orçamento.',saveRatio:.15,reward:35},
  9:{type:'support',label:'Agulha útil',note:'Use ao menos uma âncora da agulha central.',anchorSet:[[16.4,11.5],[17.6,11.5]],minAnchors:1,reward:40},
  10:{type:'compact',label:'Baixo perfil',note:'Conclua com no máximo 22 barras.',maxBeams:22,reward:35},
  11:{type:'calm',label:'Descida controlada',note:'Conclua com esforço máximo de 75%.',maxStress:75,reward:40},
  12:{type:'calm',label:'Contra o vento',note:'Conclua com esforço máximo de 70%.',maxStress:70,reward:45},
  13:{type:'support',label:'Dois apoios',note:'Use âncoras dos dois pilares intermediários.',anchorGroups:[[[13.25,12],[14.75,12]],[[21.25,12],[22.75,12]]],minAnchorGroups:2,reward:45},
  14:{type:'support',label:'Viaduto de verdade',note:'Use pelo menos um ponto de cada pilar.',anchorGroups:[[[13.3,11.5],[14.7,11.5]],[[23.3,11.5],[24.7,11.5]]],minAnchorGroups:2,reward:45},
  15:{type:'calm',label:'Carga intacta',note:'Conclua com esforço máximo de 65%.',maxStress:65,reward:45},
  16:{type:'light',label:'Leve ao vento',note:'Mantenha a densidade estrutural média em até 0,006.',maxAvgDensity:.006,reward:45},
  17:{type:'compact',label:'Fora da corrente',note:'Conclua com no máximo 20 barras estruturais (sem contar pista).',maxNonRoad:20,reward:40},
  18:{type:'support',label:'Ilha sem dependência',note:'Use uma âncora da ilha e fique abaixo de 82% de esforço.',anchorSet:[[16,10.3],[18.5,10.3]],minAnchors:1,maxStress:82,reward:45},
  19:{type:'support',label:'Pilar na água',note:'Use uma âncora do pilar central.',anchorSet:[[17.1,11.5],[18.9,11.5]],minAnchors:1,reward:40},
  20:{type:'calm',label:'Tudo sob controle',note:'Água + vento + carga com esforço máximo de 70%.',maxStress:70,reward:50},
  21:{type:'support',label:'Conexão flexível',note:'Use ao menos uma âncora da balsa.',anchorSet:[[14,8],[18,8],[14,9],[18,9]],minAnchors:1,reward:40},
  22:{type:'support',label:'Duas conexões',note:'Use pelo menos duas âncoras da balsa.',anchorSet:[[17,8],[21,8],[17,9],[21,9]],minAnchors:2,reward:45},
  23:{type:'support',label:'Maré controlada',note:'Use duas âncoras da balsa e fique abaixo de 80% de esforço.',anchorSet:[[16,8.2],[20,8.2],[16,9.2],[20,9.2]],minAnchors:2,maxStress:80,reward:50},
  24:{type:'support',label:'Pendure a baía',note:'Use as duas âncoras altas das margens.',anchorSet:[[7,3],[35,3]],minAnchors:2,reward:50},
  25:{type:'compact',label:'Descida limpa',note:'Conclua com no máximo 26 barras.',maxBeams:26,reward:40},
  26:{type:'support',label:'Paredes do desfiladeiro',note:'Use as duas âncoras altas.',anchorSet:[[7,2],[33,2]],minAnchors:2,reward:50},
  27:{type:'compact',label:'Túnel enxuto',note:'Conclua com no máximo 22 barras estruturais.',maxNonRoad:22,reward:45},
  28:{type:'calm',label:'Crista estável',note:'Conclua com esforço máximo de 68%.',maxStress:68,reward:50},
  29:{type:'support',label:'Corredor livre',note:'Use ao menos um ponto de cada pilar.',anchorGroups:[[[13.4,12],[14.6,12]],[[23.4,12],[24.6,12]]],minAnchorGroups:2,reward:45},
  30:{type:'economy',label:'Obra urbana',note:'Poupe pelo menos 20% do orçamento.',saveRatio:.20,reward:40},
  31:{type:'support',label:'Ancoragem única',note:'Use a âncora alta da margem direita.',anchorSet:[[29,3.5]],minAnchors:1,reward:45},
  32:{type:'calm',label:'Carga especial',note:'Caminhão pesado com esforço máximo de 72%.',maxStress:72,reward:50},
  33:{type:'support',label:'Três vãos contínuos',note:'Use ao menos um ponto de cada pilar intermediário.',anchorGroups:[[[14.2,12],[15.8,12]],[[26.2,12],[27.8,12]]],minAnchorGroups:2,reward:50},
  34:{type:'support',label:'Vale partido',note:'Use ao menos uma âncora da ilha baixa.',anchorSet:[[19,11.5],[21.5,11.5]],minAnchors:1,reward:45},
  35:{type:'support',label:'Estuário vivo',note:'Use duas âncoras da balsa e fique abaixo de 75% de esforço.',anchorSet:[[19,8],[23,8],[19,9],[23,9]],minAnchors:2,maxStress:75,reward:55},
  36:{type:'master',label:'Projeto de mestre',note:'Use pelo menos três grupos de apoio especiais e termine abaixo de 75% de esforço.',anchorGroups:[[[6,2.6]],[[40,2.6]],[[22.3,13],[23.7,13]],[[28,8],[32,8],[28,9],[32,9]]],minAnchorGroups:3,maxStress:75,reward:75}
};
LEVELS.forEach(function (lv) { lv.brief = BRIEFS[lv.id]; });

var SANDBOX_TERRAINS = [
  L({id:'sb0',name:'Vale curto',chapter:'Sandbox',env:'campina',envName:'Vale',kind:'sandbox-short',sandbox:true,w:26,terrain:[flat(0,9,8),flat(17,26,8)],anchors:[[9,8],[17,8],[9,11],[17,11]],start:3,goal:23,budget:Infinity,vehicle:'carro',mats:['road','wood','steel','cable']}),
  L({id:'sb1',name:'Cânion alto',chapter:'Sandbox',env:'canion',envName:'Cânion',kind:'sandbox-canyon',sandbox:true,w:34,terrain:[flat(0,7,8),flat(27,34,8),roof(2,7,2.2,3),roof(27,32,3,2.2)],anchors:[[7,8],[27,8],[7,3],[27,3],[7,12],[27,12]],start:3,goal:31,budget:Infinity,vehicle:'carro',mats:['road','wood','steel','cable']}),
  L({id:'sb2',name:'Dois pilares',chapter:'Sandbox',env:'industrial',envName:'Viaduto',kind:'sandbox-piers',sandbox:true,w:38,terrain:[flat(0,7,8),flat(31,38,8),pier(14,12,1.4),pier(24,12,1.4)],anchors:[[7,8],[31,8],[7,12],[31,12],[13.3,12],[14.7,12],[23.3,12],[24.7,12]],start:3,goal:35,budget:Infinity,vehicle:'carro',mats:['road','wood','steel','cable']}),
  L({id:'sb3',name:'Margens desniveladas',chapter:'Sandbox',env:'montanha',envName:'Serra',kind:'sandbox-grade',sandbox:true,w:36,terrain:[bank(0,9,8,5),bank(27,36,10.5,8.5)],anchors:[[9,5],[27,10.5],[9,12],[27,13]],start:3,goal:33,budget:Infinity,vehicle:'carro',mats:['road','wood','steel','cable']}),
  L({id:'sb4',name:'Ilha central',chapter:'Sandbox',env:'rio',envName:'Rio',kind:'sandbox-island',sandbox:true,w:36,terrain:[flat(0,7,8),flat(29,36,8),island(17,19,10)],anchors:[[7,8],[29,8],[7,12],[29,12],[17,10],[19,10]],start:3,goal:33,budget:Infinity,vehicle:'carro',mats:['road','wood','steel','cable']}),
  L({id:'sb5',name:'Balsa',chapter:'Sandbox',env:'costa',envName:'Costa',kind:'sandbox-pontoon',sandbox:true,w:38,terrain:[flat(0,7,8),flat(31,38,8)],anchors:[[7,8],[31,8],[7,12],[31,12]],platform:{x:17,y:8,w:4,amp:0.45,period:5.5,anchors:[[17,8],[21,8],[17,9],[21,9]]},water:{y0:9.7,y1:9.7,rise:1},start:3,goal:35,budget:Infinity,vehicle:'carro',mats:['road','wood','steel','cable']})
];
SANDBOX_TERRAINS.forEach(function (s, i) { s.id = 'sb' + i; s.seed = 900 + i * 31; });
var api = { LEVELS: LEVELS, SANDBOX_TERRAINS: SANDBOX_TERRAINS, H: H, CAMPAIGN_COUNT: LEVELS.length };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VaoLevels = api;
})(this);
