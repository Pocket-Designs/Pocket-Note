# Pocket-Note Developer Guide

Pocket-Note is one self-contained HTML file ( `pocket-note.html` , about 800 KB) that runs in any modern browser, plus a thin Electron wrapper that turns it into a Windows and Linux desktop app. There is no framework, no bundler and no server: the app is plain HTML, CSS and JavaScript, so you can edit it in any text editor and reload.

### Overview

#### What lives where
|Path|Purpose|
|---|---|
|`pocket-note.html`|The whole app: CSS, markup and all<br>JavaScript, in one file|
|`main.js`|Electron main process: window, single-<br>instance lock, folder picker, data folder|
|`preload.js`|Safe bridge exposed to the page as<br>`window.pnNative`(state file and sync-<br>folder access)|
|`scripts/copy-app.js`|Copies<br>`pocket-note.html`to<br>`app/index.html`and the pdf.js files into<br>`app/`before start or build|
|`vendor/`|`pdf.min.js`and<br>`pdf.worker.min.js`<br>(pdf.js 3.11.174, Apache-2.0) bundled for<br>offline PDF import|
|`plugins/`|Example add-on files (Diagram extras)|
|`build/`|App icons (<br>`icon.png`,<br>`icon.ico`)|
|`package.json`|Electron and electron-builder<br>configuration|
|`.github/workflows/build.yml`|GitHub Actions workflow that builds the<br>Windows and Linux installers|
|`Build-Windows-Installer.bat`,<br>`Build-`<br>`Linux-Installer.sh`,<br>`Run-Pocket-Note.bat`,<br>`run-pocket-note.sh`|One-click helpers for people without a<br>terminal|

|Path|Purpose|
|---|---|
|`e2e.js`|Playwright end-to-end check of the<br>desktop shell and folder sync|
|`LICENSE`,<br>`THIRD-PARTY-NOTICES.md`|MIT licence, third-party licences and the<br>icon-artist credit|

#### Design principles
- One file, no build step. Everything in the browser version also works in the desktop app.

- Offline first. Nothing is sent anywhere; sync is a plain folder you choose.

- Pages are real rich text (a `contenteditable` editor), stored as sanitised HTML together with a Markdown copy used for search, export and sync. Features are added as self-contained blocks of code, each introduced by a `/* --------- name ---------- */` comment, that wrap or extend earlier functions rather than rewriting them.

### Run, test and build

**Browser.** Open `pocket-note.html` directly in Chrome, Edge or Firefox. Data is kept in `localStorage` (key `pn` ), which is limited to a few megabytes. The browser version cannot use the sync folder.

**Desktop, from source.** Install Node.js 22 or newer, then from the project folder:

```
npm install
npm start        # copies pocket-note.html to app/index.html, then opens
Electron
```

`pocket-note.html` must sit in the project folder (or its parent). `npm start` and every build run `npm run prepare-app` first, which refreshes `app/index.html` and copies the pdf.js files. After editing the HTML, restart the app (or press Ctrl+R in a dev run) to see changes; always edit `pocket-note.html` , never the copy in `app/` .

**Installers.**

```
npm run dist:win     # NSIS installer, MSI and portable exe (build on
Windows)
npm run dist:linux   # AppImage and .deb (build on Linux)
```

Output goes to `dist/` and is named `Pocket-Note-<version>-<os>-<arch>.<ext>` . Windows packages need a Windows machine (or Wine). The helper scripts `Build-Windows-Installer.bat` and `Build-Linux-Installer.sh` do `npm install` and the right `dist` command.

**GitHub Actions release.** .github/workflows/build.yml has two jobs, windows (windows-latest) and linux (ubuntu-24.04). Each installs Node 22, runs npm install and the matching dist script, then attaches the installers straight to a GitHub Release. No workflow artifacts are created, so the Actions storage quota is never used. The workflow runs when you push a tag that starts with v, or by hand from the Actions tab (Run workflow), where you type the release tag.

