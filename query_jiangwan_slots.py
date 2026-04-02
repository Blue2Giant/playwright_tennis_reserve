from __future__ import annotations

import argparse
import json
import subprocess

SPEC_PATH = "tests/query_jiangwan_slots.spec.ts"
SLOT_DATA_PREFIX = "SLOT_DATA "
JIANGWAN_OUTDOOR_TENNIS_VENUE = "江湾室外体育场-网球"


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


def normalize_text(text: str | None) -> str:
    return " ".join((text or "").split())


def get_venue_name(venue: dict) -> str:
    return normalize_text(str(venue.get("venueName", "")))


def find_venue(
    venues: list[dict],
    *,
    venue_name: str,
) -> dict | None:
    expected_name = normalize_text(venue_name)
    if not expected_name:
        return None

    exact_match: dict | None = None
    partial_match: dict | None = None
    for venue in venues:
        current_name = get_venue_name(venue)
        if not current_name:
            continue
        if current_name == expected_name:
            exact_match = venue
            break
        if expected_name in current_name or current_name in expected_name:
            partial_match = venue

    return exact_match or partial_match


def get_venue_days(
    venues: list[dict],
    *,
    venue_name: str,
) -> list[dict]:
    venue = find_venue(venues, venue_name=venue_name)
    if not venue:
        raise ValueError(f"未找到场馆: {venue_name}")

    days = venue.get("days", [])
    if not isinstance(days, list):
        raise TypeError(f"场馆 days 字段格式不正确: {venue_name}")
    return days


def get_jiangwan_availability(venues: list[dict]) -> list[dict]:
    return get_venue_days(venues, venue_name=JIANGWAN_OUTDOOR_TENNIS_VENUE)


def filter_days(days: list[dict], *, only_available: bool) -> list[dict]:
    if not only_available:
        return days
    return [day for day in days if int(day.get("availableCount", 0)) > 0]


def filter_venues(venues: list[dict], *, only_available: bool) -> list[dict]:
    if not only_available:
        return venues

    filtered: list[dict] = []
    for venue in venues:
        days = venue.get("days", [])
        if not isinstance(days, list):
            days = []

        available_days = [day for day in days if int(day.get("availableCount", 0)) > 0]
        if not available_days:
            continue

        next_venue = dict(venue)
        next_venue["days"] = available_days
        next_venue["availableCount"] = sum(int(day.get("availableCount", 0)) for day in available_days)
        filtered.append(next_venue)

    return filtered


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


def format_venue_header(venue: dict) -> str:
    venue_name = str(venue.get("venueName", "")).strip() or "未知场馆"
    available_count = int(venue.get("availableCount", 0))
    return f"场馆: {venue_name} | 可预约时段数: {available_count}"


def main() -> None:
    parser = argparse.ArgumentParser(description="查询所有网球场馆当前可预约时段")
    parser.add_argument("--json", action="store_true", help="输出 JSON")
    parser.add_argument("--headed", action="store_true", help="显示浏览器窗口")
    parser.add_argument(
        "--jiangwan-only",
        action="store_true",
        help="只输出江湾室外体育场-网球的日期与时段",
    )
    parser.add_argument(
        "--only-available",
        action="store_true",
        help="只输出存在可预约时段的场馆和日期",
    )
    args = parser.parse_args()

    venue_availability = run_query(headed=args.headed)

    if args.jiangwan_only:
        venue = find_venue(venue_availability, venue_name=JIANGWAN_OUTDOOR_TENNIS_VENUE)
        if not venue:
            raise SystemExit(f"未找到场馆: {JIANGWAN_OUTDOOR_TENNIS_VENUE}")

        error = str(venue.get("error", "")).strip()
        days = venue.get("days", [])
        if not isinstance(days, list):
            raise TypeError(f"场馆 days 字段格式不正确: {JIANGWAN_OUTDOOR_TENNIS_VENUE}")
        days = filter_days(days, only_available=args.only_available)

        if args.json:
            print(json.dumps(days, ensure_ascii=False, indent=2))
            return

        print(f"场馆: {get_venue_name(venue) or JIANGWAN_OUTDOOR_TENNIS_VENUE}")
        if error:
            print(f"查询失败: {error}")
            return

        if not days:
            print("当前无可预约时段。")
            return

        available_total = sum(int(day.get("availableCount", 0)) for day in days)
        print(f"总计可预约时段数: {available_total}")
        for day in days:
            print(format_day_line(day))
        return

    availability = filter_venues(venue_availability, only_available=args.only_available)

    if args.json:
        print(json.dumps(availability, ensure_ascii=False, indent=2))
        return

    if not availability:
        print("当前没有匹配的日期记录。")
        return

    available_venue_count = sum(1 for venue in availability if int(venue.get("availableCount", 0)) > 0)
    available_total = sum(int(venue.get("availableCount", 0)) for venue in availability)
    print(f"网球场馆总数: {len(availability)}")
    print(f"有可预约时段的场馆数: {available_venue_count}")
    print(f"总计可预约时段数: {available_total}")

    for index, venue in enumerate(availability):
        if index > 0:
            print()

        print(format_venue_header(venue))

        error = str(venue.get("error", "")).strip()
        if error:
            print(f"查询失败: {error}")
            continue

        days = venue.get("days", [])
        if not isinstance(days, list) or not days:
            print("当前无可预约时段。")
            continue

        for day in days:
            print(format_day_line(day))


if __name__ == "__main__":
    main()
