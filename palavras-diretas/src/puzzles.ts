import { Difficulty, Direction, Entry, Point, Puzzle } from './types';

export const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '').toUpperCase();

type Spoke = { answer: string; text: string; coreIndex: number; answerIndex: number };
type Star = { id: string; title: string; difficulty: Difficulty; core: string; coreClue: string; spokes: Spoke[] };

const point = (x: number, y: number): Point => ({ x, y });

function entry(id: string, text: string, answer: string, direction: Direction, clueCell: Point, startingCell: Point): Entry {
  const normalizedAnswer = normalize(answer);
  const cells = [...normalizedAnswer].map((_, index) => direction === 'right' ? point(startingCell.x + index, startingCell.y) : point(startingCell.x, startingCell.y + index));
  return { id, text, answer, normalizedAnswer, direction, clueCell, startingCell, cells };
}

function makeStar(spec: Star): Puzzle {
  const core = normalize(spec.core);
  const centerY = 6;
  const coreStartX = 3;
  const entries: Entry[] = [entry(`${spec.id}-core`, spec.coreClue, spec.core, 'right', point(coreStartX - 1, centerY), point(coreStartX, centerY))];
  spec.spokes.forEach((spoke, index) => {
    const word = normalize(spoke.answer);
    if (core[spoke.coreIndex] !== word[spoke.answerIndex]) throw new Error(`${spec.id}: cruzamento inválido para ${word}`);
    const start = point(coreStartX + spoke.coreIndex, centerY - spoke.answerIndex);
    entries.push(entry(`${spec.id}-${index}`, spoke.text, spoke.answer, 'down', point(start.x, start.y - 1), start));
  });
  const maxX = Math.max(...entries.flatMap(item => [...item.cells, item.clueCell].map(cell => cell.x)));
  const maxY = Math.max(...entries.flatMap(item => [...item.cells, item.clueCell].map(cell => cell.y)));
  return { id: spec.id, title: spec.title, difficulty: spec.difficulty, width: Math.max(12, maxX + 1), height: Math.max(12, maxY + 1), entries };
}

