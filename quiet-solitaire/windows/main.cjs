const { app, BrowserWindow, protocol, session } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { assetPath } = require('./asset-path.cjs');

protocol.registerSchemesAsPrivileged([{ scheme: 'quiet', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

const root = app.isPackaged ? path.join(process.resourcesPath, 'game') : path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };

app.whenReady().then(async () => {
  protocol.handle('quiet', async request => {
    const file = assetPath(root, request.url);
    if (!file) return new Response('Not found', { status: 404 });
    try {
      const body = await fs.readFile(file);
      return new Response(body, { headers: {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Content-Security-Policy': "default-src 'self' data:; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'"
      } });
    } catch { return new Response('Not found', { status: 404 }); }
  });

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !details.url.startsWith('quiet://app/') });
  });

  const window = new BrowserWindow({
    title: 'Quiet Solitaire', width: 520, height: 850, minWidth: 400, minHeight: 650,
    backgroundColor: '#17372f', autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true }
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== 'quiet://app/index.html') event.preventDefault();
  });
  await window.loadURL('quiet://app/index.html');
});

app.on('window-all-closed', () => app.quit());
