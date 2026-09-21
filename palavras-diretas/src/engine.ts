import { Entry, Point, Progress, Puzzle, keyOf } from './types';
import { normalize } from './puzzles';

export type Validation = { valid: boolean; errors: string[] };
export const blankProgress = (): Progress => ({ letters: {}, revealed: [], checked: [], elapsedMs: 0, hints: 0 });
export const cellEntries = (puzzle: Puzzle, cell: Point) => puzzle.entries.filter(entry => entry.cells.some(item => keyOf(item) === keyOf(cell)));
export const entryAtClue = (puzzle: Puzzle, cell: Point) => puzzle.entries.find(entry => keyOf(entry.clueCell) === keyOf(cell));
export const solutionAt = (entries: Entry[], cell: Point) => entries.map(entry => entry.cells.findIndex(item => keyOf(item) === keyOf(cell))).filter(index => index >= 0).map((index, i) => entries[i].normalizedAnswer[index]);
export function expectedLetter(puzzle: Puzzle, cell: Point) {
  const values = cellEntries(puzzle, cell).map(entry => entry.normalizedAnswer[entry.cells.findIndex(item => keyOf(item) === keyOf(cell))]);
  return values[0] || '';
}
export function validatePuzzle(puzzle: Puzzle): Validation {
  const errors: string[] = [];
  const answerCells = new Map<string, string>();
  const clueCells = new Set<string>();
  if (!puzzle.id || puzzle.width < 1 || puzzle.height < 1 || puzzle.entries.length < 2) errors.push('Estrutura de puzzle inválida.');
  for (const entry of puzzle.entries) {
    if (!entry.id || !entry.text || !entry.normalizedAnswer || entry.normalizedAnswer !== normalize(entry.answer)) errors.push(`Entrada malformada: ${entry.id || '?'}`);
    if (entry.cells.length !== entry.normalizedAnswer.length) errors.push(`Comprimento inválido: ${entry.id}`);
    if ((entry.direction !== 'right' && entry.direction !== 'down') || !entry.clueCell || !entry.startingCell) errors.push(`Direção ou pista inválida: ${entry.id}`);
    const expectedStart = entry.direction === 'right' ? { x: entry.clueCell.x + 1, y: entry.clueCell.y } : { x: entry.clueCell.x, y: entry.clueCell.y + 1 };
    if (keyOf(expectedStart) !== keyOf(entry.startingCell)) errors.push(`Seta não aponta para resposta: ${entry.id}`);
    const clueKey = keyOf(entry.clueCell);
    if (clueCells.has(clueKey)) errors.push(`Duas pistas na mesma célula: ${entry.id}`);
    clueCells.add(clueKey);
    for (let index = 0; index < entry.cells.length; index++) {
      const cell = entry.cells[index]; const cellKey = keyOf(cell);
      if (!Number.isInteger(cell.x) || !Number.isInteger(cell.y) || cell.x < 0 || cell.y < 0 || cell.x >= puzzle.width || cell.y >= puzzle.height) errors.push(`Resposta fora do tabuleiro: ${entry.id}`);
      const letter = entry.normalizedAnswer[index]; const prior = answerCells.get(cellKey);
      if (prior && prior !== letter) errors.push(`Colisão conflitante em ${cellKey}`);
      answerCells.set(cellKey, letter);
    }
  }
  for (const clueKey of clueCells) if (answerCells.has(clueKey)) errors.push(`Pista sobreposta a resposta: ${clueKey}`);
  if (!answerCells.size) errors.push('Não há células jogáveis.');
  return { valid: errors.length === 0, errors };
}
export function validatePack(pack: Puzzle[]) {
  const ids = new Set<string>(); const errors: string[] = [];
  for (const puzzle of pack) { if (ids.has(puzzle.id)) errors.push(`ID repetido: ${puzzle.id}`); ids.add(puzzle.id); errors.push(...validatePuzzle(puzzle).errors.map(error => `${puzzle.id}: ${error}`)); }
  return { valid: errors.length === 0, errors };
}
export function isComplete(puzzle: Puzzle, progress: Progress) {
  return puzzle.entries.every(entry => entry.cells.every((cell, index) => progress.letters[keyOf(cell)] === entry.normalizedAnswer[index]));
}
export function completionPercent(puzzle: Puzzle, progress: Progress) {
  const unique = new Set(puzzle.entries.flatMap(entry => entry.cells.map(keyOf)));
  return Math.round([...unique].filter(key => Boolean(progress.letters[key])).length / unique.size * 100);
}
