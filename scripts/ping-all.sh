#!/usr/bin/env bash
set -euo pipefail

# Concurrent lightweight invokes to verify functions respond.
# This does not assert business success; only checks the function can be called.

ENV_ID="${ENV_ID:-cloud1-3grb87gwaba26b64}"
mkdir -p output

invoke() {
  local name="$1" payload="$2"
  (
    echo "[ping] $name ..."
    tcb fn invoke "$name" -e "$ENV_ID" --params "$payload" > "output/ping-$name.log" 2>&1 || true
    echo "[ping] $name done"
  ) &
}

invoke patients      '{"action":"list","payload":{"page":1,"pageSize":1}}'
invoke tenancies     '{"action":"db.ping"}'
invoke services      '{"action":"list","payload":{"page":1,"pageSize":1}}'
invoke activities    '{"action":"list","payload":{"page":1,"pageSize":1}}'
invoke registrations '{"action":"list"}'
invoke stats         '{"action":"counts","payload":{"collections":["Patients"]}}'
invoke permissions   '{"action":"request.list","payload":{"page":1,"pageSize":1}}'
invoke users         '{"action":"getProfile"}'
invoke exports       '{"action":"status","payload":{"taskId":"invalid"}}'
invoke import-xlsx   '{"action":"fromCos","payload":{"fileID":"cos://invalid"}}'
# NOTE: skip init-db to avoid unintended collection creation

wait

echo "\n===== Ping Summary ====="
for n in patients tenancies services activities registrations stats permissions users exports import-xlsx; do
  if rg -q "\{\s*\"ok\"\s*:\s*(true|false)" "output/ping-$n.log"; then
    echo "$n: RESPONDED"
  else
    echo "$n: CHECK LOG (output/ping-$n.log)"
  fi
done

exit 0

