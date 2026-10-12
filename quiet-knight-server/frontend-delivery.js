export function frontendPath(pathname, identityReady) {
  if (!identityReady) return null;
  return pathname === '/assets/quiet-knight/index.html' ? '/index.html' : pathname;
}
