import unittest

from book_tennis import choose_booking_target, choose_slot


SAMPLE_DAYS = [
    {
        "dayIndex": 0,
        "label": "2026-04-03 周五",
        "date": "2026-04-03",
        "weekday": "周五",
        "slots": [
            {"slotIndex": 1, "time": "08:00-09:00", "statusText": "可预约"},
            {"slotIndex": 3, "time": "10:00-11:00", "statusText": "可预约"},
            {"slotIndex": 4, "time": "11:00-12:00", "statusText": "可预约"},
        ],
    }
]


class BookTennisTests(unittest.TestCase):
    def test_choose_slot_first(self) -> None:
        selected = choose_slot(SAMPLE_DAYS[0], "first")
        self.assertEqual(selected["slotIndex"], 1)

    def test_choose_slot_medium(self) -> None:
        selected = choose_slot(SAMPLE_DAYS[0], "medium")
        self.assertEqual(selected["slotIndex"], 3)

    def test_choose_slot_back(self) -> None:
        selected = choose_slot(SAMPLE_DAYS[0], "back")
        self.assertEqual(selected["slotIndex"], 4)

    def test_choose_booking_target_returns_day_and_slot(self) -> None:
        target = choose_booking_target(SAMPLE_DAYS, day_index=0, mode="back")
        self.assertEqual(target["dayIndex"], 0)
        self.assertEqual(target["slotIndex"], 4)
        self.assertEqual(target["time"], "11:00-12:00")


if __name__ == "__main__":
    unittest.main()
