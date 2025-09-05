#!/usr/bin/env bash
set -euo pipefail
OUT="docs/source-tree.md"
mkdir -p docs
top=$(find . -maxdepth 2 -mindepth 1 \
  -not -path './.git' -not -path './node_modules' -not -path './**/dist' \
  -print | sed -e 's|^\./||' | sort)
mini=$(find miniprogram -maxdepth 3 -print 2>/dev/null | sed -e 's|^\./||' | sort)
func=$(find functions -maxdepth 2 -print 2>/dev/null | sed -e 's|^\./||' | sort)
doc=$(find docs -maxdepth 2 -print 2>/dev/null | sed -e 's|^\./||' | sort)
{
  echo "# Source Tree（项目结构概览）"
  echo
  echo "本文件展示当前仓库的主要目录结构，方便快速定位代码与文档位置（自动生成快照）。"
  echo
  echo "## 顶层（depth ≤ 2）\n"
  echo '```'
  echo "$top"
  echo '```'
  echo "\n## miniprogram（depth ≤ 3）\n"
  echo '```'
  echo "$mini"
  echo '```'
  echo "\n## functions（depth ≤ 2）\n"
  echo '```'
  echo "$func"
  echo '```'
  echo "\n## docs（depth ≤ 2）\n"
  echo '```'
  echo "$doc"
  echo '```'
  echo
  echo "生成时间：$(date +%F' '%T)"
} > "$OUT"

