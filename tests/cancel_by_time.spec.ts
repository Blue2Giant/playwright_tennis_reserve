import { test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function cancelByTime(page: Page, targetTime: string) {
  let datePart = '';
  let timePart = '';
  const m = targetTime.match(/(\d{4}-\d{1,2}-\d{1,2}).*?(\d{1,2}:\d{2})/);
  if (m) {
    datePart = m[1];
    timePart = m[2];
  }

  await page.goto('https://booking.fudan.edu.cn/reservation/fe/');
  try {
    await page.getByRole('button', { name: '登录' }).click({ timeout: 200 });
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
    const divs = timeCell.locator('div');
    const dateText = ((await divs.nth(0).textContent()) ?? '').trim();
    const intervalText = ((await divs.nth(1).textContent()) ?? '').trim();
    console.log('ROW_PARTS', i + 1, dateText, intervalText);

    if (datePart && timePart) {
      if (!dateText.includes(datePart)) continue;
      if (!intervalText.includes(timePart)) continue;
    } else {
      const combined = ((await timeCell.textContent()) ?? '').replace(/\s/g, '');
      const targetKey = targetTime.replace(/\s/g, '');
      if (!combined.includes(targetKey)) continue;
    }

    const cancelCell = row.locator(
      'td.n-data-table-td.n-data-table-td--fixed-right.n-data-table-td--last-col',
    );
    const cancelButton = cancelCell.getByRole('button', { name: '取消预约' }).first();
    await cancelButton.click();
    const confirmButton = page.getByRole('button', { name: '确认' }).first();
    await confirmButton.click();
    console.log('CANCELLED', dateText, intervalText);
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
