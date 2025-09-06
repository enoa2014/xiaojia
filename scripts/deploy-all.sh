#!/usr/bin/env bash
set -euo pipefail

# Concurrent deploy of multiple cloud functions via tcb CLI.
# Success heuristic: presence of "云函数部署中" in CLI output.

ENV_ID="${ENV_ID:-cloud1-3grb87gwaba26b64}"
FUNCS=(patients tenancies services activities registrations stats permissions users exports import-xlsx init-db)

mkdir -p output
echo "Deploying to ENV_ID=$ENV_ID"

for f in "${FUNCS[@]}"; do
  (
    echo "[deploy] $f ..."
    tcb fn deploy "$f" -e "$ENV_ID" --dir "./functions/$f" --force > "output/deploy-$f.log" 2>&1 || true
    echo "[deploy] $f done"
  ) &
done

wait

echo "\n===== Summary ====="
ok=0; total=0
for f in "${FUNCS[@]}"; do
  total=$((total+1))
  if rg -q "云函数部署中" "output/deploy-$f.log"; then
    echo "$f: SUCCESS"
    ok=$((ok+1))
  else
    echo "$f: CHECK LOG (output/deploy-$f.log)"
  fi
done
echo "Success: $ok/$total"

exit 0

