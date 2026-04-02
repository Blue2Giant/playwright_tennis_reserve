from __future__ import annotations

import argparse
import json
import os
import subprocess
from typing import Any

from query_jiangwan_slots import get_jiangwan_availability, run_query

BOOK_SPEC_PATH = "tests/book_jiangwan.spec.ts"
BOOKING_RESULT_PREFIX = "BOOKING_RESULT "


def choose_slot(day: dict[str, Any], mode: str) -> dict[str, Any]:
    slots = day.get("slots", [])
    if not isinstance(slots, list) or not slots:
        raise ValueError(f"目标日期没有可预约时段: dayIndex={day.get('dayIndex', '?')}")

    if mode == "back":
        return slots[-1]
    if mode == "medium":
        return slots[(len(slots) - 1) // 2]
    return slots[0]


def choose_booking_target(days: list[dict[str, Any]], *, day_index: int, mode: str) -> dict[str, Any]:
    target_day = next((day for day in days if int(day.get("dayIndex", -1)) == day_index), None)
    if target_day is None:
        raise ValueError(f"未找到目标日期: dayIndex={day_index}")

    selected_slot = choose_slot(target_day, mode)
    return {
        "dayIndex": day_index,
        "label": str(target_day.get("label", "")),
        "date": str(target_day.get("date", "")),
        "weekday": str(target_day.get("weekday", "")),
        "slotIndex": int(selected_slot.get("slotIndex", 0)),
        "time": str(selected_slot.get("time", "")),
        "statusText": str(selected_slot.get("statusText", "")),
    }


def extract_prefixed_json(output: str, prefix: str) -> Any:
    payload: str | None = None
    for line in output.splitlines():
        position = line.find(prefix)
        if position >= 0:
            payload = line[position + len(prefix) :].strip()

    if payload is None:
        raise ValueError(f"未找到输出前缀: {prefix}")
    return json.loads(payload)


def run_booking(
    target: dict[str, Any],
    *,
    headed: bool = False,
    dry_run: bool = False,
) -> dict[str, Any]:
    cmd = ["npx", "playwright", "test", BOOK_SPEC_PATH, "--reporter=line"]
    if headed:
        cmd.append("--headed")

    env = os.environ.copy()
    env.update(
        {
            "TARGET_DAY_INDEX": str(target["dayIndex"]),
            "TARGET_SLOT_INDEX": str(target["slotIndex"]),
            "TARGET_SLOT_TIME": str(target["time"]),
            "DRY_RUN": "1" if dry_run else "0",
        }
    )

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )

    combined_output = "\n".join([result.stdout or "", result.stderr or ""])
    booking_result: dict[str, Any]
    try:
        parsed = extract_prefixed_json(combined_output, BOOKING_RESULT_PREFIX)
        booking_result = parsed if isinstance(parsed, dict) else {"success": False, "raw": parsed}
    except Exception:
        booking_result = {"success": False}

    if result.returncode != 0:
        detail = booking_result.get("reason") or booking_result.get("error") or "Playwright 执行失败"
        raise RuntimeError(
            "\n".join(
                [
                    f"执行预约失败: {' '.join(cmd)}",
                    f"原因: {detail}",
                    f"exit_code={result.returncode}",
                    "STDOUT:",
                    result.stdout.strip() or "<empty>",
                    "STDERR:",
                    result.stderr.strip() or "<empty>",
                ]
            )
        )

    if not booking_result.get("success"):
        raise RuntimeError(f"预约未成功: {json.dumps(booking_result, ensure_ascii=False)}")

    return booking_result


def main() -> None:
    parser = argparse.ArgumentParser(description="查询江湾室外体育场-网球后直接选择并确认预约")
    parser.add_argument("day_index", type=int, help="目标日期索引，从 0 开始")
    parser.add_argument(
        "slot_mode",
        choices=["first", "medium", "back"],
        help="在目标日期内选择第一个 / 中间 / 最后一个可预约时段",
    )
    parser.add_argument("--headed", action="store_true", help="显示浏览器窗口")
    parser.add_argument("--dry-run", action="store_true", help="只选中时段，不点击确认预约")
    args = parser.parse_args()

    venue_availability = run_query(headed=args.headed)
    days = get_jiangwan_availability(venue_availability)
    target = choose_booking_target(days, day_index=args.day_index, mode=args.slot_mode)

    print("准备预约江湾室外体育场-网球:")
    print(
        f"日期索引={target['dayIndex']} | 日期={target['date']} {target['weekday']} | "
        f"时段序号={target['slotIndex']} | 时间={target['time']} | 状态={target['statusText']}"
    )

    booking_result = run_booking(target, headed=args.headed, dry_run=args.dry_run)
    print(json.dumps(booking_result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
