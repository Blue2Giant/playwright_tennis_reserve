import os
import subprocess
import threading
import time
from datetime import datetime, timedelta
from typing import List, Tuple
import sys
import json


TARGET_HOUR = 6
TARGET_MINUTE = 59
TARGET_SECOND = 58

PLAYWRIGHT_TIMEOUT = 20
success_count = 0
success_lock = threading.Lock()

def wait_until_target(hour: int, minute: int, second: int) -> None:
    now = datetime.now()
    target = now.replace(hour=hour, minute=minute, second=second, microsecond=0)
    if target <= now:
        target += timedelta(days=1)

    delta = (target - now).total_seconds()
    print(f"现在时间 {now}, 将在 {target} 触发，需等待 {delta:.1f} 秒")
    time.sleep(delta)


def run_one(day_index: int, slot_mode: str, run_id: int, spec_path: str) -> None:
    env = os.environ.copy()
    env["DAY_INDEX"] = str(day_index)
    env["SLOT_MODE"] = slot_mode

    cmd = ["npx", "playwright", "test", spec_path]

    tag = f"[day={day_index}, mode={slot_mode}, id={run_id}]"
    print(f"{tag} 启动命令: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            env=env,
            timeout=PLAYWRIGHT_TIMEOUT,
            capture_output=True,
            text=True,
        )
        print(f"{tag} 结束, exit_code={result.returncode}")
        if result.returncode == 0:
            global success_count
            with success_lock:
                success_count += 1
        if result.stdout:
            print(f"{tag} STDOUT:\n{result.stdout}")
        if result.stderr:
            print(f"{tag} STDERR:\n{result.stderr}")
    except subprocess.TimeoutExpired as e:
        print(f"{tag} 超时({PLAYWRIGHT_TIMEOUT}s)，放弃本次请求")
        # e.stdout / e.stderr 里可能有部分输出
        if e.stdout:
            print(f"{tag} 部分 STDOUT:\n{e.stdout}")
        if e.stderr:
            print(f"{tag} 部分 STDERR:\n{e.stderr}")


def main() -> None:
    def load_day_config() -> List[Tuple[int, str, int]]:
        config_path = os.path.join(os.path.dirname(__file__), "tennis_config.json")
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            items = data.get("day_config", [])
            result: List[Tuple[int, str, int]] = []
            for item in items:
                day_index = int(item["day_index"])
                slot_mode = str(item["slot_mode"])
                count = int(item["count"])
                result.append((day_index, slot_mode, count))
            if result:
                return result
        except Exception as e:
            print(f"读取配置文件失败，将使用默认配置: {e}")
        return [(2, "first", 3), (1, "first", 3)]

    run_immediately = False
    hour = TARGET_HOUR
    minute = TARGET_MINUTE
    second = TARGET_SECOND
    spec_path = "tests/test_thread.spec.ts"

    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg == "now":
            run_immediately = True
        else:
            parts = arg.split(":")
            if len(parts) == 2:
                hour = int(parts[0])
                minute = int(parts[1])
                second = 0
            elif len(parts) == 3:
                hour = int(parts[0])
                minute = int(parts[1])
                second = int(parts[2])
        if len(sys.argv) > 2:
            spec_path = sys.argv[2]

    if not run_immediately:
        wait_until_target(hour, minute, second)

    day_config = load_day_config()
    threads: List[threading.Thread] = []

    for day_index, slot_mode, count in day_config:
        for i in range(count):
            t = threading.Thread(
                target=run_one,
                args=(day_index, slot_mode, i, spec_path),
                daemon=False,
            )
            threads.append(t)

    # 尽量同时启动
    for t in threads:
        t.start()

    for t in threads:
        t.join()

    print("所有并发任务已结束")
    print(f"成功次数: {success_count}")


if __name__ == "__main__":
    main()
