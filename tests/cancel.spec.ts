import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
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
  await page.getByText('已预约').click();
  await page.getByRole('button', { name: '取消预约' }).first().click();
  await page.getByRole('button', { name: '确认' }).click();
  await page.goto('https://booking.fudan.edu.cn/reservation/fe/site/myReservation');
});