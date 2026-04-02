import { test } from '@playwright/test';

import { collectReservations } from './helpers/reservation';

test('cancel dry run list reservations', async ({ page }) => {
  const reservations = await collectReservations(page);
  console.log('RES_DATA ' + JSON.stringify(reservations));
});
