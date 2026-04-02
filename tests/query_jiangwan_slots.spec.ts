import { test } from '@playwright/test';

import {
  collectJiangwanOutdoorAvailability,
  openJiangwanOutdoorReservationPage,
} from './helpers/jiangwan_tennis';

test('query jiangwan outdoor tennis available slots', async ({ page }) => {
  const reservationPage = await openJiangwanOutdoorReservationPage(page);
  const availability = await collectJiangwanOutdoorAvailability(reservationPage);
  console.log('SLOT_DATA ' + JSON.stringify(availability));
  await reservationPage.close();
});
