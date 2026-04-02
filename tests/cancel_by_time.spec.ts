import { test } from '@playwright/test';
import { cancelReservation, type ReservationTarget } from './helpers/reservation';

function loadTarget(): ReservationTarget | null {
  const targetReservation = process.env.TARGET_RESERVATION_JSON;
  if (targetReservation) {
    return JSON.parse(targetReservation) as ReservationTarget;
  }

  const targetTime = process.env.TARGET_TIME;
  if (targetTime) {
    return { time: targetTime };
  }

  const targetIndex = process.env.TARGET_INDEX;
  if (targetIndex) {
    return { index: Number(targetIndex) };
  }

  return null;
}

test('cancel reservation by time', async ({ page }) => {
  const target = loadTarget();
  if (!target) {
    console.log('NO_TARGET_RESERVATION');
    return;
  }

  const cancelled = await cancelReservation(page, target);
  console.log(
    'CANCEL_RESULT ' +
      JSON.stringify({
        success: Boolean(cancelled),
        reservation: cancelled,
      }),
  );

  if (!cancelled) {
    throw new Error('未找到匹配的预约记录');
  }
});
