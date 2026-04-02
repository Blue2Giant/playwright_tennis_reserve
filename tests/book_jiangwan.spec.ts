import { expect, test } from '@playwright/test';

import {
  openJiangwanOutdoorReservationPage,
  selectAndConfirmSpecificSlot,
} from './helpers/jiangwan_tennis';

const BOOKING_RESULT_PREFIX = 'BOOKING_RESULT ';

function parseRequiredInt(name: string): number {
  const raw = process.env[name];
  if (!raw) {
    throw new Error(`缺少环境变量 ${name}`);
  }

  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new Error(`环境变量 ${name} 不是整数: ${raw}`);
  }

  return value;
}

test('book jiangwan outdoor tennis slot', async ({ page }) => {
  test.setTimeout(60_000);

  const dayIndex = parseRequiredInt('TARGET_DAY_INDEX');
  const slotIndex = parseRequiredInt('TARGET_SLOT_INDEX');
  const expectedTime = process.env.TARGET_SLOT_TIME ?? '';
  const dryRun = process.env.DRY_RUN === '1';

  const result: Record<string, unknown> = {
    success: false,
    dryRun,
    dayIndex,
    slotIndex,
    expectedTime,
  };

  const reservationPage = await openJiangwanOutdoorReservationPage(page);

  try {
    const selectedSlot = await selectAndConfirmSpecificSlot(
      reservationPage,
      dayIndex,
      slotIndex,
      expectedTime,
      dryRun,
    );

    if (!selectedSlot) {
      result.reason = '目标时段不存在、时间不匹配或当前不可预约';
    } else {
      result.success = true;
      result.selectedSlot = selectedSlot;
      result.action = dryRun ? 'selected_without_confirm' : 'confirmed';
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    console.log(BOOKING_RESULT_PREFIX + JSON.stringify(result));
    await reservationPage.close().catch(() => {});
  }

  expect(result.success).toBeTruthy();
});
