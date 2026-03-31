import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://id.fudan.edu.cn/ac/#/index?lck=context_CAS_1e2a4926e01d4545ade20e27aa8ae4f9&entityId=https%3A%2F%2Fbooking.fudan.edu.cn&theme=6e6466d6f563406ca6d124cca2d53ad8');
  await page.getByRole('textbox', { name: 'username' }).click();
  await page.getByRole('textbox', { name: 'username' }).fill('23210720184');
  await page.getByRole('textbox', { name: 'username' }).press('Tab');
  await page.getByRole('textbox', { name: 'username' }).click();
  await page.locator('#login-password').fill('Ybz88280889');
  await page.locator('#login-password').press('Enter');
  await page.getByLabel('1 /').getByText('查看专题').click();
  await page.getByText('网球', { exact: true }).click();
  const page1Promise = page.waitForEvent('popup');
  await page.getByText('去预约').nth(3).click();
  const page1 = await page1Promise;
  await page1.getByRole('button', { name: '确定' }).click();
});