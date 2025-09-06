#!/usr/bin/env bash
set -euo pipefail

# Package all cloud functions into ZIPs suitable for CloudBase private extension CodeUri
# - Produces artifacts in ./artifacts/extensions/<function>.zip
# - Ensures index.js is at ZIP root, includes package.json (node_modules excluded by default)
# - Respects env BUNDLE_NODE_MODULES=1 to include node_modules

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ART_DIR="$ROOT_DIR/artifacts/extensions"
mkdir -p "$ART_DIR"

FUNCS=(activities exports import-xlsx init-db patients permissions registrations relations services stats tenancies users)

echo "+ Building functions (if needed)"
pnpm -r --filter ./functions/* build || true

for name in "${FUNCS[@]}"; do
  FN_DIR="$ROOT_DIR/functions/$name"
  DIST_JS="$FN_DIR/dist/index.js"
  PKG_JSON="$FN_DIR/package.json"
  OUT_ZIP="$ART_DIR/${name}.zip"

  if [[ ! -f "$DIST_JS" ]]; then
    echo "==> $name: dist missing, building"
    pnpm --dir "$FN_DIR" run build
  fi
  if [[ ! -f "$PKG_JSON" ]]; then
    echo "!! $name: missing package.json in $FN_DIR" >&2
    continue
  fi

  echo "==> $name: packaging -> $OUT_ZIP"
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' EXIT
  # Place entry at zip root
  mkdir -p "$tmpdir"
  cp "$DIST_JS" "$tmpdir/index.js"
  cp "$PKG_JSON" "$tmpdir/package.json"

  if [[ "${BUNDLE_NODE_MODULES:-0}" == "1" ]]; then
    if [[ -d "$FN_DIR/node_modules" ]]; then
      echo "    including node_modules (BUNDLE_NODE_MODULES=1)"
      rsync -a --delete "$FN_DIR/node_modules" "$tmpdir/" >/dev/null 2>&1 || true
    fi
  fi

  (cd "$tmpdir" && zip -qr9 "$OUT_ZIP" .)
  echo "    size: $(du -h "$OUT_ZIP" | awk '{print $1}')"
  rm -rf "$tmpdir"
  trap - EXIT
done

echo "+ Done. Artifacts at: $ART_DIR"

