import { type Locator, type Page } from '@playwright/test';

const ROOT_URL = 'https://booking.fudan.edu.cn/reservation/fe/';
export const JIANGWAN_OUTDOOR_TENNIS_VENUE = '江湾室外体育场-网球';

const BOOKING_USERNAME = process.env.BOOKING_USERNAME ?? '23210720184';
const BOOKING_PASSWORD = process.env.BOOKING_PASSWORD ?? 'Ybz88280889';

export type AvailableSlot = {
  slotIndex: number;
  time: string;
  statusText: string;
};

export type DayAvailability = {
  dayIndex: number;
  label: string;
  date: string;
  weekday: string;
  availableCount: number;
  slots: AvailableSlot[];
};

export type TennisVenueAvailability = {
  venueName: string;
  reservationUrl: string;
  pageTitle: string;
  availableCount: number;
  days: DayAvailability[];
  error?: string;
};

export function normalizeText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

export async function login(page: Page): Promise<void> {
  await page.goto(ROOT_URL);
  const bookingEntry = page.getByText('体育场馆网上预约');

  if (await bookingEntry.isVisible({ timeout: 1500 }).catch(() => false)) {
    return;
  }

  try {
    await page.getByRole('button', { name: '登录' }).click({ timeout: 1000 });
  } catch {
    // 已经处于登录页或登录态，忽略即可。
  }

  const usernameInput = page.getByRole('textbox', { name: 'username' });
  await usernameInput.waitFor({ state: 'visible', timeout: 5000 });
  await usernameInput.click();
  await usernameInput.fill(BOOKING_USERNAME);
  const passwordInput = page.locator('#login-password');
  await passwordInput.click();
  await passwordInput.fill(BOOKING_PASSWORD);
  await passwordInput.press('Enter');

  await bookingEntry.waitFor({ state: 'visible', timeout: 8000 });
}

export async function openTennisVenueList(page: Page): Promise<void> {
  await login(page);
  await page.getByText('体育场馆网上预约').click();
  await page.getByText('网球', { exact: true }).click();
  await page.locator('.reservation_list .hall_center_item:visible').first().waitFor({ timeout: 8000 });
}

export async function listTennisVenueNames(page: Page): Promise<string[]> {
  const names = await page.locator('.reservation_list .hall_name').evaluateAll((nodes) => {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const node of nodes) {
      const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || !text.includes('网球') || seen.has(text)) {
        continue;
      }

      seen.add(text);
      result.push(text);
    }

    return result;
  });

  return names;
}

function parseDayLabel(text: string): { date: string; weekday: string } {
  const normalized = normalizeText(text);
  const match = normalized.match(/(\d{4}-\d{1,2}-\d{1,2})\s*(周.)?/);
  return {
    date: match?.[1] ?? '',
    weekday: match?.[2] ?? '',
  };
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

export async function collectReservationPageAvailability(reservationPage: Page): Promise<DayAvailability[]> {
  const weekCalendarDates = reservationPage.locator('div.week_calendar > dl');
  const dateCount = await weekCalendarDates.count();
  if (dateCount === 0) {
    return [];
  }

  const headerTimes = await extractHeaderTimes(weekCalendarDates.nth(0));
  const result: DayAvailability[] = [];

  for (let i = 1; i < dateCount; i++) {
    const dateLocator = weekCalendarDates.nth(i);
    const label = normalizeText(await dateLocator.locator('dt').textContent());
    const { date, weekday } = parseDayLabel(label);
    const cells = dateLocator.locator('dd');
    const slotCount = await cells.count();
    const slots: AvailableSlot[] = [];

    for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
      const cell = cells.nth(slotIndex);
      const className = (await cell.getAttribute('class')) ?? '';
      const isAvailable =
        className.includes('green') &&
        className.includes('can_active') &&
        className.includes('resource_item_info');

      if (!isAvailable) {
        continue;
      }

      slots.push({
        slotIndex: slotIndex + 1,
        time: headerTimes[slotIndex] ?? '',
        statusText: normalizeText(await cell.textContent()),
      });
    }

    result.push({
      dayIndex: i - 1,
      label,
      date,
      weekday,
      availableCount: slots.length,
      slots,
    });
  }

  return result;
}

export async function openTennisVenueReservationPage(page: Page, venueName: string): Promise<{
  venueName: string;
  reservationPage: Page;
}> {
  const popupPromise = page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);

  const clicked = await page.evaluate((targetVenueName) => {
    const items = Array.from(document.querySelectorAll('.reservation_list .hall_center_item'));

    for (const item of items) {
      const venueNameText = (item.querySelector('.hall_name')?.textContent || '').replace(/\s+/g, ' ').trim();
      if (venueNameText !== targetVenueName) {
        continue;
      }

      const reserveButton = item.querySelector('.btn_openR');
      if (!(reserveButton instanceof HTMLElement)) {
        return false;
      }

      reserveButton.click();
      return true;
    }

    return false;
  }, venueName);
  if (!clicked) {
    throw new Error(`未找到场馆卡片: ${venueName}`);
  }

  const confirmButton = page.getByRole('button', { name: '确定' });
  if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await confirmButton.click();
  }

  const reservationPage = await popupPromise;
  if (!reservationPage) {
    throw new Error('未打开预约详情页');
  }

  await reservationPage.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
  await reservationPage.waitForSelector('div.week_calendar', { timeout: 10000 });

  return { venueName, reservationPage };
}

export async function collectAllTennisVenueAvailability(page: Page): Promise<TennisVenueAvailability[]> {
  await openTennisVenueList(page);

  const venueNames = await listTennisVenueNames(page);
  const result: TennisVenueAvailability[] = [];

  for (let i = 0; i < venueNames.length; i++) {
    let reservationPage: Page | null = null;
    let venueName = venueNames[i] ?? `场馆#${i + 1}`;

    try {
      const openedVenue = await openTennisVenueReservationPage(page, venueName);
      venueName = openedVenue.venueName;
      reservationPage = openedVenue.reservationPage;

      const days = await collectReservationPageAvailability(reservationPage);
      const availableCount = days.reduce((sum, day) => sum + day.availableCount, 0);

      result.push({
        venueName,
        reservationUrl: reservationPage.url(),
        pageTitle: normalizeText(await reservationPage.title().catch(() => '')),
        availableCount,
        days,
      });
    } catch (error) {
      result.push({
        venueName,
        reservationUrl: reservationPage?.url() ?? '',
        pageTitle: '',
        availableCount: 0,
        days: [],
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await reservationPage?.close().catch(() => {});
      await page.bringToFront().catch(() => {});
    }
  }

  return result;
}
