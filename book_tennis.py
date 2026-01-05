import os
import sys
import subprocess

#python book_tennis.py 2 back     # 候选第3天，最后一个时间段
def run_playwright(day_index: int, slot_mode: str) -> None:
    env = os.environ.copy()
    env["DAY_INDEX"] = str(day_index)
    env["SLOT_MODE"] = slot_mode

    subprocess.run(
        ["npx", "playwright", "test", "tests/tennis_demo_jiangwan.spec.ts"],
        env=env,
        check=True,
    )


if __name__ == "__main__":
    day_index = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    slot_mode = sys.argv[2] if len(sys.argv) > 2 else "first"

    run_playwright(day_index, slot_mode)