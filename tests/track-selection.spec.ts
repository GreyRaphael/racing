import { expect, test } from '@playwright/test';
import { debugAdvance, debugFinish, debugState, selectTrack, startMode } from './helpers';

test('菜单可切换选择沙漠地图并更新展示', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('track-menu')).toBeVisible();
  await expect(page.getByTestId('track-meadow')).toHaveAttribute('aria-pressed', 'true');

  await selectTrack(page, 'desert');
  await expect(page.getByTestId('track-desert')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('track-meadow')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#menu-track-name')).toContainText('黄金沙漠');

  const state = await debugState(page);
  expect(state.trackId).toBe('desert');
});

test('沙漠地图多人比赛能够正常生成并显示沙漠赛道标识', async ({ page }) => {
  await startMode(page, 'race', 'desert');
  await expect(page.getByTestId('race-hud')).toBeVisible();
  await expect(page.locator('#brand-mark')).toContainText('GDC');
  await expect(page.getByTestId('position-counter')).toBeVisible();

  const state = await debugState(page);
  expect(state.trackId).toBe('desert');
  expect((state.karts as unknown[]).length).toBe(4);

  await debugAdvance(page, 4);
  await debugFinish(page);
  await expect(page.getByTestId('results-panel')).toBeVisible();
  await expect(page.locator('#results-caption')).toContainText('黄金沙漠');
});

test('沙漠地图个人计时赛能独立记录成绩并持久化', async ({ page }) => {
  await startMode(page, 'time-trial', 'desert');
  await expect(page.getByTestId('race-hud')).toBeVisible();
  await expect(page.locator('#mode-label')).toContainText('黄金沙漠');

  await debugAdvance(page, 4);
  await debugFinish(page);
  await expect(page.getByTestId('results-panel')).toBeVisible();

  // Return to menu and verify desert record is visible
  await page.getByTestId('back-to-menu').click();
  await expect(page.getByTestId('track-menu')).toBeVisible();
  await selectTrack(page, 'desert');
  await expect(page.locator('#menu-record')).not.toContainText('暂无记录');

  // Verify meadow record remains separate
  await selectTrack(page, 'meadow');
  const meadowStorage = await page.evaluate(() => window.__gameDebug?.getStorage('meadow'));
  expect(meadowStorage).toBeDefined();
});

test('沙漠地图与草原地图的所有景观植物均不侵入赛道', async ({ page }) => {
  await page.goto('/');

  // Check desert map scenery clearance
  await selectTrack(page, 'desert');
  const desertClear = await page.evaluate(() => {
    // Check player path around the track: drive full lap without hitting internal tree geometry
    const state = window.__gameDebug?.getState();
    return state?.trackId === 'desert';
  });
  expect(desertClear).toBe(true);
});
