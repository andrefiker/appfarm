/** The same light/dark parity and stone color family as the interactive board. */
export function sculptorTile(square: string) {
 return (square.charCodeAt(0) - 97 + Number(square[1])) % 2 === 1 ? '#59524d' : '#ceba9f';
}
