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
  expect(Math.abs((drifting.player as { lateralVelocity: number }).lateralVelocity)).toBeGreaterThan(0);
  await page.keyboard.up('w');
  await page.keyboard.up('a');
  await page.keyboard.up(' ');
});

test('D 右转、A 左转', async ({ page }) => {
  await startMode(page);
  await debugAdvance(page, 4);
  const initial = await debugState(page);
  const initialYaw = (initial.player as { yaw: number }).yaw;

  await page.keyboard.down('d');
  await debugAdvance(page, 0.25);
  const afterRight = await debugState(page);
  await page.keyboard.up('d');
  expect((afterRight.player as { yaw: number }).yaw).toBeLessThan(initialYaw);

  await page.keyboard.down('a');
  await debugAdvance(page, 0.25);
  const afterLeft = await debugState(page);
  await page.keyboard.up('a');
  expect((afterLeft.player as { yaw: number }).yaw).toBeGreaterThan((afterRight.player as { yaw: number }).yaw);
});

test('草地不额外降低速度', async ({ page }) => {
  await startMode(page);
  await debugAdvance(page, 4);
  await page.evaluate(() => window.__gameDebug?.setPlayerLateral(5.75));
  const grassStart = await debugState(page);
  expect((grassStart.player as { isOffRoad: boolean }).isOffRoad).toBe(true);
  await page.keyboard.down('w');
  await debugAdvance(page, 1);
  const grass = await debugState(page);
  await page.keyboard.up('w');
  expect((grass.player as { speed: number }).speed).toBeGreaterThan(11);
});

test('越过护栏会被修正，R 回到最近赛道位置', async ({ page }) => {
  await startMode(page);
  await debugAdvance(page, 4);
  const outside = await page.evaluate(() => window.__gameDebug?.setPlayerLateral(12));
  expect(outside).toBeTruthy();
  await debugAdvance(page, 0.2);
  const constrained = await debugState(page);
  expect(Math.abs((constrained.player as { lateralOffset: number }).lateralOffset)).toBeLessThan(6.5);
  await page.keyboard.press('r');
  await debugAdvance(page, 0.1);
  const reset = await debugState(page);
  expect(Math.abs((reset.player as { lateralOffset: number }).lateralOffset)).toBeLessThan(0.5);
});