To publish: bump "version" in package.json, commit and push in GitHub Desktop, then on GitHub choose Releases, Draft a new release, create the tag (for example v1.1.0) and click Publish release.

The Windows installers are not code-signed, so Windows SmartScreen shows an unknown-publisher warning (More info, Run anyway). Signing needs a certificate and is not set up.

### Architecture

**Global state.** One object, `S` , holds everything and is saved as JSON. The main fields are `nbs` (notebooks: id, name, icon), `nodes` (every section, page and canvas in all notebooks), `cur` (current notebook), `sel` (open item), `open` (tab list), `theme` , `ui` (interface colours), `ol` (outline panel on or off), `plugins` , `sync` , `trash` and `tpls` (user templates).

**Nodes.** Sections, pages and canvases are all entries in `S.nodes` :

|Field|Meaning|
|---|---|
|`id`,<br>`nb`,<br>`p`|Unique id, owning notebook, parent node id (null at<br>top level)|
|`k`|`'s'`section or<br>`'p'`page; a page with<br>`ty:'c'`is a<br>canvas|
|`t`|Title|
|`html`|The page as sanitised HTML; this is what the editor<br>shows|
|`body`|A Markdown copy of the page, regenerated on<br>every edit and used for search, export and sync|

|Field|Meaning|
|---|---|
|`tabs`|Data for table blocks; a table in the page is a<br>placeholder element that points at an entry here|
|`cv`,<br>`ln`|Canvas cards and shapes, and the lines connecting<br>them|
|`files`|Attachments as data URIs|
|`o`,<br>`c`,<br>`u`|Sort order, created time, modified time|
|`ic`|Page icon (an emoji or a small data-URI image);<br>notebooks use<br>`icon`|
|`tg`,<br>`fav`,<br>`rm`,<br>`rf`,<br>`hv`|Tags, favourite flag, reminder time and fired flag,<br>page history snapshots|
|`enc`|Present when the page is encrypted; the content is<br>then ciphertext|

Helpers: `nd(id)` finds a node, `kids(nb, parent)` lists children in order, `desc(id)` lists descendants, `add(kind, parent, type)` creates and opens one.

**Render loop.** `render()` redraws the sidebar ( `renderSB` ), the main pane ( `renderMain` ), tabs, and the status bar, then calls `save()` . The page editor is not re-rendered per keystroke: `edInput()` fixes up the DOM, refreshes the table of contents and outline, and schedules a debounced save. `edSync()` copies the editor DOM into `node.html` and `node.body` .

**Editor.** A `contenteditable` div ( `#ed` ) driven by `document.execCommand` and custom handlers ( `edKey` , `edClick` , `edPaste` , `edDrop` ). Slash menu items live in the `SLASH` array and are executed by `runBlk` . Pasted HTML goes through the whitelist sanitiser `san()` , which is the single place that decides which tags and attributes survive a paste or import. `h2md()` converts the page DOM to Markdown and `md2h()` / `migrate()` convert Markdown to HTML (used for imports and old data).

**Storage.** `save()` serialises `S` . In the browser it writes `localStorage['pn']` ; in Electron it calls `window.pnNative.writeState` , which writes `state.json` atomically (temp file, then rename) in the user-data folder.

**Sync.** The sync block treats a user-chosen folder as a shared store: `nodes/` has one file per page, `media/` holds images and attachments once each (by content hash), and `meta.json` holds notebooks and settings. Each device merges by modified time; if two

devices changed the same page, one copy is renamed with the suffix "(conflicted copy)". With a sync password every file is AES-256 encrypted in the browser. Page-level encryption uses the same crypto helpers and is applied before data reaches sync.

**Spell check.** Dictionaries are Hunspell-style word lists stored compressed in the `LANGS` object (UK and US English) and loaded into a lookup structure at start; more languages can be added by extending `LANGS` .

