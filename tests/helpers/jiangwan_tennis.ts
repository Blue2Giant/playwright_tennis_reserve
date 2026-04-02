import { expect, type Locator, type Page } from '@playwright/test';

import {
  JIANGWAN_OUTDOOR_TENNIS_VENUE,
  type AvailableSlot,
  type DayAvailability,
  collectReservationPageAvailability,
  normalizeText,
  openTennisVenueReservationPage,
} from './tennis_availability';

export type SlotMode = 'first' | 'medium' | 'back';

export type JiangwanSelectedSlot = AvailableSlot & {
  dayIndex: number;
  label: string;
  date: string;
  weekday: string;
};

function isAvailableSlotClass(className: string): boolean {
  return (
    className.includes('green') &&
    className.includes('can_active') &&
    className.includes('resource_item_info')
  );
}

async function extractHeaderTimes(header: Locator): Promise<string[]> {
  const cells = header.locator('dd');
  const count = await cells.count();
  const times: string[] = [];

  for (let i = 0; i < count; i++) {
    times.push(normalizeText(await cells.nth(i).textContent()));
  }

  return times;
}

async function resolveDayContext(
  reservationPage: Page,
  dayIndex: number,
): Promise<{
  dayLocator: Locator;
  headerTimes: string[];
  availabilityDay: DayAvailability;
} | null> {
  const availability = await collectReservationPageAvailability(reservationPage);
  const availabilityDay = availability.find((item) => item.dayIndex === dayIndex);
  if (!availabilityDay) {
    return null;
  }

  await reservationPage.waitForSelector('div.week_calendar', { timeout: 2000 });
  const weekCalendarDates = reservationPage.locator('div.week_calendar > dl');
  const dayLocator = weekCalendarDates.nth(dayIndex + 1);
  const headerTimes = await extractHeaderTimes(weekCalendarDates.nth(0));

  return {
    dayLocator,
    headerTimes,
    availabilityDay,
  };
}

export async function openJiangwanOutdoorReservationPage(page: Page): Promise<Page> {
  const openedVenue = await openTennisVenueReservationPage(page, JIANGWAN_OUTDOOR_TENNIS_VENUE);
  return openedVenue.reservationPage;
}

export async function collectJiangwanOutdoorAvailability(
  reservationPage: Page,
): Promise<DayAvailability[]> {
  return collectReservationPageAvailability(reservationPage);
}

export async function selectAndConfirmSpecificSlot(
  reservationPage: Page,
  dayIndex: number,
  slotIndex: number,
  expectedTime?: string,
  dryRun: boolean = false,
): Promise<JiangwanSelectedSlot | null> {
  const context = await resolveDayContext(reservationPage, dayIndex);
  if (!context) {
    return null;
  }

  const { dayLocator, headerTimes, availabilityDay } = context;
  const slots = dayLocator.locator('dd');
  const slotCount = await slots.count();

  if (slotIndex < 1 || slotIndex > slotCount) {
    return null;
  }

  const slot = slots.nth(slotIndex - 1);
  const className = (await slot.getAttribute('class')) ?? '';
  const time = headerTimes[slotIndex - 1] ?? '';
  const statusText = normalizeText(await slot.textContent());
  const normalizedExpectedTime = normalizeText(expectedTime);

  if (normalizedExpectedTime && normalizedExpectedTime !== time) {
    return null;
  }

  if (!isAvailableSlotClass(className)) {
    return null;
  }

  await expect(slot).toBeVisible({ timeout: 2000 });
  await expect(slot).toBeEnabled({ timeout: 2000 });
  await slot.scrollIntoViewIfNeeded();
  await slot.click();
  await expect(slot).toHaveClass(/active/, { timeout: 1000 });

  const selectedSlot: JiangwanSelectedSlot = {
    dayIndex,
    label: availabilityDay.label,
    date: availabilityDay.date,
    weekday: availabilityDay.weekday,
    slotIndex,
    time,
    statusText,
  };

  if (dryRun) {
    return selectedSlot;
  }

  const confirmButton = reservationPage.getByRole('button', { name: '确认预约' });
  await expect(confirmButton).toBeEnabled({ timeout: 2000 });
  await confirmButton.click();
  return selectedSlot;
}

export async function selectAndConfirmSlot(
  reservationPage: Page,
  dayIndex: number,
  mode: SlotMode,
  dryRun: boolean = false,
): Promise<JiangwanSelectedSlot | null> {
  const availability = await collectReservationPageAvailability(reservationPage);
  const day = availability.find((item) => item.dayIndex === dayIndex);
  if (!day || day.slots.length === 0) {
    return null;
  }

  let targetSlot = day.slots[0];
  if (mode === 'back') {
    targetSlot = day.slots[day.slots.length - 1];
  } else if (mode === 'medium') {
    targetSlot = day.slots[Math.floor((day.slots.length - 1) / 2)];
  }

  return selectAndConfirmSpecificSlot(
    reservationPage,
    dayIndex,
    targetSlot.slotIndex,
    targetSlot.time,
    dryRun,
  );
}
