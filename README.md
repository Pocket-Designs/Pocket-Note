# Pocket-Note desktop (Windows + Linux)

A thin Electron wrapper around `pocket-note.html`. Your notes are kept in a real file
(no 5 MB browser limit) and you can sync them with a shared folder.

## Easiest way (needs Node.js from nodejs.org, installed once)
- Windows: double-click `Run-Pocket-Note.bat` to open the app, or `Build-Windows-Installer.bat` to make an installer / portable .exe.
- Linux: `./run-pocket-note.sh`

## Run it from a terminal
    npm install
    npm start            # copies pocket-note.html -> app/index.html, then opens the app

## Make installers
    npm run dist         # on Windows -> dist/Pocket-Note Setup x.y.z.exe + a portable .exe
                         # on Linux   -> dist/Pocket-Note-x.y.z.AppImage + .deb
Build each installer on its own OS (Windows .exe needs Windows or Wine). No PC handy?
Push this folder to a GitHub repo and run the **Build Pocket-Note** workflow
(Actions tab) — it builds both and attaches them as downloads.

## Your own icon


## Where your notes live
- Windows: `%APPDATA%\pocketnote\state.json`
- Linux: `~/.config/pocketnote/state.json`

## Syncing between devices
1. Pick (or create) a folder that Syncthing / OneDrive / Dropbox / Nextcloud keeps in step
   across your devices.
2. In Pocket-Note: ⚙️ Settings → Sync → *Choose sync folder*. Optionally set a sync password —
   everything in that folder is then AES-256 encrypted.
3. On every other device choose the same folder (enter the same password).
Pocket-Note syncs on start, about 8 s after you stop editing, every 45 s, and when you press ☁.
If the same page is edited on two devices before they meet, the newest sync keeps one version and
the other becomes "… (conflicted copy)". Deleted pages stay deleted on every device.
The folder holds `nodes/` (one file per page), `media/` (images/files) and `meta.json`.
Do not edit those by hand.

## Building the Windows installer (.exe / .msi)
1. Install Node.js LTS from nodejs.org (Windows).
2. Unzip this folder, double-click **Build-Windows-Installer.bat** (takes a few minutes the first time).
3. In `dist\` you get: an installer `.exe` (NSIS), an `.msi`, and a portable `.exe`.
No PC with Node? Push the folder to GitHub and run the "Build Pocket-Note" workflow (Actions tab) – it builds the .exe and .msi on a Windows runner and attaches them as downloads.


## Licence
Pocket-Note is released under the MIT License (`LICENSE`). Third-party components and their licences are listed in `THIRD-PARTY-NOTICES.txt`; both files are installed with the app.

Author: Pocket-Designs <pocket-designs@proton.me>

## App icon
The icon lives in `build/` (`icon.png` for Linux and the window, `icon.ico` for Windows). To change it, replace both files.

## One-click installers
- **Windows:** double-click `Build-Windows-Installer.bat` → installer `.exe`, `.msi` and portable `.exe` appear in `dist\`.
- **Linux:** run `./Build-Linux-Installer.sh` → `.AppImage` and `.deb` appear in `dist/`. Install the .deb with `sudo apt install ./dist/Pocket-Note-*.deb`; it adds Pocket-Note to your applications menu.
- **No build tools?** Upload this folder to a GitHub repository and run the "Build Pocket-Note installers" workflow (Actions tab). Windows and Linux are built separately; download them from the run's artifacts, or push a tag like `v1.0.0` to attach them to a Release.
