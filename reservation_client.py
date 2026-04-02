from __future__ import annotations

import json
import os
import re
import subprocess
from typing import Any

LIST_SPEC_PATH = "tests/cancel_dry.spec.ts"
CANCEL_SPEC_PATH = "tests/cancel_by_time.spec.ts"
RES_DATA_PREFIX = "RES_DATA "
CANCEL_RESULT_PREFIX = "CANCEL_RESULT "


class PlaywrightCommandError(RuntimeError):
    pass


def normalize_text(text: str | None) -> str:
    return " ".join((text or "").split())


def compact_text(text: str | None) -> str:
    return normalize_text(text).replace(" ", "").lower()


def reservation_time_text(reservation: dict[str, Any]) -> str:
    date = normalize_text(str(reservation.get("date", "")))
    interval = normalize_text(str(reservation.get("interval", "")))
    combined = normalize_text(f"{date} {interval}".strip())
    if combined:
        return combined

    raw_time = normalize_text(str(reservation.get("time", "")))
    match = re.search(r"(\d{4}-\d{1,2}-\d{1,2})\s*(\d{1,2}:\d{2}-\d{1,2}:\d{2})", raw_time)
    if match:
        return f"{match.group(1)} {match.group(2)}"
    return raw_time


def format_reservation_line(reservation: dict[str, Any]) -> str:
    index = reservation.get("index", "?")
    venue = normalize_text(str(reservation.get("venue", "")))
    court = normalize_text(str(reservation.get("court", "")))
    booking_type = normalize_text(str(reservation.get("bookingType", "")))
    time_text = reservation_time_text(reservation)
    status = normalize_text(str(reservation.get("status", "")))
    created_at = normalize_text(str(reservation.get("createdAt", "")))
    can_cancel = "是" if reservation.get("canCancel") else "否"

    parts = [part for part in [venue, court, time_text] if part]
    if booking_type:
        parts.append(f"类型={booking_type}")
    if status:
        parts.append(f"状态={status}")
    if created_at:
        parts.append(f"创建={created_at}")
    parts.append(f"可取消={can_cancel}")
    return f"[{index}] " + " | ".join(parts)


def find_reservations(
    reservations: list[dict[str, Any]],
    *,
    index: int | None = None,
    time_text: str | None = None,
    keyword: str | None = None,
) -> list[dict[str, Any]]:
    matches = reservations

    if index is not None:
        matches = [
            item
            for item in matches
            if int(item.get("index", -1)) == index
        ]

    if time_text:
        time_key = compact_text(time_text)
        matches = [
            item
            for item in matches
            if time_key
            and (
                time_key in compact_text(reservation_time_text(item))
                or time_key in compact_text(str(item.get("time", "")))
            )
        ]

    if keyword:
        keyword_key = compact_text(keyword)
        matches = [
            item
            for item in matches
            if keyword_key
            in compact_text(
                " | ".join(
                    [
                        str(item.get("venue", "")),
                        str(item.get("court", "")),
                        str(item.get("bookingType", "")),
                        reservation_time_text(item),
                        str(item.get("status", "")),
                        str(item.get("createdAt", "")),
                        str(item.get("rowText", "")),
                    ]
                )
            )
        ]

    return matches


def _run_playwright_spec(
    spec_path: str,
    *,
    env: dict[str, str] | None = None,
    headed: bool = False,
) -> subprocess.CompletedProcess[str]:
    cmd = ["npx", "playwright", "test", spec_path, "--reporter=line"]
    if headed:
        cmd.append("--headed")

    merged_env = os.environ.copy()
    if env:
        merged_env.update({key: str(value) for key, value in env.items()})

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        env=merged_env,
        check=False,
    )

    if result.returncode != 0:
        raise PlaywrightCommandError(
            "\n".join(
                [
                    f"执行 Playwright 失败: {' '.join(cmd)}",
                    f"exit_code={result.returncode}",
                    "STDOUT:",
                    result.stdout.strip() or "<empty>",
                    "STDERR:",
                    result.stderr.strip() or "<empty>",
                ]
            )
        )

    return result


def _extract_prefixed_json(result: subprocess.CompletedProcess[str], prefix: str) -> Any:
    payload: str | None = None
    combined_output = "\n".join([result.stdout or "", result.stderr or ""])

    for line in combined_output.splitlines():
        position = line.find(prefix)
        if position >= 0:
            payload = line[position + len(prefix) :].strip()

    if payload is None:
        raise ValueError(f"未在 Playwright 输出中找到前缀 {prefix!r}")

    return json.loads(payload)


def get_reservations(*, headed: bool = False) -> list[dict[str, Any]]:
    result = _run_playwright_spec(LIST_SPEC_PATH, headed=headed)
    reservations = _extract_prefixed_json(result, RES_DATA_PREFIX)
    if not isinstance(reservations, list):
        raise TypeError("预约列表格式不正确")
    return reservations


def cancel_reservation(
    reservation: dict[str, Any],
    *,
    headed: bool = False,
) -> dict[str, Any]:
    env = {
        "TARGET_RESERVATION_JSON": json.dumps(
            reservation,
            ensure_ascii=False,
        )
    }
    result = _run_playwright_spec(CANCEL_SPEC_PATH, env=env, headed=headed)
    cancel_result = _extract_prefixed_json(result, CANCEL_RESULT_PREFIX)
    if not isinstance(cancel_result, dict):
        raise TypeError("取消预约结果格式不正确")
    return cancel_result
