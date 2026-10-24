export const atmospheres = ['Classic Wood','Midnight','Ivory','Forest','Animal Kingdom','Walnut','Library','Rain','Royal Meadow'] as const;
export type Atmosphere = typeof atmospheres[number];
export const pieceSets = ['classic','kawaii-faces','animal-kingdom'] as const;
export type PieceSet = typeof pieceSets[number];
export const REFERENCE_TABLE_UPGRADE = 'qk-pictured-table-upgrade-v1';
type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

// Apply the requested design once, including existing Classic installations.
// Only these three appearance keys are migrated; never game or identity data.
export function loadTablePreferences(storage?: PreferenceStorage) {
 const reference = {atmosphere:'Walnut' as Atmosphere, pieceSet:'kawaii-faces' as PieceSet, zen:false};
 try {
  if (!storage) return reference;
  if (storage.getItem(REFERENCE_TABLE_UPGRADE) !== 'applied') {
   storage.setItem('qk-atmosphere-v1', reference.atmosphere);
   storage.setItem('qk-piece-set-v1', reference.pieceSet);
   storage.setItem('qk-zen-table-v1', 'false');
   // Write last so failed storage operations can be retried next launch.
   storage.setItem(REFERENCE_TABLE_UPGRADE, 'applied');
   return reference;
  }
  return {
   atmosphere:atmospheres.find(x=>x===storage.getItem('qk-atmosphere-v1')) || reference.atmosphere,
   pieceSet:pieceSets.find(x=>x===storage.getItem('qk-piece-set-v1')) || reference.pieceSet,
   zen:storage.getItem('qk-zen-table-v1') === 'true',
  };
 } catch { return reference; }
}
