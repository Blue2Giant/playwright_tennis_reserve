from __future__ import annotations

import argparse
import json
import sys

from reservation_client import (
    cancel_reservation as run_cancel_reservation,
    find_reservations,
    format_reservation_line,
    get_reservations,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="查看并取消已预约的网球场")
    parser.add_argument(
        "selector",
        nargs="?",
        help="默认按序号或关键字匹配，例如 `1` 或 `江湾`",
    )
    parser.add_argument("--index", type=int, help="按列表序号取消")
    parser.add_argument("--time", help="按时间匹配取消，例如 `2026-04-03 18:00`")
    parser.add_argument("--keyword", help="按场馆/时间关键字匹配取消")
    parser.add_argument("--yes", action="store_true", help="跳过确认提示")
    parser.add_argument("--json", action="store_true", help="输出 JSON 结果")
    parser.add_argument("--headed", action="store_true", help="显示浏览器窗口")
    return parser.parse_args()


def resolve_selector(args: argparse.Namespace) -> tuple[int | None, str | None, str | None]:
    index = args.index
    time_text = args.time
    keyword = args.keyword

    if args.selector and index is None and time_text is None and keyword is None:
        if args.selector.isdigit():
            index = int(args.selector)
        else:
            keyword = args.selector

    if index is None and time_text is None and keyword is None:
        raise SystemExit("请提供 `--index` / `--time` / `--keyword`，或直接传一个序号")

    return index, time_text, keyword


def confirm_cancel(reservation: dict, auto_yes: bool) -> bool:
    if auto_yes:
        return True

    prompt = f"准备取消: {format_reservation_line(reservation)}\n继续吗? [y/N] "

    if not sys.stdin.isatty():
        raise SystemExit("当前不是交互式终端；如需直接取消，请加 `--yes`")

    answer = input(prompt).strip().lower()
    return answer in {"y", "yes"}


def main() -> None:
    args = parse_args()
    index, time_text, keyword = resolve_selector(args)

    reservations = get_reservations(headed=args.headed)
    matches = find_reservations(
        reservations,
        index=index,
        time_text=time_text,
        keyword=keyword,
    )

    if not matches:
        raise SystemExit("没有找到匹配的预约记录")

    if len(matches) > 1:
        print("匹配到多条预约，请改用更精确的条件:")
        for item in matches:
            print(format_reservation_line(item))
        raise SystemExit(1)

    target = matches[0]
    if not confirm_cancel(target, args.yes):
        print("已取消本次操作")
        return

    result = run_cancel_reservation(target, headed=args.headed)
    reservation = result.get("reservation") or target

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    if result.get("success"):
        print("取消成功:")
        print(format_reservation_line(reservation))
        return

    print("取消失败:")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(1)


if __name__ == "__main__":
    main()
