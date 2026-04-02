import type { Locator, Page } from '@playwright/test';

const ROOT_URL = 'https://booking.fudan.edu.cn/reservation/fe/';
const ROW_SELECTOR =
  'div.myReservation > div.reservation_main > div > div:nth-child(2) div.n-scrollbar-container > div > table > tbody > tr';

const BOOKING_USERNAME = process.env.BOOKING_USERNAME ?? '23210720184';
const BOOKING_PASSWORD = process.env.BOOKING_PASSWORD ?? 'Ybz88280889';

export type ReservationInfo = {
  index: number;
  venue: string;
  court: string;
  bookingType: string;
  date: string;
  interval: string;
  time: string;
  status: string;
  createdAt: string;
  canCancel: boolean;
  rowText: string;
  signature: string;
  cellTexts: string[];
};

export type ReservationTarget = Partial<ReservationInfo>;

function normalizeText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

function compactText(text: string | null | undefined): string {
  return normalizeText(text).replace(/\s+/g, '').toLowerCase();
}

function parseBookingCell(text: string): { venue: string; court: string; bookingType: string } {
  const normalized = normalizeText(text);
  const parts = normalized.split('_', 3);
  const venue = parts[0] ?? normalized;
  const court = parts[1] ?? '';
  const bookingType = normalizeText(parts[2]).split(' ')[0] ?? '';
  return { venue, court, bookingType };
}

function parseTimeText(text: string): { date: string; interval: string; time: string } {
  const normalized = normalizeText(text);
  const match = normalized.match(/^(\d{4}-\d{1,2}-\d{1,2})\s*(\d{1,2}:\d{2}-\d{1,2}:\d{2})$/);
  if (match) {
    const date = match[1];
    const interval = match[2];
    return { date, interval, time: `${date} ${interval}` };
  }

  return {
    date: '',
    interval: '',
    time: normalized,
  };
}

async function loginIfNeeded(page: Page): Promise<void> {
  const usernameInput = page.getByRole('textbox', { name: 'username' });
  const needsLogin = await usernameInput.isVisible({ timeout: 1000 }).catch(() => false);
  if (!needsLogin) {
    return;
  }

  await usernameInput.click();
  await usernameInput.fill(BOOKING_USERNAME);
  const passwordInput = page.locator('#login-password');
  await passwordInput.click();
  await passwordInput.fill(BOOKING_PASSWORD);
  await passwordInput.press('Enter');
}

export async function openReservedTab(page: Page): Promise<void> {
  await page.goto(ROOT_URL);
  try {
    await page.getByRole('button', { name: '登录' }).click({ timeout: 1000 });
  } catch {
    // 页面可能已经处于登录态，忽略即可。
  }

  await loginIfNeeded(page);
  await page.getByText('体育场馆网上预约').click();
  await page.getByText('我的预约').click();
  await page.getByText('已预约', { exact: true }).first().click();
  await page.locator('div.myReservation').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(400);
}

async function extractReservationInfo(row: Locator, index: number): Promise<ReservationInfo> {
  const cells = row.locator('td');
  const cellCount = await cells.count();
  const cellTexts: string[] = [];

  for (let i = 0; i < cellCount; i++) {
    cellTexts.push(normalizeText(await cells.nth(i).textContent()));
  }

  const rowIndexText = cellTexts[0] ?? '';
  const parsedIndex = Number(rowIndexText);
  const reservationIndex = Number.isFinite(parsedIndex) ? parsedIndex : index;
  const bookingInfo = parseBookingCell(cellTexts[1] ?? '');
  const timeCellIndex = cellCount >= 3 ? 2 : Math.max(0, cellCount - 1);
  const rawTimeText = cellTexts[timeCellIndex] ?? '';
  const parsedTime = parseTimeText(rawTimeText);
  const timeCell = cells.nth(timeCellIndex);
  const timeDivs = timeCell.locator('div');
  const timeDivCount = await timeDivs.count();

  let date = parsedTime.date;
  let interval = parsedTime.interval;

  if (!date && timeDivCount >= 1) {
    date = normalizeText(await timeDivs.nth(0).textContent());
  }

  if (!interval && timeDivCount >= 2) {
    interval = normalizeText(await timeDivs.nth(1).textContent());
  }

  const time = normalizeText(`${date} ${interval}`) || parsedTime.time;

  const venue = bookingInfo.venue;
  const court = bookingInfo.court;
  const bookingType = bookingInfo.bookingType;
  const status = cellCount >= 4 ? cellTexts[3] ?? '' : '';
  const createdAt = cellCount >= 5 ? cellTexts[4] ?? '' : '';
  const cancelButton = row.getByRole('button', { name: '取消预约' }).first();
  const canCancel = (await cancelButton.count().catch(() => 0)) > 0;
  const rowText = normalizeText(cellTexts.join(' | '));
  const signature =
    normalizeText([venue, court, date, interval, createdAt].filter(Boolean).join(' | ')) || rowText;

  return {
    index: reservationIndex,
    venue,
    court,
    bookingType,
    date,
    interval,
    time,
    status,
    createdAt,
    canCancel,
    rowText,
    signature,
    cellTexts,
  };
}

