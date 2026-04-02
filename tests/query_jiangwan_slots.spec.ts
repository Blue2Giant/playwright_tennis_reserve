import { test } from '@playwright/test';

import { collectAllTennisVenueAvailability } from './helpers/tennis_availability';

test('query tennis available slots across venues', async ({ page }) => {
  test.setTimeout(90_000);
  const availability = await collectAllTennisVenueAvailability(page);
  console.log('SLOT_DATA ' + JSON.stringify(availability));
});