### Feature modules

The script is organised in blocks introduced by a comment of the form `/* ---------name ---------- */` . Search the file for the block name to find the code.

|Block (search for)|What it does|Key functions|
|---|---|---|
|markdown + maths|Markdown renderer and inline<br>maths (<br>`=2+2`style evaluation)|`md2h`,<br>`inl`,<br>`ev`|
|tables|Table blocks inside pages|`tblW`,<br>`addTbl`,<br>`tbl*`helpers|
|rich text editor:<br>conversion|Sanitiser and HTML to Markdown<br>conversion|`san`,<br>`h2md`,<br>`richHtml`,<br>`migrate`|
|open-note tabs|Tab bar|`tabBar`,<br>`goTab`,<br>`closeTab`|
|search|Full-text search over titles, bodies,<br>tags, tables, cards|`ntext`,<br>`runSearch`,<br>`searchHtml`|
|drag & drop|Tree reorganising|`dtZone`,<br>`moveNode`,<br>`isUnder`|
|spell check|UK and US dictionaries,<br>suggestions|`LANGS`,<br>`spInit`,<br>`spMenu`|
|page zoom|Per-page zoom in the toolbar|`applyZoom`,<br>`pz`|
|rich text editor:<br>runtime|Editor behaviour, toolbar, slash<br>menu, floating boxes, images|`edRender`,<br>`edKey`,<br>`tbHtml`,<br>`SLASH`,<br>`runBlk`|
|infinite canvas|Canvas pages: cards, shapes,<br>connectors, templates, export|`renderCv`,<br>`drawLn`,<br>`cvLayout`,<br>`cvExport`|
|Joplin-style note<br>list + status bar|Middle pane, sort, status bar|`renderNL`,<br>`renderStb`,<br>`nlToggle`|
|sub-pages|Context menu, list drag and drop,<br>spring-loaded folders|`ctxMenu`,<br>`cxClose`|

|Block (search for)|What it does|Key functions|
|---|---|---|
|resizable panes|Drag handles, Aa text size, saved in<br>`localStorage['pnui']`|`uiHandle`,<br>`uiSize`,<br>`uiApply`|
|interface colours|Presets and custom colours as<br>CSS variables|`uiColour`,<br>`uiPreset`,<br>`CPR`|
|knowledge<br>features|Wiki links, backlinks, graph, tags,<br>favourites, trash, daily notes,<br>callouts, history, reminders,<br>templates, command palette|functions prefixed<br>`k`(<br>`kPal`,<br>`kGraph`,<br>`kDaily`,<br>`kHist`,<br>`kTrash`...)|
|icon picker|Emoji, colour tile and picture icons|`iconPick`,<br>`ipRender`,<br>`ico`|
|outline panel|Live heading list|`renderOl`,<br>`olGo`|
|importers|Obsidian, Logseq, Joplin, Evernote,<br>Trilium, Word, PDF, HTML, MHT|`imRun`,<br>`imDetect`,<br>`impDialog`|
|encryption|Page and notebook encryption|`lockScope`,<br>`unlockScope`|
|sync|Shared-folder sync|`syncRun`,<br>`syncNow`,<br>`syncSettingsHtml`|
|export|Markdown export, PDF and print|`ex`,<br>`pdf`,<br>`dl`|

**Extension pattern.** Later blocks wrap earlier functions instead of editing them. For example the knowledge block replaces `renderMain` with a version that calls the original and then adds the tag bar and favourite star:

```
const _rm0 = renderMain;
renderMain = function () { _rm0.apply(this, arguments); kPost(); };
```

This works for functions declared with `function name()` ; a `const` arrow function cannot be reassigned (that throws at start-up), so wrap a function declaration it calls instead (as `migrate` is wrapped rather than `migrateAll` ). Keep new blocks self-contained and place them before the `encryption` block so they load before the first render.

