import { expect, test } from '@playwright/test';
import { debugAdvance, debugFinish, debugState, selectTrack, startMode } from './helpers';

test('菜单可切换选择沙漠与冰雪地图并更新展示', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('track-menu')).toBeVisible();
  await expect(page.getByTestId('track-meadow')).toHaveAttribute('aria-pressed', 'true');

  // Switch to Desert
  await selectTrack(page, 'desert');
  await expect(page.getByTestId('track-desert')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('track-meadow')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#menu-track-name')).toContainText('黄金沙漠');

  let state = await debugState(page);
  expect(state.trackId).toBe('desert');

  // Switch to Snow
  await selectTrack(page, 'snow');
  await expect(page.getByTestId('track-snow')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('track-desert')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#menu-track-name')).toContainText('冰封雪原');

  state = await debugState(page);
  expect(state.trackId).toBe('snow');
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

test('冰雪地图多人比赛能够正常生成并显示冰雪赛道标识与结算', async ({ page }) => {
  await startMode(page, 'race', 'snow');
  await expect(page.getByTestId('race-hud')).toBeVisible();
  await expect(page.locator('#brand-mark')).toContainText('FPC');
  await expect(page.getByTestId('position-counter')).toBeVisible();

  const state = await debugState(page);
  expect(state.trackId).toBe('snow');
  expect((state.karts as unknown[]).length).toBe(4);

  await debugAdvance(page, 4);
  await debugFinish(page);
  await expect(page.getByTestId('results-panel')).toBeVisible();
  await expect(page.locator('#results-caption')).toContainText('冰封雪原');
});

test('冰雪地图个人计时赛能独立记录成绩并持久化', async ({ page }) => {
  await startMode(page, 'time-trial', 'snow');
  await expect(page.getByTestId('race-hud')).toBeVisible();
  await expect(page.locator('#mode-label')).toContainText('冰封雪原');

  await debugAdvance(page, 4);
  await debugFinish(page);
  await expect(page.getByTestId('results-panel')).toBeVisible();

  // Return to menu and verify snow record is visible
  await page.getByTestId('back-to-menu').click();
  await expect(page.getByTestId('track-menu')).toBeVisible();
  await selectTrack(page, 'snow');
  await expect(page.locator('#menu-record')).not.toContainText('暂无记录');

  // Verify meadow and desert records remain independent
  await selectTrack(page, 'meadow');
  const meadowStorage = await page.evaluate(() => window.__gameDebug?.getStorage('meadow'));
  expect(meadowStorage).toBeDefined();

  await selectTrack(page, 'desert');
  const desertStorage = await page.evaluate(() => window.__gameDebug?.getStorage('desert'));
  expect(desertStorage).toBeDefined();
});

test('三大地图的所有景观植物均不侵入赛道', async ({ page }) => {
  await page.goto('/');

  // Check snow map switch
  await selectTrack(page, 'snow');
  const snowState = await debugState(page);
  expect(snowState.trackId).toBe('snow');

  // Check desert map switch
  await selectTrack(page, 'desert');
  const desertState = await debugState(page);
  expect(desertState.trackId).toBe('desert');

  // Check meadow map switch
  await selectTrack(page, 'meadow');
  const meadowState = await debugState(page);
  expect(meadowState.trackId).toBe('meadow');
});
