#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$SCRIPT_DIR"

PYTHON_BIN="${PYTHON_BIN:-python}"

usage() {
  cat <<'EOF'
用法:
  ./tennis_craw.sh query-jw [--json] [--headed] [--only-available]
  ./tennis_craw.sh list [--json] [--headed]
  ./tennis_craw.sh cancel <序号|关键字> [--yes] [--headed]
  ./tennis_craw.sh cancel --time "2026-04-03 18:00" [--yes] [--headed]
  ./tennis_craw.sh cancel-soon [提前量] [--headed]
  ./tennis_craw.sh cancel-loop [提前量] [检查间隔] [--headed]
  ./tennis_craw.sh book <day_index> <first|medium|back>
  ./tennis_craw.sh run-now [spec_path]
  ./tennis_craw.sh run-at <HH:MM[:SS]> [spec_path]
  ./tennis_craw.sh examples

说明:
  query-jw     查询江湾室外体育场-网球当前可预约时段
  list         查看当前已预约记录
  cancel       先查出预约，再按序号/时间/关键字取消
  cancel-soon  取消即将开始的预约，例如提前 20 分钟
  cancel-loop  周期性检查并取消即将开始的预约
EOF
}

examples() {
  cat <<'EOF'
常用示例:
  ./tennis_craw.sh query-jw
  ./tennis_craw.sh query-jw --only-available
  ./tennis_craw.sh query-jw --json
  ./tennis_craw.sh list
  ./tennis_craw.sh list --headed
  ./tennis_craw.sh cancel 1
  ./tennis_craw.sh cancel 1 --yes
  ./tennis_craw.sh cancel --time "2026-04-03 18:00" --yes
  ./tennis_craw.sh cancel-soon 20m
  ./tennis_craw.sh cancel-loop 20m 5m

预约相关:
  ./tennis_craw.sh book 0 first
  ./tennis_craw.sh book 1 medium
  ./tennis_craw.sh book 2 back
  ./tennis_craw.sh run-at 06:59 tests/tennis_demo_jiangwan.spec.ts
  ./tennis_craw.sh run-now tests/tennis_demo_jiangwan.spec.ts
EOF
}

cmd="${1:-help}"

case "$cmd" in
  query-jw)
    shift
    "$PYTHON_BIN" query_jiangwan_slots.py "$@"
    ;;
  list)
    shift
    "$PYTHON_BIN" list_reservations.py "$@"
    ;;
  cancel)
    shift
    "$PYTHON_BIN" cancel_reservation.py "$@"
    ;;
  cancel-soon)
    shift
    "$PYTHON_BIN" cancel_scheduler.py "$@"
    ;;
  cancel-loop)
    shift
    "$PYTHON_BIN" cancel_scheduler_loop.py "$@"
    ;;
  book)
    shift
    "$PYTHON_BIN" book_tennis.py "$@"
    ;;
  run-now)
    shift
    spec_path="${1:-tests/tennis_demo_jiangwan.spec.ts}"
    "$PYTHON_BIN" run_concurrent.py now "$spec_path"
    ;;
  run-at)
    shift
    if [ "$#" -lt 1 ]; then
      echo "缺少时间参数，例如: ./tennis_craw.sh run-at 06:59" >&2
      exit 1
    fi
    run_time="$1"
    shift
    spec_path="${1:-tests/tennis_demo_jiangwan.spec.ts}"
    "$PYTHON_BIN" run_concurrent.py "$run_time" "$spec_path"
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
