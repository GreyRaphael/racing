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

test('幽灵车：首次完赛生成幽灵轨迹并在下次挑战中回放', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByTestId('track-meadow').click();
  await page.getByTestId('start-race').click();
  await expect(page.getByTestId('race-hud')).toBeVisible();

  // Advance into racing and drive
  await debugAdvance(page, 3.1);
  await page.keyboard.down('w');
  await debugAdvance(page, 1);
  await page.keyboard.up('w');

  // Finish race
  await debugFinish(page);
  await expect(page.getByTestId('results-panel')).toBeVisible();

  // Verify ghost data in storage
  const ghostRaw = await page.evaluate(() => localStorage.getItem('sunny_kart_ghost_v1_meadow'));
  expect(ghostRaw).not.toBeNull();
  const ghostObj = JSON.parse(ghostRaw!);
  expect(ghostObj.frames.length).toBeGreaterThan(0);
  expect(ghostObj.trackId).toBe('meadow');

  // Return to menu
  await page.getByTestId('back-to-menu').click();
  await expect(page.getByTestId('menu-ghost-status')).toContainText('已记录');

  // Start new time trial
  await page.getByTestId('start-race').click();
  await expect(page.getByTestId('race-hud')).toBeVisible();
  await expect(page.getByTestId('ghost-delta-card')).toBeVisible();

  // Advance time and check ghost replay is active
  await debugAdvance(page, 3.1);
  const state = await debugState(page);
  const ghost = state.ghost as { enabled: boolean; hasActiveGhost: boolean; ghostKart: { visible: boolean } };
  expect(ghost.enabled).toBe(true);
  expect(ghost.hasActiveGhost).toBe(true);
  expect(ghost.ghostKart.visible).toBe(true);
});

test('幽灵车：HUD 时间差卡片与进度标记正常工作', async ({ page }) => {
  await page.goto('/');
  // Seed a ghost record
  await page.evaluate(() => {
    const frames = [
      { t: 0, x: 0, y: 0.23, z: 0, pitch: 0, yaw: 0, steer: 0, drift: false, progress: 0 },
      { t: 5, x: 10, y: 0.23, z: 20, pitch: 0, yaw: 0, steer: 0, drift: false, progress: 1 },
      { t: 10, x: 20, y: 0.23, z: 40, pitch: 0, yaw: 0, steer: 0, drift: false, progress: 2 },
      { t: 15, x: 30, y: 0.23, z: 60, pitch: 0, yaw: 0, steer: 0, drift: false, progress: 3 },
    ];
    localStorage.setItem('sunny_kart_ghost_v1_meadow', JSON.stringify({
      trackId: 'meadow',
      totalTime: 15,
      bestLapTime: 5,
      lapTimes: [5, 5, 5],
      recordedAt: Date.now(),
      frames,
    }));
  });

  await startMode(page, 'time-trial', 'meadow');
  await expect(page.getByTestId('ghost-delta-card')).toBeVisible();
  await expect(page.getByTestId('ghost-progress-marker')).toBeVisible();

  await debugAdvance(page, 3.1); // after countdown
  // Check delta display
  const deltaText = await page.getByTestId('ghost-delta').textContent();
  expect(deltaText).not.toBe('');
});

test('幽灵车：菜单支持开启/关闭切换及多赛道独立存储', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('sunny_kart_ghost_v1_desert', JSON.stringify({
      trackId: 'desert',
      totalTime: 25.5,
      bestLapTime: 8.5,
      lapTimes: [8.5, 8.5, 8.5],
      recordedAt: Date.now(),
      frames: [{ t: 0, x: 0, y: 0, z: 0, pitch: 0, yaw: 0, steer: 0, drift: false, progress: 0 }],
    }));
  });
  await page.reload();

  // Check meadow has no record initially
  await expect(page.getByTestId('menu-ghost-status')).toContainText('暂无记录');

  // Switch to desert
  await page.getByTestId('track-desert').click();
  await expect(page.getByTestId('menu-ghost-status')).toContainText('00:25.500');

  // Toggle ghost switch
  const toggleBtn = page.getByTestId('ghost-toggle-button');
  await expect(toggleBtn).toContainText('已开启');
  await toggleBtn.click();
  await expect(toggleBtn).toContainText('已关闭');

  // Switch back to meadow
  await page.getByTestId('track-meadow').click();
  await expect(page.getByTestId('menu-ghost-status')).toContainText('暂无记录');
});

test('幽灵车：战胜幽灵车后结算面板展示战胜提示并更新数据', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('sunny_kart_ghost_v1_meadow', JSON.stringify({
      trackId: 'meadow',
      totalTime: 99.0,
      bestLapTime: 33.0,
      lapTimes: [33, 33, 33],
      recordedAt: Date.now(),
      frames: [
        { t: 0, x: 0, y: 0.23, z: 0, pitch: 0, yaw: 0, steer: 0, drift: false, progress: 0 },
        { t: 99, x: 0, y: 0.23, z: 0, pitch: 0, yaw: 0, steer: 0, drift: false, progress: 3 },
      ],
    }));
  });

  await startMode(page, 'time-trial', 'meadow');
  await debugAdvance(page, 0.5);
  // Complete race
  await debugFinish(page);

  await expect(page.getByTestId('results-panel')).toBeVisible();
  await expect(page.getByTestId('ghost-result-badge')).toBeVisible();
  await expect(page.getByTestId('ghost-result-title')).toContainText('战胜幽灵车');
});
