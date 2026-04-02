#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$SCRIPT_DIR"

PYTHON_BIN="${PYTHON_BIN:-python}"

usage() {
  cat <<'EOF'
用法:
  ./tennis_craw.sh query-tennis [--json] [--headed] [--only-available]
  ./tennis_craw.sh query-jw [--json] [--headed] [--only-available]
  ./tennis_craw.sh book <day_index> <first|medium|back> [--dry-run] [--headed]
  ./tennis_craw.sh cancel-soon [提前量] [--headed]
  ./tennis_craw.sh cancel-loop [提前量] [检查间隔] [--headed]
  ./tennis_craw.sh examples

说明:
  query-tennis 查询所有网球场馆当前可预约时段
  query-jw     只查询江湾室外体育场-网球当前可预约时段
  book         查询江湾后直接选择时段，并点击页面下方的确认预约
  cancel-soon  取消即将开始的预约，例如提前 20 分钟
  cancel-loop  周期性检查并取消即将开始的预约
EOF
}

examples() {
  cat <<'EOF'
常用示例:
  ./tennis_craw.sh query-tennis
  ./tennis_craw.sh query-tennis --only-available
  ./tennis_craw.sh query-tennis --json
  ./tennis_craw.sh query-jw
  ./tennis_craw.sh query-jw --only-available
  ./tennis_craw.sh query-jw --json
  ./tennis_craw.sh book 0 first --dry-run
  ./tennis_craw.sh book 1 back
  ./tennis_craw.sh cancel-soon 20m
  ./tennis_craw.sh cancel-loop 20m 5m
EOF
}

cmd="${1:-help}"

case "$cmd" in
  query-tennis)
    shift
    "$PYTHON_BIN" query_jiangwan_slots.py "$@"
    ;;
  query-jw)
    shift
    "$PYTHON_BIN" query_jiangwan_slots.py --jiangwan-only "$@"
    ;;
  book)
    shift
    "$PYTHON_BIN" book_tennis.py "$@"
    ;;
  cancel-soon)
    shift
    "$PYTHON_BIN" cancel_scheduler.py "$@"
    ;;
  cancel-loop)
    shift
    "$PYTHON_BIN" cancel_scheduler_loop.py "$@"
    ;;
  examples)
    examples
    ;;
  help|-h|--help|'')
    usage
    ;;
  *)
    echo "未知命令: $cmd" >&2
    usage
    exit 1
    ;;
esac
