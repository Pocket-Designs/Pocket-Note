// Copies the single-file app (pocket-note.html, kept next to this folder or inside it) to app/index.html
const fs = require('fs'), path = require('path');
const cands = [path.join(__dirname, '..', 'pocket-note.html'), path.join(__dirname, '..', '..', 'pocket-note.html')];
const src = cands.find(f => fs.existsSync(f));
if (!src) { console.error('pocket-note.html not found next to the desktop folder'); process.exit(1); }
fs.mkdirSync(path.join(__dirname, '..', 'app'), { recursive: true });
fs.copyFileSync(src, path.join(__dirname, '..', 'app', 'index.html'));
console.log('Copied', src, '-> app/index.html');
// Bundle pdf.js (Apache-2.0) so PDF import works offline
for (const f of ['pdf.min.js', 'pdf.worker.min.js']) {
  const v = path.join(__dirname, '..', 'vendor', f);
  if (fs.existsSync(v)) fs.copyFileSync(v, path.join(__dirname, '..', 'app', f));
}
