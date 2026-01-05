import json
import subprocess


def get_reservations():
    result = subprocess.run(
        ["npx", "playwright", "test", "tests/cancel_dry.spec.ts"],
        capture_output=True,
        text=True,
        check=True,
    )

    reservations = []
    for line in result.stdout.splitlines():
        if line.startswith("RES_DATA "):
            data = line[len("RES_DATA ") :]
            reservations = json.loads(data)
            break
    return reservations


if __name__ == "__main__":
    reservations = get_reservations()
    print("解析到的预约：")
    for r in reservations:
        print(r["index"], r["time"])