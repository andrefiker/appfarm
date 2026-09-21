export type Direction = 'right' | 'down';
export type Difficulty = 'Fácil' | 'Médio' | 'Difícil';
export type Point = { x: number; y: number };
export type Entry = { id: string; text: string; answer: string; normalizedAnswer: string; direction: Direction; clueCell: Point; startingCell: Point; cells: Point[] };
export type Puzzle = { id: string; title: string; difficulty: Difficulty; width: number; height: number; entries: Entry[] };
export type Progress = { letters: Record<string, string>; revealed: string[]; checked: string[]; startedAt?: number; elapsedMs: number; completedAt?: number; hints: number };
export type Settings = { theme: 'light' | 'dark'; showMistakes: boolean; sound: boolean; vibration: boolean; autoAdvance: boolean };
export const keyOf = ({ x, y }: Point) => `${x},${y}`;
