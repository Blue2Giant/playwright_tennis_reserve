import { test } from '@playwright/test';

test('cancel dry run list reservations', async ({ page }) => {
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
  console.log(`已预约表格行数: ${rowCount}`);

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const timeCell = row.locator('td').nth(2);
    const timeText = (await timeCell.textContent())?.trim() ?? '';

    const cancelCell = row.locator(
      'td.n-data-table-td.n-data-table-td--fixed-right.n-data-table-td--last-col',
    );
    const cancelButton = cancelCell.getByRole('button', { name: '取消预约' });
    const cancelCount = await cancelButton.count();

    console.log(
      `行 ${i + 1}: 时间单元格文本="${timeText}", 取消按钮数量=${cancelCount}, 取消按钮定位=${cancelButton}`,
    );
  }
});
