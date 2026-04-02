import argparse
import sys
import time
from datetime import datetime
import subprocess


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
    parser = argparse.ArgumentParser(description="定时检查并取消即将开始的预约")
    parser.add_argument("lead", nargs="?", default="60s", help="提前量，例如 20m / 1h")
    parser.add_argument("interval", nargs="?", default="1h", help="检查间隔，例如 5m")
    parser.add_argument("--headed", action="store_true", help="显示浏览器窗口")
    args = parser.parse_args()

    lead_arg = args.lead
    interval_arg = args.interval
    interval_seconds = parse_interval(interval_arg)

    while True:
        now = datetime.now()
        print(f"[{now}] 运行一次取消检查, 提前时间={lead_arg}, 间隔={interval_arg}")
        try:
            cmd = [sys.executable, "cancel_scheduler.py", lead_arg]
            if args.headed:
                cmd.append("--headed")
            subprocess.run(cmd, check=False)
        except Exception as e:
            print(f"运行 cancel_scheduler 发生异常: {e}")
        time.sleep(interval_seconds)


if __name__ == "__main__":
    main()
