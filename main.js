const { app, BrowserWindow, Menu, shell, dialog, ipcMain, globalShortcut } = require('electron');
const path = require('path');

// keep notes in the original data folder so existing users don't lose them after the rename
app.setPath('userData', path.join(app.getPath('appData'), 'pocketnote'));

if (!app.requestSingleInstanceLock()) app.quit();

ipcMain.on('userdata', e => { e.returnValue = app.getPath('userData'); });
ipcMain.handle('pick-dir', async () => {
  const r = await dialog.showOpenDialog({ title: 'Choose your sync folder', properties: ['openDirectory', 'createDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 700, minHeight: 500,
    title: 'Pocket-Note', autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  // links open in the normal browser, never inside the notebook window
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^(https?:|mailto:)/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^(https?:|mailto:)/i.test(url)) shell.openExternal(url); } });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }]));
  createWindow();
  // Ctrl+Alt+N works from any program: opens a new quick note
  try {
    globalShortcut.register('CommandOrControl+Alt+N', () => {
      const w = BrowserWindow.getAllWindows()[0]; if (!w) return;
      if (w.isMinimized()) w.restore(); w.show(); w.focus();
      w.webContents.executeJavaScript('window.oQuick&&window.oQuick()').catch(() => {});
    });
  } catch (e) {}
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
app.on('will-quit', () => { try { globalShortcut.unregisterAll(); } catch (e) {} });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
