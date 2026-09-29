#!/usr/bin/env bash
# Maintainer tool: refresh ds-init/ds-component assets from the Halo reference app, where they are
# exercised by a real product. Run from the heliostack workspace root (halo/ and skills/ side by side).
set -euo pipefail
T=skills/skills/ds-init/templates/native
rm -rf "$T" && mkdir -p "$T/ui" "$T/public"
rsync -a --exclude tokens.css halo/src/ui/ "$T/ui/"
cp halo/public/icons.svg "$T/public/"
cp halo/design/theme.mjs skills/skills/ds-init/scripts/theme.mjs
cp halo/design/themes/*.json skills/skills/ds-init/themes/
cp halo/design/check-tokens.mjs skills/skills/ds-component/scripts/check-tokens.mjs
echo "templates synced from halo"
