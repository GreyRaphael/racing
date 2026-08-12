import { expect, test } from '@playwright/test';
import { debugAdvance, debugFinish, debugState, startMode } from './helpers';

test('计时赛倒计时、结算与持久化', async ({ page }) => {
  await startMode(page);
  await expect(page.getByTestId('race-hud')).toBeVisible();
  await expect(page.getByTestId('countdown')).toBeVisible();
  const before = await debugState(page);
  expect((before.karts as unknown[]).length).toBe(1);
  await page.keyboard.down('w');
  await debugAdvance(page, 1);
  const locked = await debugState(page);
  expect((locked.player as { speed: number }).speed).toBe(0);
  await debugAdvance(page, 3);
  const after = await debugState(page);
  expect(after.phase).toBe('racing');
  await page.keyboard.up('w');
  await debugFinish(page);
  await expect(page.getByTestId('results-panel')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('sunny-kart-time-trial-v1'))).not.toBeNull();
  expect(before.phase).toBe('countdown');
});

test('刷新后菜单显示最佳记录', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('sunny-kart-time-trial-v1', JSON.stringify({ bestTotalTime: 12.345, bestLapTime: 3.21, lastTotalTime: 12.345, lastLapTimes: [3.21] })));
  await page.reload();
  await expect(page.locator('#menu-record')).toContainText('00:12.345');
});
