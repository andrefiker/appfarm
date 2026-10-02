const path = require('node:path');

function assetPath(root, requestUrl) {
  const url = new URL(requestUrl);
  if (url.protocol !== 'quiet:' || url.hostname !== 'app' || url.username || url.password || url.port) return null;
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return null; }
  if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').includes('..')) return null;
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolved = path.resolve(root, relative);
  return resolved.startsWith(path.resolve(root) + path.sep) ? resolved : null;
}

module.exports = { assetPath };