async function collectReservationRows(
  page: Page,
): Promise<Array<{ info: ReservationInfo; row: Locator }>> {
  const rows = page.locator(ROW_SELECTOR);
  const rowCount = await rows.count();
  const result: Array<{ info: ReservationInfo; row: Locator }> = [];

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const info = await extractReservationInfo(row, i + 1);
    result.push({ info, row });
  }

  return result;
}

function matchesReservation(info: ReservationInfo, target: ReservationTarget): boolean {
  if (target.signature && compactText(info.signature) === compactText(target.signature)) {
    return true;
  }

  if (target.index !== undefined && info.index !== target.index) {
    return false;
  }

  if (target.date && compactText(info.date) !== compactText(target.date)) {
    return false;
  }

  if (target.interval && !compactText(info.interval).includes(compactText(target.interval))) {
    return false;
  }

  if (target.time && !compactText(info.time).includes(compactText(target.time))) {
    return false;
  }

  if (target.venue && !compactText(info.venue).includes(compactText(target.venue))) {
    return false;
  }

  if (target.court && !compactText(info.court).includes(compactText(target.court))) {
    return false;
  }

  if (
    target.bookingType &&
    !compactText(info.bookingType).includes(compactText(target.bookingType))
  ) {
    return false;
  }

  if (target.rowText && !compactText(info.rowText).includes(compactText(target.rowText))) {
    return false;
  }

  if (target.createdAt && compactText(info.createdAt) !== compactText(target.createdAt)) {
    return false;
  }

  if (target.cellTexts && target.cellTexts.length > 0) {
    const expected = target.cellTexts.map((item) => compactText(item));
    const current = info.cellTexts.map((item) => compactText(item));
    if (expected.length !== current.length) {
      return false;
    }
    for (let i = 0; i < expected.length; i++) {
      if (expected[i] && expected[i] !== current[i]) {
        return false;
      }
    }
  }

  return Boolean(
    target.signature ||
      (target.cellTexts && target.cellTexts.length > 0) ||
    target.index !== undefined ||
      target.date ||
      target.interval ||
      target.time ||
      target.venue ||
      target.court ||
      target.bookingType ||
      target.createdAt ||
      target.rowText,
  );
}

export async function collectReservations(page: Page): Promise<ReservationInfo[]> {
  await openReservedTab(page);
  const rows = await collectReservationRows(page);
  return rows.map((item) => item.info);
}

export async function cancelReservation(
  page: Page,
  target: ReservationTarget,
): Promise<ReservationInfo | null> {
  await openReservedTab(page);
  const rows = await collectReservationRows(page);
  const matched = rows.find((item) => matchesReservation(item.info, target));

  if (!matched) {
    return null;
  }

  const cancelButton = matched.row.getByRole('button', { name: '取消预约' }).first();
  if ((await cancelButton.count().catch(() => 0)) === 0) {
    throw new Error(`目标预约不可取消: ${matched.info.signature}`);
  }

  await cancelButton.click();
  await page.getByRole('button', { name: '确认' }).first().click();
  await page.waitForTimeout(500);
  return matched.info;
}
