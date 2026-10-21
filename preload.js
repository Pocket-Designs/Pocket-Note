// Gives the notebook page (and only it) a small, safe file API:
//  - its own data file in the app's user-data folder (no 5 MB browser limit)
//  - read/write inside ONE folder the user picked for syncing
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs'), path = require('path');

const dataDir = ipcRenderer.sendSync('userdata');
const stateFile = path.join(dataDir, 'state.json');
let writing = false, pending = null;

function safe(root, sub) {
  const full = path.resolve(root, sub || '');
  const r = path.resolve(root);
  if (full !== r && !full.startsWith(r + path.sep)) throw new Error('Path outside the sync folder');
  return full;
}
function flush() {
  if (writing || pending === null) return;
  const data = pending; pending = null; writing = true;
  const tmp = stateFile + '.tmp';
  fs.promises.mkdir(dataDir, { recursive: true })
    .then(() => fs.promises.writeFile(tmp, data))
    .then(() => fs.promises.rename(tmp, stateFile))
    .catch(e => console.error('save failed', e))
    .finally(() => { writing = false; flush(); });
}

contextBridge.exposeInMainWorld('pnNative', {
  platform: process.platform,
  readState() { try { return fs.readFileSync(stateFile, 'utf8'); } catch (e) { return null; } },
  writeState(json) { pending = json; flush(); },
  pick() { return ipcRenderer.invoke('pick-dir'); },
  ls(root, sub) { try { return fs.readdirSync(safe(root, sub), { withFileTypes: true }).filter(d => d.isFile() && !d.name.endsWith('.tmp')).map(d => d.name); } catch (e) { return []; } },
  rd(root, sub) { try { return new Uint8Array(fs.readFileSync(safe(root, sub))); } catch (e) { return null; } },
  wr(root, sub, bytes) { const f = safe(root, sub); fs.mkdirSync(path.dirname(f), { recursive: true }); const t = f + '.' + process.pid + '.tmp'; fs.writeFileSync(t, Buffer.from(bytes)); fs.renameSync(t, f); return true; },
  rm(root, sub) { try { fs.unlinkSync(safe(root, sub)); } catch (e) {} return true; }
});
