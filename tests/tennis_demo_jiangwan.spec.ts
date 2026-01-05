import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
// 调用方式
//DAY_INDEX=0 SLOT_MODE=first npx playwright test tests/tennis_demo_jiangwan.spec.ts
//DAY_INDEX=1 SLOT_MODE=medium npx playwright test tests/tennis_demo_jiangwan.spec.ts
//DAY_INDEX=2 SLOT_MODE=back npx playwright test tests/tennis_demo_jiangwan.spec.ts
type SlotMode = 'first' | 'medium' | 'back';

async function selectAndConfirmSlot(page1: Page, dayIndex: number, mode: SlotMode) {
  await page1.waitForSelector('div.week_calendar');
  const weekCalendarDates = page1.locator('div.week_calendar > dl');
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
  // 点击前：确保真正可见、可点击
  await expect(slot).toBeVisible({ timeout: 2000 });
  await expect(slot).toBeEnabled({ timeout: 2000 });
  // 如果有滚动条，必要时再加这一句
  await slot.scrollIntoViewIfNeeded();
  // 真正点击
  await slot.click();
  // 等它变成“选中态”（只等 1 秒）
  await expect(slot).toHaveClass(/active/, { timeout: 1000 });
  // 让按钮变成选中态再来点
  const confirmButton = page1.getByRole('button', { name: '确认预约' });
  await expect(confirmButton).toBeEnabled({ timeout: 2000 });
  await confirmButton.click();  console.log('已点击确认预约按钮');
    return true;
  }
  
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
  const dayIndexEnv = process.env.DAY_INDEX;
  const slotModeEnv = process.env.SLOT_MODE as SlotMode | undefined;

  const dayIndex = dayIndexEnv ? Number(dayIndexEnv) : 2;
  const slotMode: SlotMode = slotModeEnv ?? 'first';

  await selectAndConfirmSlot(page1, dayIndex, slotMode);
});
