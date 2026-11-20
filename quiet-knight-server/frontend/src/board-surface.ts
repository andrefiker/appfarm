/** The same light/dark parity and base colors as the interactive board. */
export function sculptorTile(square: string) {
 return (square.charCodeAt(0) - 97 + Number(square[1])) % 2 === 1 ? '#978044' : '#e3e3d9';
}
