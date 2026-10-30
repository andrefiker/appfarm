'use strict';
const { app, BrowserWindow, shell, session } = require('electron');
const path = require('node:path');
const GAME = 'https://quiet-knight-server-production.up.railway.app/assets/quiet-knight/index.html';
const ORIGIN = new URL(GAME).origin;
function isGameUrl(url) {
  try { return new URL(url).origin === ORIGIN; } catch { return false; }
}
function external(url) {
  try { if (new URL(url).protocol === 'https:') void shell.openExternal(url); } catch {}
}
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  const window = new BrowserWindow({
    width: 1200, height: 850, minWidth: 360, minHeight: 500,
    title: 'Quiet Knight', icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0d1918', autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true }
  });
  window.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: 'deny' }; });
  window.webContents.on('will-navigate', (event, url) => {
    if (!isGameUrl(url)) { event.preventDefault(); external(url); }
  });
  void window.loadURL(GAME);
});
app.on('window-all-closed', () => app.quit());