**Adding a slash-menu block.** Push an entry onto `SLASH` ( `[icon, label, key]` ) and handle the key in `runBlk` . For callouts the key starts with `co-` and `runBlk` is wrapped to catch it.

**Adding an importer.** Add a detector branch in `imDetect` , a handler that creates nodes with `imNode(kind, title, markdownBody, parentId, options)` , and a case in `imRun` . Image data should be attached to `node.files` and referenced from the Markdown; `migrate` converts the Markdown to editor HTML.

**Adding a field to nodes.** Add it to the node object and read it defensively ( `n.tg || []` ). Anything on a node is saved, synced and backed up automatically. If it should mark the page as modified, include it in `nsig()` .

**Add-ons (plugins).** User add-ons are JSON files with `shapes` , `templates` and `commands` . `regPlug` registers them, `plugins/` has an example.

### Electron shell

**Main process (** **`main.js` ).** Creates a 1280 by 860 window (minimum 700 by 500) that loads `app/index.html` , with `contextIsolation` on and Node integration off. Only one instance can run (a second launch focuses the first). Links with http, https or mailto open in the system browser, and navigation away from the local file is blocked. The menu has only Edit, View and Window. The `pick-dir` IPC handler shows the native folder dialog for sync.

**Data folder.** `main.js` pins `userData` to `<appData>/pocketnote` ( `%APPDATA%\pocketnote` on Windows, `~/.config/pocketnote` on Linux). This keeps notes where earlier versions stored them after the project was renamed, so keep the folder name if you rename the product again. The app ID is

`com.pocketdesigns.pocketnote` and the product name is Pocket-Note.

**Preload bridge (** **`preload.js` ).** Exposes `window.pnNative` to the page:

|Member|Purpose|
|---|---|
|`platform`|`process.platform`|
|`readState()`,<br>`writeState(json)`|Load and save<br>`state.json`; writes are queued and<br>atomic|
|`pick()`|Open the folder chooser|
|`ls`,<br>`rd`,<br>`wr`,<br>`rm`|List, read, write and delete files inside the chosen<br>sync folder only; every path is checked to stay<br>inside that folder|

The page detects the bridge with `window.pnNative` and falls back to `localStorage` in a plain browser, so the same HTML runs in both.

**Packaging.** `package.json build` config lists the packaged files ( `main.js` , `preload.js` , `app/**/*` , the icon), the targets (NSIS, MSI and portable for Windows; AppImage and deb for Linux), and copies `LICENSE` and `THIRD-PARTY-NOTICES.md` next to the app. Artifacts

are named `Pocket-Note-${version}-${os}-${arch}.${ext}` . Publishing is disabled in the config; the GitHub workflow uploads release files itself.

**Icons.** `build/icon.png` and `build/icon.ico` come from the artwork by MJO-Art. They are covered by the separate icon licence in `LICENSE` and must not be altered or reused without the artist's permission.

### Testing, conventions and contributing

**Syntax check.** The whole script is one `<script>` block. After every edit extract it and check it, for example:

```
python3 - <<'EOF'
s = open('pocket-note.html').read()
open('/tmp/x.js','w').write(s[s.rfind('<script>')+8 : s.rfind('</script>')])
EOF
node --check /tmp/x.js
```

A failed check, or an exception while the script loads, leaves a blank or half-drawn app, so run it before every commit.

**Browser tests.** The project was tested with Playwright driving headless Chromium against a copy of the page: create pages, type into the editor, press shortcuts, then read `S` and the DOM. A minimal pattern:

```
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    pg = p.chromium.launch().new_page()
    pg.on('pageerror', lambda e: print('ERR', e))
    pg.goto('file:///path/to/pocket-note.html')
    pg.evaluate("add('p', null)")
    pg.click('#ed'); pg.keyboard.type('See [[')
    print(pg.evaluate('S.nodes.length'))
```

