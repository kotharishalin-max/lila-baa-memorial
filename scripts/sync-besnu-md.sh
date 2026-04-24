#!/usr/bin/env bash
# Sync the 25 besnu track markdown files + index note from the Obsidian vault
# into content/besnu/ for the site build pipeline.
# Run once initially, and any time vault content changes.

set -euo pipefail

VAULT_SRC="/Users/zwangy/Vaults/Zwangisidian/02_Areas/Family/Lila Baa/Besnu"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${SCRIPT_DIR}/../content/besnu"

if [[ ! -d "$VAULT_SRC" ]]; then
  echo "Error: vault source not found at $VAULT_SRC" >&2
  exit 1
fi

mkdir -p "$DEST"

# Only .md files, preserve filenames with spaces
rsync -av --delete --include='*.md' --exclude='*' "$VAULT_SRC/" "$DEST/"

echo ""
echo "Synced $(ls "$DEST"/*.md | wc -l | tr -d ' ') markdown files."
