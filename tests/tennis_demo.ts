import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://booking.fudan.edu.cn/reservation/fe/');
  await page.getByText('登录').click();
  await page.getByRole('textbox', { name: 'username' }).click();
  await page.getByRole('textbox', { name: 'username' }).fill('23210720184');
  await page.locator('#login-password').click();
  await page.locator('#login-password').fill('Ybz88280889');
  await page.locator('#login-password').press('Enter');
  await page.getByText('体育场馆网上预约').click();
  await page.getByText('网球', { exact: true }).click();
  await page.getByText('江湾室外体育场-网球').click();
  const page1Promise = page.waitForEvent('popup');
  await page.getByText('去预约').nth(4).click(); // 这里是江湾室外体育场-网球的去预约按钮
  //await page.getByText('去预约').nth(4).click(); //这里是江湾室内体育场去预约的按钮
  const page1 = await page1Promise;
  await page1.getByText('可预约 (0/2)').nth(5).click();
  await page1.getByRole('button', { name: '确认预约' }).click();
});