Watch for `pageerror` output and a clean console. Do not `await` a function that opens a dialog ( `del` , `dlg` ) inside `evaluate` ; start it with `setTimeout` , then click the dialog button.

**Desktop test.** `e2e.js` launches the Electron app with Playwright, checks the native bridge, creates a page, connects a sync folder, restarts the app and then opens a second profile on the same folder to confirm sync. Run it with `node e2e.js` after `npm install playwright-core` .

**Regression checklist before a release.** Create, rename, drag and delete pages and sections; edit text, tables, images and callouts; type `[[` links; search by word and by `#tag` ; import a sample from each source; lock and unlock a page; connect a sync folder and sync two profiles; export Markdown and PDF; switch theme and colours; restart and confirm everything persisted.

**Conventions.**

- Plain JavaScript with no build step; keep names short and block-prefixed ( `k` for knowledge features, `im` for importers, `ip` for the icon picker, `ui` for layout).

- Escape every value placed in HTML with `esc()` ; attribute values also need quotes escaped.

- Never trust pasted or imported HTML: route it through `san()` .

- Wrap `localStorage` access in `try/catch` ; it can be unavailable.

- Avoid new external network requests; the app must work offline. pdf.js is the only optional download in the browser version and is bundled in the desktop app.

- Keep the browser version and desktop version identical; desktop-only code must check `window.pnNative` .

**Contributing.** Fork the repository, create a branch, make one change per pull request, run the checks above and describe what you tested. Update the User Guide when a feature changes. Changes that touch icons or branding need the artist's permission.

**Licence and credits.** MIT licence, copyright 2026 Pocket-Designs (pocket-designs@proton.me). Third-party components, including pdf.js, are listed in `THIRD-PARTY-NOTICES.md`. Icon artist: MJO-Art (workmjo@gmail.com); the icon files cannot be altered or used without the artist's express permission.

#### Developer Guide - OneNote-style module
All of these features are one block in pocket-note.html, placed before the "icon picker" block. Functions are prefixed **o** . The block wraps earlier function declarations (kPost, renderCv, kCmds, runBlk, nsig, h2md) rather than editing them.

#### Page data
|Field|Meaning|
|---|---|
|n.ink|Array of strokes {c colour, w width, h highlighter 0/1, p flat [x,y,...]}. Text<br>pages: px relative to #body. Canvas pages: canvas units.|
|n.pp|Page style {ln rule/grid name, col hex}.|
|data-nt / data-nd|Attributes on a block (p, h1-h3, li...) for the note tag and its done state.|
|span.eq[data-tex]|Equation: LaTeX-style source in data-tex, rendered HTML inside.|

#### Where things live
- **oPost** (called from kPost) adds the second toolbar row #otb, the created/edited line #ost, page style and the ink layer. renderCv is wrapped to add the Draw button and ink layer on canvas pages.

- **Ink**: an SVG #oink in #body (text) or #cvi (canvas); pointer events come from a capture div #oinkc while drawing. nsig and the sync hash include n.ink and n.pp, so drawings sync.

- **fixup()** was changed to keep colour, font-size and font-family on span/font elements (it used to strip them) and to turn font[size] into spans.

- **Tags**: oTag, oFind (scans the saved HTML of every page).

- **Equations**: oTeX is a small LaTeX-subset renderer (frac, sqrt, ^, _, Greek and symbol names, text). h2md is wrapped so the Markdown body stores $tex$.

- **Audio**: MediaRecorder to a data URL inside an audio element. Large recordings grow the notes file; the browser version has the usual storage limit.

- **Quick note**: oQuick; main.js registers the global shortcut Ctrl+Alt+N and calls window.oQuick().

#### Shortcuts added
Ctrl+1/2/3 tags, Ctrl+Alt+D date, Ctrl+Alt+T time, Ctrl+Alt+N quick note, Esc leaves draw mode, Ctrl+Z undoes ink while drawing.
