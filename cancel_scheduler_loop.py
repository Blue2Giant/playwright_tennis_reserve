import subprocess
import sys
import time
from datetime import datetime


def parse_interval(value: str) -> int:
    v = value.strip()
    if v.endswith("s"):
        return int(v[:-1])
    if v.endswith("m"):
        return int(float(v[:-1]) * 60)
    if v.endswith("h"):
        return int(float(v[:-1]) * 3600)
    return int(v)


def main() -> None:
    lead_arg = "60s"
    interval_arg = "1h"

    if len(sys.argv) > 1:
        lead_arg = sys.argv[1]
    if len(sys.argv) > 2:
        interval_arg = sys.argv[2]

    interval_seconds = parse_interval(interval_arg)

    while True:
        now = datetime.now()
        print(f"[{now}] 运行一次取消检查, 提前时间={lead_arg}, 间隔={interval_arg}")
        try:
            subprocess.run(
                [sys.executable, "cancel_scheduler.py", lead_arg],
                check=False,
            )
        except Exception as e:
            print(f"运行 cancel_scheduler 发生异常: {e}")
        time.sleep(interval_seconds)


if __name__ == "__main__":
    main()

