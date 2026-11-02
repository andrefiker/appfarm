export const funDefaults = {
  comic: true, replay: true, tray: true, sneak: true, crown: true,
  revenge: true, poses: true, handshake: true, entrance: true,
  sounds: false, soundP: true, soundN: true, soundB: true,
  soundR: true, soundQ: true, soundK: true,
};
export type FunOptions = typeof funDefaults;
export function readFunOptions(value: unknown): FunOptions {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(funDefaults).map(([key, fallback]) =>
    [key, typeof source[key] === 'boolean' ? source[key] : fallback])) as FunOptions;
}
