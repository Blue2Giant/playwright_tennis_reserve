import { expect, type Locator, type Page } from '@playwright/test';

const ROOT_URL = 'https://booking.fudan.edu.cn/reservation/fe/';
const JIANGWAN_OUTDOOR_RESERVATION_URL =
  'https://booking.fudan.edu.cn/reservation/fe/site/reservationInfo?id=1071';

const BOOKING_USERNAME = process.env.BOOKING_USERNAME ?? '23210720184';
const BOOKING_PASSWORD = process.env.BOOKING_PASSWORD ?? 'Ybz88280889';

export type SlotMode = 'first' | 'medium' | 'back';

export type JiangwanAvailableSlot = {
  slotIndex: number;
  time: string;
  statusText: string;
};

export type JiangwanDayAvailability = {
  dayIndex: number;
  label: string;
  date: string;
  weekday: string;
  availableCount: number;
  slots: JiangwanAvailableSlot[];
};

function normalizeText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

async function login(page: Page): Promise<void> {
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

export async function openJiangwanOutdoorReservationPage(page: Page): Promise<Page> {
  await login(page);

  const reservationPage = await page.context().newPage();
  await reservationPage.goto(JIANGWAN_OUTDOOR_RESERVATION_URL);
  await reservationPage.waitForSelector('div.week_calendar', { timeout: 8000 });
  return reservationPage;
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

export async function collectJiangwanOutdoorAvailability(
  reservationPage: Page,
): Promise<JiangwanDayAvailability[]> {
  const weekCalendarDates = reservationPage.locator('div.week_calendar > dl');
  const dateCount = await weekCalendarDates.count();
  if (dateCount === 0) {
    return [];
  }

  const headerTimes = await extractHeaderTimes(weekCalendarDates.nth(0));
  const result: JiangwanDayAvailability[] = [];

  for (let i = 1; i < dateCount; i++) {
    const dateLocator = weekCalendarDates.nth(i);
    const label = normalizeText(await dateLocator.locator('dt').textContent());
    const { date, weekday } = parseDayLabel(label);
    const cells = dateLocator.locator('dd');
    const slotCount = await cells.count();
    const slots: JiangwanAvailableSlot[] = [];

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

export async function selectAndConfirmSlot(
  reservationPage: Page,
  dayIndex: number,
  mode: SlotMode,
): Promise<boolean> {
  await reservationPage.waitForSelector('div.week_calendar', { timeout: 2000 });
  const weekCalendarDates = reservationPage.locator('div.week_calendar > dl');
  const dateCount = await weekCalendarDates.count();

  console.log(`week_calendar dl 总数: ${dateCount}`);

  const baseIndex = 1;
  const targetDlIndex = baseIndex + dayIndex;

  if (targetDlIndex >= dateCount) {
    console.log(
      `目标日期索引超出范围: dayIndex=${dayIndex}, targetDlIndex=${targetDlIndex}, dateCount=${dateCount}`,
    );
    return false;
  }

  const dateLocator = weekCalendarDates.nth(targetDlIndex);
  console.log(`候选日期元素: dl:nth-child(${targetDlIndex + 1})`);

  const availableSlots = dateLocator.locator('dd.green.pointer.can_active.resource_item_info');
  const slotCount = await availableSlots.count();
  console.log(
    `  该日期可预约元素数量(slotCount): ${slotCount}, availableSlots 类型: ${availableSlots}`,
  );

  if (slotCount === 0) {
    console.log('该日期没有可预约时段');
    return false;
  }

  let slotIndex = 0;
  if (mode === 'back') {
    slotIndex = slotCount - 1;
  } else if (mode === 'medium') {
    slotIndex = Math.floor((slotCount - 1) / 2);
  }

  const slot = availableSlots.nth(slotIndex);
  const slotText = await slot.textContent();
  console.log(
    `准备点击: 日期 dl:nth-child(${targetDlIndex + 1}), 选中模式: ${mode}, 时间 dd 序号(从1开始) = ${
      slotIndex + 1
    }, 文本内容: ${slotText}`,
  );

  await expect(slot).toBeVisible({ timeout: 2000 });
  await expect(slot).toBeEnabled({ timeout: 2000 });
  await slot.scrollIntoViewIfNeeded();
  await slot.click();
  await expect(slot).toHaveClass(/active/, { timeout: 1000 });

  const confirmButton = reservationPage.getByRole('button', { name: '确认预约' });
  await expect(confirmButton).toBeEnabled({ timeout: 2000 });
  await confirmButton.click();
  console.log('已点击确认预约按钮');
  return true;
}
