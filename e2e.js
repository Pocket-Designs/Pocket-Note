const { _electron } = require('playwright-core');
const fs = require('fs'), os = require('os'), path = require('path');
(async () => {
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'pn-ud-')), sync = fs.mkdtempSync(path.join(os.tmpdir(), 'pn-sync-'));
  const launch = () => _electron.launch({ args: ['--no-sandbox', '--user-data-dir=' + ud, __dirname], env: { ...process.env } });
  let app = await launch(), win = await app.firstWindow();
  win.on('pageerror', e => console.log('PAGEERR', e.message));
  await win.waitForLoadState(); await win.waitForTimeout(800);
  console.log('bridge', await win.evaluate(() => !!window.pnNative && window.pnNative.platform));
  await win.click('text=＋ Page'); await win.waitForSelector('#ed'); await win.click('#ed'); await win.keyboard.type('# Desktop note'); await win.keyboard.press('Enter'); await win.keyboard.type('saved to a real file'); await win.waitForTimeout(700);
  console.log('state file', fs.existsSync(path.join(ud, 'state.json')), fs.existsSync(path.join(ud, 'state.json')) && fs.readFileSync(path.join(ud, 'state.json'), 'utf8').includes('saved to a real file'));
  // connect folder (skip native dialog by calling the same steps)
  await app.evaluate(({ ipcMain }, p) => { ipcMain.removeHandler('pick-dir'); ipcMain.handle('pick-dir', () => p); }, sync);
  await win.click('button[title="Settings"]'); await win.click('text=Choose sync folder'); await win.waitForSelector('#di'); await win.click('#dk'); await win.waitForTimeout(1800);
  console.log('folder files', fs.readdirSync(sync), fs.existsSync(path.join(sync, 'nodes')) && fs.readdirSync(path.join(sync, 'nodes')));
  console.log('status', await win.evaluate(() => syncStatus()));
  await app.close();
  // restart: data persists
  app = await launch(); win = await app.firstWindow(); await win.waitForLoadState(); await win.waitForTimeout(800);
  console.log('after restart pages', await win.evaluate(() => S.nodes.map(n => n.t + ':' + n.body.slice(0, 30).replace(/\n/g, ' '))), 'sync kept', await win.evaluate(() => !!S.sync));
  await app.close();
  // second "device" with its own user-data pointing at same folder
  const ud2 = fs.mkdtempSync(path.join(os.tmpdir(), 'pn-ud2-'));
  const app2 = await _electron.launch({ args: ['--no-sandbox', '--user-data-dir=' + ud2, __dirname] }); const w2 = await app2.firstWindow(); await w2.waitForLoadState(); await w2.waitForTimeout(800);
  await app2.evaluate(({ ipcMain }, p) => { ipcMain.removeHandler('pick-dir'); ipcMain.handle('pick-dir', () => p); }, sync);
  await w2.click('button[title="Settings"]'); await w2.click('text=Choose sync folder'); await w2.waitForTimeout(2200);
  console.log('device2 pages', await w2.evaluate(() => S.nodes.map(n => n.t + ':' + n.body.slice(0, 30).replace(/\n/g, ' '))));
  await app2.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
