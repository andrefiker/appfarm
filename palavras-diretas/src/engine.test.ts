import { describe, expect, it } from 'vitest';
import { blankProgress, cellEntries, completionPercent, expectedLetter, isComplete, validatePack } from './engine';
import { puzzles } from './puzzles';
import { keyOf } from './types';

describe('pack de palavras diretas', () => {
  it('valida os 15 puzzles completos sem colisões', () => { expect(puzzles).toHaveLength(15); expect(validatePack(puzzles)).toEqual({ valid: true, errors: [] }); });
  it('reconhece cruzamento, preenchimento e conclusão', () => { const puzzle = puzzles[0]; const crossing = puzzle.entries[0].cells[1]; expect(cellEntries(puzzle, crossing).length).toBeGreaterThan(1); let progress = blankProgress(); puzzle.entries.forEach(entry => entry.cells.forEach(cell => { progress.letters[keyOf(cell)] = expectedLetter(puzzle, cell); })); expect(completionPercent(puzzle, progress)).toBe(100); expect(isComplete(puzzle, progress)).toBe(true); });
  it('mantém o puzzle incompleto com uma letra errada', () => { const puzzle = puzzles[1]; const progress = blankProgress(); progress.letters[keyOf(puzzle.entries[0].cells[0])] = 'Z'; expect(isComplete(puzzle, progress)).toBe(false); });
});
