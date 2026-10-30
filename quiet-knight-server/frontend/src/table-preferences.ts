export const REFERENCE_TABLE = {atmosphere:'Emerald Enamel', pieceSet:'faceted'} as const;
export const REFERENCE_TABLE_UPGRADE = 'qk-pictured-table-upgrade-v1';
type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

// One appearance for every client, including installations with older choices.
// Touch only appearance keys; retain games, seats, accounts and accessibility.
export function loadTablePreferences(storage?: PreferenceStorage) {
 let zen = false;
 try {
  if (storage) {
   zen = storage.getItem(REFERENCE_TABLE_UPGRADE) === 'applied' && storage.getItem('qk-zen-table-v1') === 'true';
   storage.setItem('qk-atmosphere-v1', REFERENCE_TABLE.atmosphere);
   storage.setItem('qk-piece-set-v1', REFERENCE_TABLE.pieceSet);
   storage.setItem('qk-zen-table-v1', String(zen));
   storage.setItem(REFERENCE_TABLE_UPGRADE, 'applied');
  }
 } catch { /* The fixed appearance also works without persistent storage. */ }
 return {...REFERENCE_TABLE, zen};
}
