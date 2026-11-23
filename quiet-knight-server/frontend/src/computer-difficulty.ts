/** Practice steps are not ratings. Levels 3-10 keep their existing engine settings. */
export const computerLevels: readonly number[] = [0.25,0.5,0.75,1,1.25,1.5,1.75,2,2.25,2.5,2.75,3,4,5,6,7,8,9,10];
export function isComputerLevel(value: unknown): value is number {
 return typeof value==='number' && computerLevels.includes(value);
}
export function computerLevelIndex(level: number): number {
 const index=computerLevels.indexOf(level);
 return index<0?computerLevels.indexOf(3):index;
}
export function nextComputerLevel(level: number, direction: -1|1): number {
 return computerLevels[Math.max(0,Math.min(computerLevels.length-1,computerLevelIndex(level)+direction))];
}
const practiceErrorRates = [0.9,0.82,0.73,0.64,0.55,0.46,0.37,0.28,0.19,0.12,0.05] as const;
export function practiceErrorRate(level: number): number {
 return practiceErrorRates[computerLevels.indexOf(level)] ?? 0;
}
/** Candidates are already legal. Returning null means use the regular engine. */
export function forgivingMove<T>(legal: readonly T[], level: number, random=Math.random): T|null {
 const chance=practiceErrorRate(level);
 if(!chance||!legal.length||random()>=chance)return null;
 return legal[Math.min(legal.length-1,Math.max(0,Math.floor(random()*legal.length)))]??null;
}
