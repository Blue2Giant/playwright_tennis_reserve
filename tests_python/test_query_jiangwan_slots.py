import unittest

from query_jiangwan_slots import (
    JIANGWAN_OUTDOOR_TENNIS_VENUE,
    filter_days,
    filter_venues,
    find_venue,
    get_jiangwan_availability,
)


SAMPLE_VENUES = [
    {
        "venueName": "本北高速室外网球场-网球",
        "availableCount": 0,
        "days": [
            {
                "dayIndex": 0,
                "date": "2026-04-03",
                "weekday": "周五",
                "label": "2026-04-03 周五",
                "availableCount": 0,
                "slots": [],
            }
        ],
    },
    {
        "venueName": JIANGWAN_OUTDOOR_TENNIS_VENUE,
        "availableCount": 3,
        "days": [
            {
                "dayIndex": 0,
                "date": "2026-04-03",
                "weekday": "周五",
                "label": "2026-04-03 周五",
                "availableCount": 2,
                "slots": [
                    {"slotIndex": 1, "time": "08:00-09:00", "statusText": "可预约"},
                    {"slotIndex": 2, "time": "09:00-10:00", "statusText": "可预约"},
                ],
            },
            {
                "dayIndex": 1,
                "date": "2026-04-04",
                "weekday": "周六",
                "label": "2026-04-04 周六",
                "availableCount": 1,
                "slots": [
                    {"slotIndex": 3, "time": "12:00-13:00", "statusText": "可预约"},
                ],
            },
        ],
    },
]


class QueryJiangwanSlotsTests(unittest.TestCase):
    def test_find_venue_matches_exact_name(self) -> None:
        venue = find_venue(SAMPLE_VENUES, venue_name=JIANGWAN_OUTDOOR_TENNIS_VENUE)

        self.assertIsNotNone(venue)
        assert venue is not None
        self.assertEqual(venue["venueName"], JIANGWAN_OUTDOOR_TENNIS_VENUE)

    def test_get_jiangwan_availability_returns_days(self) -> None:
        days = get_jiangwan_availability(SAMPLE_VENUES)

        self.assertEqual(len(days), 2)
        self.assertEqual(days[0]["date"], "2026-04-03")
        self.assertEqual(days[1]["date"], "2026-04-04")

    def test_filter_days_only_available(self) -> None:
        filtered = filter_days(
            [
                {"dayIndex": 0, "availableCount": 0, "slots": []},
                {"dayIndex": 1, "availableCount": 2, "slots": [{"slotIndex": 1}]},
            ],
            only_available=True,
        )

        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0]["dayIndex"], 1)

    def test_filter_venues_only_available(self) -> None:
        filtered = filter_venues(SAMPLE_VENUES, only_available=True)

        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0]["venueName"], JIANGWAN_OUTDOOR_TENNIS_VENUE)
        self.assertEqual(len(filtered[0]["days"]), 2)


if __name__ == "__main__":
    unittest.main()
