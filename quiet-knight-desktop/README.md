# Quiet Knight for Windows

This desktop shell opens the existing Railway-hosted Quiet Knight at its original HTTPS origin, preserving same-origin account and multiplayer connections. It does not change or deploy the game or server. The page is remote and can change with the live deployment. Initial launch needs internet; offline computer play depends on the existing site's service worker completing its offline cache. Accounts and online rooms require internet. Desktop storage is separate from other browsers and apps; existing local saves do not automatically transfer. Notifications and other permission requests are disabled in this desktop shell.

Build with Node and npm: `npm ci` then `npm run build:windows`. Produces an unsigned per-user Windows x64 NSIS installer. Windows runtime testing and signing require a Windows environment and a trusted code-signing certificate respectively.
