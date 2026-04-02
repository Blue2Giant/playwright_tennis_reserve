import argparse
import json

from reservation_client import format_reservation_line, get_reservations


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="查看当前已预约的网球场")
    parser.add_argument("--json", action="store_true", help="输出 JSON")
    parser.add_argument("--headed", action="store_true", help="显示浏览器窗口")
    args = parser.parse_args()

    reservations = get_reservations(headed=args.headed)
    if args.json:
        print(json.dumps(reservations, ensure_ascii=False, indent=2))
    elif reservations:
        print(f"当前共有 {len(reservations)} 条已预约记录:")
        for reservation in reservations:
            print(format_reservation_line(reservation))
    else:
        print("当前没有已预约记录。")
