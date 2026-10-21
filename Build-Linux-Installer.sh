#!/usr/bin/env bash
# Builds the Linux installers (AppImage + .deb) into ./dist
set -e
cd "$(dirname "$0")"
npm install
npm run dist:linux
echo
echo "Done. In ./dist you now have an .AppImage (runs anywhere) and a .deb (install with: sudo apt install ./dist/Pocket-Note-*.deb)"