const stars: Star[] = [
  { id: 'familia', title: 'Laços de casa', difficulty: 'Fácil', core: 'FAMÍLIA', coreClue: 'Pessoas unidas por parentesco', spokes: [{ answer: 'MAE', text: 'Genitora', coreIndex: 1, answerIndex: 1 }, { answer: 'PAI', text: 'Genitor', coreIndex: 3, answerIndex: 2 }, { answer: 'LAR', text: 'Casa; residência', coreIndex: 4, answerIndex: 0 }, { answer: 'TIO', text: 'Irmão de pai ou mãe', coreIndex: 5, answerIndex: 1 }] },
  { id: 'cozinha', title: 'Mesa posta', difficulty: 'Fácil', core: 'COZINHA', coreClue: 'Cômodo onde se prepara comida', spokes: [{ answer: 'CHA', text: 'Bebida de ervas', coreIndex: 0, answerIndex: 0 }, { answer: 'OVO', text: 'Ingrediente com casca', coreIndex: 1, answerIndex: 0 }, { answer: 'ALHO', text: 'Tempero de aroma forte', coreIndex: 5, answerIndex: 2 }, { answer: 'PANELA', text: 'Utensílio para cozinhar', coreIndex: 6, answerIndex: 1 }] },
  { id: 'musica', title: 'Sons e ritmos', difficulty: 'Fácil', core: 'MÚSICA', coreClue: 'Arte organizada em sons', spokes: [{ answer: 'SOM', text: 'O que se escuta', coreIndex: 2, answerIndex: 0 }, { answer: 'RITMO', text: 'Pulsação de uma canção', coreIndex: 3, answerIndex: 1 }, { answer: 'CANTO', text: 'Voz em melodia', coreIndex: 4, answerIndex: 0 }, { answer: 'NOTA', text: 'Dó, ré ou mi', coreIndex: 5, answerIndex: 3 }] },
  { id: 'animais', title: 'Bichos do mundo', difficulty: 'Fácil', core: 'ANIMAIS', coreClue: 'Seres vivos que não são plantas', spokes: [{ answer: 'GATO', text: 'Felino doméstico', coreIndex: 0, answerIndex: 1 }, { answer: 'MICO', text: 'Pequeno primata', coreIndex: 2, answerIndex: 1 }, { answer: 'RATO', text: 'Roedor urbano', coreIndex: 4, answerIndex: 1 }, { answer: 'URSO', text: 'Mamífero de patas fortes', coreIndex: 6, answerIndex: 2 }] },
  { id: 'viagem', title: 'Partida marcada', difficulty: 'Fácil', core: 'VIAGEM', coreClue: 'Deslocamento para outro lugar', spokes: [{ answer: 'AVIAO', text: 'Transporte que voa', coreIndex: 1, answerIndex: 2 }, { answer: 'MAPA', text: 'Representação de um lugar', coreIndex: 2, answerIndex: 1 }, { answer: 'GUIA', text: 'Quem orienta o visitante', coreIndex: 3, answerIndex: 0 }, { answer: 'TREM', text: 'Transporte sobre trilhos', coreIndex: 4, answerIndex: 2 }] },
  { id: 'literatura', title: 'Página aberta', difficulty: 'Médio', core: 'LITERATURA', coreClue: 'Arte escrita em prosa ou verso', spokes: [{ answer: 'LIVRO', text: 'Conjunto de páginas encadernadas', coreIndex: 0, answerIndex: 0 }, { answer: 'TEXTO', text: 'Conjunto de palavras escritas', coreIndex: 2, answerIndex: 0 }, { answer: 'RIMA', text: 'Semelhança sonora entre versos', coreIndex: 4, answerIndex: 0 }, { answer: 'AUTOR', text: 'Quem escreve uma obra', coreIndex: 5, answerIndex: 0 }] },
  { id: 'astronomia', title: 'Céu noturno', difficulty: 'Médio', core: 'ASTRONOMIA', coreClue: 'Estudo dos astros', spokes: [{ answer: 'LUA', text: 'Satélite natural da Terra', coreIndex: 0, answerIndex: 2 }, { answer: 'ORBITA', text: 'Trajetória de um astro', coreIndex: 3, answerIndex: 1 }, { answer: 'SOL', text: 'Estrela do nosso sistema', coreIndex: 4, answerIndex: 1 }, { answer: 'COMETA', text: 'Astro com cauda luminosa', coreIndex: 7, answerIndex: 2 }] },
  { id: 'geografia', title: 'Mapa do planeta', difficulty: 'Médio', core: 'GEOGRAFIA', coreClue: 'Estudo da Terra e seus lugares', spokes: [{ answer: 'GLOBO', text: 'Modelo esférico do planeta', coreIndex: 0, answerIndex: 0 }, { answer: 'RIO', text: 'Curso natural de água', coreIndex: 4, answerIndex: 0 }, { answer: 'MAPA', text: 'Desenho que orienta caminhos', coreIndex: 5, answerIndex: 1 }, { answer: 'ILHA', text: 'Terra cercada de água', coreIndex: 7, answerIndex: 0 }] },
  { id: 'fotografia', title: 'Olhar em foco', difficulty: 'Médio', core: 'FOTOGRAFIA', coreClue: 'Registro de imagens pela luz', spokes: [{ answer: 'FOTO', text: 'Imagem registrada', coreIndex: 0, answerIndex: 0 }, { answer: 'LENTE', text: 'Peça de vidro da câmera', coreIndex: 2, answerIndex: 3 }, { answer: 'CAMERA', text: 'Aparelho que registra imagens', coreIndex: 6, answerIndex: 1 }, { answer: 'FILME', text: 'Obra de cinema', coreIndex: 8, answerIndex: 1 }] },
  { id: 'historia', title: 'Rastros do tempo', difficulty: 'Médio', core: 'HISTÓRIA', coreClue: 'Narrativa do passado humano', spokes: [{ answer: 'LIVRO', text: 'Objeto de leitura', coreIndex: 1, answerIndex: 1 }, { answer: 'TEMPO', text: 'Aquilo que passa', coreIndex: 3, answerIndex: 0 }, { answer: 'REI', text: 'Monarca', coreIndex: 5, answerIndex: 0 }, { answer: 'PASSADO', text: 'O que já aconteceu', coreIndex: 7, answerIndex: 1 }] },
  { id: 'filosofia', title: 'Perguntas antigas', difficulty: 'Difícil', core: 'FILOSOFIA', coreClue: 'Investigação crítica sobre ideias', spokes: [{ answer: 'IDEIA', text: 'Pensamento ou conceito', coreIndex: 1, answerIndex: 0 }, { answer: 'LOGICA', text: 'Estudo do raciocínio válido', coreIndex: 2, answerIndex: 0 }, { answer: 'RAZAO', text: 'Faculdade de pensar', coreIndex: 3, answerIndex: 4 }, { answer: 'SABER', text: 'Conhecimento adquirido', coreIndex: 4, answerIndex: 0 }] },
  { id: 'biodiversidade', title: 'Vida em variedade', difficulty: 'Difícil', core: 'BIODIVERSIDADE', coreClue: 'Variedade de vida em um ambiente', spokes: [{ answer: 'BIO', text: 'Prefixo ligado à vida', coreIndex: 0, answerIndex: 0 }, { answer: 'VIDA', text: 'O oposto de morte', coreIndex: 5, answerIndex: 0 }, { answer: 'ESPECIE', text: 'Grupo de seres semelhantes', coreIndex: 6, answerIndex: 0 }, { answer: 'HABITAT', text: 'Lugar onde uma espécie vive', coreIndex: 11, answerIndex: 1 }] },
  { id: 'arquitetura', title: 'Forma construída', difficulty: 'Difícil', core: 'ARQUITETURA', coreClue: 'Arte de projetar edifícios', spokes: [{ answer: 'CASA', text: 'Moradia', coreIndex: 0, answerIndex: 1 }, { answer: 'PREDIO', text: 'Edificação de vários andares', coreIndex: 1, answerIndex: 1 }, { answer: 'OBRA', text: 'Construção em andamento', coreIndex: 9, answerIndex: 2 }, { answer: 'PLANTA', text: 'Desenho técnico de uma construção', coreIndex: 10, answerIndex: 2 }] },
  { id: 'linguistica', title: 'Palavra e sistema', difficulty: 'Difícil', core: 'LINGUÍSTICA', coreClue: 'Estudo científico da linguagem', spokes: [{ answer: 'LETRA', text: 'Símbolo de escrita', coreIndex: 0, answerIndex: 0 }, { answer: 'SINTAXE', text: 'Organização das palavras na frase', coreIndex: 1, answerIndex: 1 }, { answer: 'GRAMATICA', text: 'Conjunto de regras de uma língua', coreIndex: 3, answerIndex: 0 }, { answer: 'SOM', text: 'Elemento percebido pela audição', coreIndex: 6, answerIndex: 0 }] },
  { id: 'ecossistema', title: 'Rede natural', difficulty: 'Difícil', core: 'ECOSSISTEMA', coreClue: 'Organismos e ambiente em interação', spokes: [{ answer: 'CLIMA', text: 'Padrão de tempo de uma região', coreIndex: 1, answerIndex: 0 }, { answer: 'FLORA', text: 'Conjunto de plantas de um lugar', coreIndex: 2, answerIndex: 2 }, { answer: 'BIOMA', text: 'Grande conjunto ecológico', coreIndex: 9, answerIndex: 3 }, { answer: 'FAUNA', text: 'Conjunto de animais de uma região', coreIndex: 10, answerIndex: 1 }] }
];

export const puzzles = stars.map(makeStar);
