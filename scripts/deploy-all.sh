#!/usr/bin/env bash
set -euo pipefail

# Concurrent deploy of multiple cloud functions via tcb CLI with robust success detection.

ENV_ID="${ENV_ID:-cloud1-3grb87gwaba26b64}"
# 完整函数清单（含此前遗漏的 relations/observability）
FUNCS=(patients tenancies services activities registrations stats permissions users exports import-xlsx init-db relations observability)

mkdir -p output
echo "Deploying to ENV_ID=$ENV_ID"

# 避免彩色输出干扰解析
export TERM=dumb
export NO_COLOR=1

for f in "${FUNCS[@]}"; do
  (
    echo "[deploy] $f ..."
    LOG_FILE="output/deploy-$f.log"
    STATUS_FILE="output/deploy-$f.status"
    : > "$LOG_FILE"
    : > "$STATUS_FILE"
    # 执行部署
    if tcb fn deploy "$f" -e "$ENV_ID" --dir "./functions/$f" --force >"$LOG_FILE" 2>&1; then
      ec=0
    else
      ec=$?
    fi
    # 基于日志的失败特征判断
    if rg -q "✖|CloudBaseError|失败|无有效身份信息|ECONNRESET|Client network socket disconnected" "$LOG_FILE"; then
      echo FAIL > "$STATUS_FILE"
    elif [[ $ec -ne 0 ]]; then
      echo FAIL > "$STATUS_FILE"
    else
      echo OK > "$STATUS_FILE"
    fi
    echo "[deploy] $f done"
  ) &
done

wait

# 统一拉取一次函数列表用于结果校验
tcb fn list -e "$ENV_ID" > output/fn-list.txt 2>&1 || true
# 去除 ANSI 颜色码
sed -r 's/\x1B\[[0-?]*[ -\/]*[@-~]//g' output/fn-list.txt > output/fn-list.clean.txt || true

echo -e "\n===== Summary ====="
ok=0; total=0
for f in "${FUNCS[@]}"; do
  total=$((total+1))
  status_mark="$(cat "output/deploy-$f.status" 2>/dev/null || echo UNKNOWN)"
  # 二次校验：函数列表中状态为“部署完成”视为成功
  if rg -q "\b$f\b" output/fn-list.clean.txt && rg -n "^.*\b$f\b.*部署完成.*$" output/fn-list.clean.txt >/dev/null 2>&1; then
    status="SUCCESS"
    ok=$((ok+1))
  else
    # 若部署命令判定 OK 但列表未显示成功，回退到日志判定
    if [[ "$status_mark" == "OK" ]]; then
      status="LIKELY_OK_CHECK_LIST"
      ok=$((ok+1))
    else
      status="FAIL"
    fi
  fi
  printf "%s: %s\n" "$f" "$status"
  if [[ "$status" != "SUCCESS" ]]; then
    echo "  -> log: output/deploy-$f.log"
  fi
done
echo "Success: $ok/$total"

exit 0
