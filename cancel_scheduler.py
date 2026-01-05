import json
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta

from list_reservations import get_reservations


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


def cancel_by_time(time_text: str) -> None:
    env = os.environ.copy()
    env["TARGET_TIME"] = time_text
    subprocess.run(
        ["npx", "playwright", "test", "tests/cancel_by_time.spec.ts"],
        env=env,
        check=True,
    )


def main() -> None:
    lead_seconds = 60
    if len(sys.argv) > 1:
        lead_seconds = parse_lead(sys.argv[1])

    reservations = get_reservations()
    now = datetime.now()

    due = []
    for r in reservations:
        start = parse_start_time(r["time"])
        if not start:
            continue
        delta = (start - now).total_seconds()
        if 0 <= delta <= lead_seconds:
            due.append(r)

    print("即将开始的预约条目:")
    print(json.dumps(due, ensure_ascii=False, indent=2))

    for r in due:
        print(f"取消预约: index={r['index']} time={r['time']}")
        cancel_by_time(r["time"])


if __name__ == "__main__":
    main()

