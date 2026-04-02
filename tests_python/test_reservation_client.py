import unittest

from cancel_scheduler import parse_lead, parse_start_time
from reservation_client import (
    find_reservations,
    format_reservation_line,
    reservation_time_text,
)


SAMPLE_RESERVATIONS = [
    {
        "index": 1,
        "venue": "江湾室外体育场-网球",
        "court": "3号场",
        "bookingType": "个人预约",
        "date": "2026-04-03",
        "interval": "18:00-19:00",
        "time": "2026-04-03 18:00-19:00",
        "status": "已预约",
        "createdAt": "2026-04-01 07:08:50",
        "canCancel": True,
        "rowText": "江湾室外体育场-网球 | 3号场 | 2026-04-03 18:00-19:00 | 已预约",
    },
    {
        "index": 2,
        "venue": "江湾室外体育场-网球",
        "court": "5号场",
        "bookingType": "个人预约",
        "date": "2026-04-04",
        "interval": "20:00-21:00",
        "time": "2026-04-04 20:00-21:00",
        "status": "已预约",
        "createdAt": "2026-04-01 07:10:10",
        "canCancel": True,
        "rowText": "江湾室外体育场-网球 | 5号场 | 2026-04-04 20:00-21:00 | 已预约",
    },
]


class ReservationClientTests(unittest.TestCase):
    def test_find_reservation_by_index(self) -> None:
        matches = find_reservations(SAMPLE_RESERVATIONS, index=2)
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["court"], "5号场")

    def test_find_reservation_by_time(self) -> None:
        matches = find_reservations(
            SAMPLE_RESERVATIONS,
            time_text="2026-04-03 18:00",
        )
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["index"], 1)

    def test_find_reservation_by_keyword(self) -> None:
        matches = find_reservations(SAMPLE_RESERVATIONS, keyword="5号场")
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["index"], 2)

    def test_format_reservation_line(self) -> None:
        line = format_reservation_line(SAMPLE_RESERVATIONS[0])
        self.assertIn("[1]", line)
        self.assertIn("江湾室外体育场-网球", line)
        self.assertIn("18:00-19:00", line)

    def test_reservation_time_text_prefers_structured_fields(self) -> None:
        time_text = reservation_time_text(SAMPLE_RESERVATIONS[0])
        self.assertEqual(time_text, "2026-04-03 18:00-19:00")


class CancelSchedulerParsingTests(unittest.TestCase):
    def test_parse_lead(self) -> None:
        self.assertEqual(parse_lead("90s"), 90)
        self.assertEqual(parse_lead("1.5m"), 90)
        self.assertEqual(parse_lead("1h"), 3600)

    def test_parse_start_time(self) -> None:
        parsed = parse_start_time("2026-04-03 18:00-19:00")
        self.assertIsNotNone(parsed)
        assert parsed is not None
        self.assertEqual(parsed.year, 2026)
        self.assertEqual(parsed.month, 4)
        self.assertEqual(parsed.day, 3)
        self.assertEqual(parsed.hour, 18)
        self.assertEqual(parsed.minute, 0)


if __name__ == "__main__":
    unittest.main()
