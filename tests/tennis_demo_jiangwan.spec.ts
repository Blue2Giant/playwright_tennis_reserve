import { test } from '@playwright/test';
import { type SlotMode, openJiangwanOutdoorReservationPage, selectAndConfirmSlot } from './helpers/jiangwan_tennis';

// 调用方式
// DAY_INDEX=0 SLOT_MODE=first npx playwright test tests/tennis_demo_jiangwan.spec.ts
// DAY_INDEX=1 SLOT_MODE=medium npx playwright test tests/tennis_demo_jiangwan.spec.ts
// DAY_INDEX=2 SLOT_MODE=back npx playwright test tests/tennis_demo_jiangwan.spec.ts

test('test', async ({ page }) => {
  const reservationPage = await openJiangwanOutdoorReservationPage(page);
  const dayIndexEnv = process.env.DAY_INDEX;
  const slotModeEnv = process.env.SLOT_MODE as SlotMode | undefined;

  const dayIndex = dayIndexEnv ? Number(dayIndexEnv) : 2;
  const slotMode: SlotMode = slotModeEnv ?? 'first';

  await selectAndConfirmSlot(reservationPage, dayIndex, slotMode);
  await reservationPage.close();
});
