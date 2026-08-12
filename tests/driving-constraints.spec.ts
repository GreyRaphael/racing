import { expect, test } from '@playwright/test';
import { debugAdvance, debugState, startMode } from './helpers';

test('倒计时后 W 可加速，Space 可观测漂移', async ({ page }) => {
  await startMode(page);
  await debugAdvance(page, 4);
  await page.keyboard.down('w');
  await debugAdvance(page, 1.2);
  const moving = await debugState(page);
  expect((moving.player as { speed: number }).speed).toBeGreaterThan(0);
  await page.keyboard.down('a');
  await page.keyboard.down(' ');
  await debugAdvance(page, 0.5);
  const drifting = await debugState(page);
  expect((drifting.player as { isDrifting: boolean }).isDrifting).toBe(true);
  await page.keyboard.up('w');
  await page.keyboard.up('a');
  await page.keyboard.up(' ');
});

test('越过护栏会被修正，R 回到最近赛道位置', async ({ page }) => {
  await startMode(page);
  await debugAdvance(page, 4);
  const outside = await page.evaluate(() => window.__gameDebug?.setPlayerLateral(12));
  expect(outside).toBeTruthy();
  await debugAdvance(page, 0.2);
  const constrained = await debugState(page);
  expect(Math.abs((constrained.player as { lateralOffset: number }).lateralOffset)).toBeLessThan(7.3);
  await page.keyboard.press('r');
  await debugAdvance(page, 0.1);
  const reset = await debugState(page);
  expect(Math.abs((reset.player as { lateralOffset: number }).lateralOffset)).toBeLessThan(0.5);
});
