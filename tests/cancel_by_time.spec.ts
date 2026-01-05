import { test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function cancelByTime(page: Page, targetTime: string) {
  await page.goto('https://booking.fudan.edu.cn/reservation/fe/');
  try {
    await page.getByRole('button', { name: '登录' }).click({ timeout: 2000 });
  } catch {
  }
  await page.getByRole('textbox', { name: 'username' }).click();
  await page.getByRole('textbox', { name: 'username' }).fill('23210720184');
  await page.locator('#login-password').click();
  await page.locator('#login-password').fill('Ybz88280889');
  await page.locator('#login-password').press('Enter');
  await page.getByText('体育场馆网上预约').click();
  await page.getByText('我的预约').click();
  const reservedTab = page.getByText('已预约', { exact: true }).first();
  await reservedTab.click();

  await page.waitForSelector(
    'div.myReservation > div.reservation_main > div > div:nth-child(2) div.n-scrollbar-container > div > table > tbody > tr',
  );
  const rows = page.locator(
    'div.myReservation > div.reservation_main > div > div:nth-child(2) div.n-scrollbar-container > div > table > tbody > tr',
  );
  const rowCount = await rows.count();

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const timeCell = row.locator('td').nth(2);
    const timeText = (await timeCell.textContent())?.trim() ?? '';
    if (timeText !== targetTime) continue;

    const cancelCell = row.locator(
      'td.n-data-table-td.n-data-table-td--fixed-right.n-data-table-td--last-col',
    );
    const cancelButton = cancelCell.getByRole('button', { name: '取消预约' }).first();
    await cancelButton.click();
    const confirmButton = page.getByRole('button', { name: '确认' }).first();
    await confirmButton.click();
    console.log('CANCELLED ' + timeText);
    break;
  }
}

test('cancel reservation by time', async ({ page }) => {
  const targetTime = process.env.TARGET_TIME;
  if (!targetTime) {
    console.log('NO_TARGET_TIME');
    return;
  }
  await cancelByTime(page, targetTime);
});

