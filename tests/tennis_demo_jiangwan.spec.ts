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

  await page1.waitForSelector('div.week_calendar');
  const weekCalendarDates = page1.locator('div.week_calendar > dl');
  const dateCount = await weekCalendarDates.count();

  console.log(`week_calendar dl 总数: ${dateCount}`);

  const startIndex = Math.min(3, dateCount - 1);
  let booked = false;

  for (let dlIndex = startIndex; dlIndex >= 1; dlIndex--) {
    const dateLocator = weekCalendarDates.nth(dlIndex);
    console.log(`候选日期元素: dl:nth-child(${dlIndex + 1})`);

    const availableSlots = dateLocator.locator('dd.green.pointer.can_active.resource_item_info');
    const slotCount = await availableSlots.count();
    console.log(
      `  该日期可预约元素数量(slotCount): ${slotCount}, availableSlots 类型: ${availableSlots}`,
    );

    if (slotCount === 0) continue;

    const firstSlot = availableSlots.first(); //选择第一个可预约时间段
    const firstSlotText = await firstSlot.textContent();
    console.log(
      `准备点击: 日期 dl:nth-child(${dlIndex + 1}), 第1个可预约时段, 文本内容: ${firstSlotText}`,
    );

    await firstSlot.click();
    // await page1.waitForTimeout(5000);
    await page1.getByRole('button', { name: '确认预约' }).click();
    console.log('已点击确认预约按钮');
    booked = true;
    break;
  }
});
