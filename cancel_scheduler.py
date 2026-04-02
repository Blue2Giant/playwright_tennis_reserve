import re
import argparse
from datetime import datetime

from reservation_client import (
    cancel_reservation,
    format_reservation_line,
    get_reservations,
    reservation_time_text,
)


def parse_lead(value: str) -> int:
    v = value.strip()
    if v.endswith("s"):
        return int(v[:-1])
    if v.endswith("m"):
        return int(float(v[:-1]) * 60)
    if v.endswith("h"):
        return int(float(v[:-1]) * 3600)
    return int(v)


def parse_start_time(text: str) -> datetime | None:
    m = re.search(r"(\d{4}-\d{1,2}-\d{1,2}).*?(\d{1,2}:\d{2})", text)
    if not m:
        return None
    date_part = m.group(1)
    time_part = m.group(2)
    s = f"{date_part} {time_part}"
    try:
        return datetime.strptime(s, "%Y-%m-%d %H:%M")
    except ValueError:
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description="取消即将开始的预约")
    parser.add_argument("lead", nargs="?", default="60s", help="提前量，例如 20m / 1h")
    parser.add_argument("--headed", action="store_true", help="显示浏览器窗口")
    args = parser.parse_args()

    lead_seconds = parse_lead(args.lead)

    reservations = get_reservations(headed=args.headed)
    print("所有预约条目:")
    if reservations:
        for reservation in reservations:
            print(format_reservation_line(reservation))
    else:
        print("当前没有已预约记录。")
    now = datetime.now()

    due = []
    for r in reservations:
        start = parse_start_time(reservation_time_text(r))
        if not start:
            continue
        delta = (start - now).total_seconds()
        if 0 <= delta <= lead_seconds:
            due.append(r)

    print("即将开始的预约条目:")
    if due:
        for reservation in due:
            print(format_reservation_line(reservation))
    else:
        print("当前没有命中提前量窗口的预约。")

    for r in due:
        print(f"取消预约: {format_reservation_line(r)}")
        result = cancel_reservation(r, headed=args.headed)
        if not result.get("success"):
            raise RuntimeError(f"取消失败: {result}")


if __name__ == "__main__":
    main()
