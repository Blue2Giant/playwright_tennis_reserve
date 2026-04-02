from __future__ import annotations

import argparse
import json
import subprocess

SPEC_PATH = "tests/query_jiangwan_slots.spec.ts"
SLOT_DATA_PREFIX = "SLOT_DATA "


def run_query(*, headed: bool = False) -> list[dict]:
    cmd = ["npx", "playwright", "test", SPEC_PATH, "--reporter=line"]
    if headed:
        cmd.append("--headed")

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode != 0:
        raise RuntimeError(
            "\n".join(
                [
                    f"执行查询失败: {' '.join(cmd)}",
                    f"exit_code={result.returncode}",
                    "STDOUT:",
                    result.stdout.strip() or "<empty>",
                    "STDERR:",
                    result.stderr.strip() or "<empty>",
                ]
            )
        )

    combined_output = "\n".join([result.stdout or "", result.stderr or ""])
    payload: str | None = None
    for line in combined_output.splitlines():
        position = line.find(SLOT_DATA_PREFIX)
        if position >= 0:
            payload = line[position + len(SLOT_DATA_PREFIX) :].strip()

    if payload is None:
        raise ValueError("未找到查询结果")

    data = json.loads(payload)
    if not isinstance(data, list):
        raise TypeError("查询结果格式不正确")
    return data


def format_day_line(day: dict) -> str:
    day_index = day.get("dayIndex", "?")
    label = " ".join(
        part for part in [str(day.get("date", "")).strip(), str(day.get("weekday", "")).strip()] if part
    ).strip()
    if not label:
        label = str(day.get("label", "")).strip() or "未知日期"

    slots = day.get("slots", [])
    if slots:
        slot_text = ", ".join(str(slot.get("time", "")).strip() or str(slot.get("statusText", "")).strip() for slot in slots)
        return f"[{day_index}] {label}: {len(slots)} 个可预约时段 -> {slot_text}"

    return f"[{day_index}] {label}: 无可预约时段"


def main() -> None:
    parser = argparse.ArgumentParser(description="查询江湾室外体育场-网球当前可预约时段")
    parser.add_argument("--json", action="store_true", help="输出 JSON")
    parser.add_argument("--headed", action="store_true", help="显示浏览器窗口")
    parser.add_argument(
        "--only-available",
        action="store_true",
        help="只输出存在可预约时段的日期",
    )
    args = parser.parse_args()

    availability = run_query(headed=args.headed)

    if args.only_available:
        availability = [day for day in availability if day.get("availableCount", 0) > 0]

    if args.json:
        print(json.dumps(availability, ensure_ascii=False, indent=2))
        return

    print("场馆: 江湾室外体育场-网球")
    if not availability:
        print("当前没有匹配的日期记录。")
        return

    available_total = sum(int(day.get("availableCount", 0)) for day in availability)
    print(f"总计可预约时段数: {available_total}")
    for day in availability:
        print(format_day_line(day))


if __name__ == "__main__":
    main()
