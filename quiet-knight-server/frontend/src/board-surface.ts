/** The same light/dark parity and brushed-metal base colors as the interactive board. */
export function sculptorTile(square: string) {
 return (square.charCodeAt(0) - 97 + Number(square[1])) % 2 === 1 ? '#34563f' : '#d5bd87';
}
