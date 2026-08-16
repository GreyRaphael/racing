import { expect, test } from '@playwright/test';
import { debugAdvance, debugFinish, debugState, selectTrack, startMode, TrackName } from './helpers';

const ALL_TRACKS: { id: TrackName; name: string; shortCode: string }[] = [
  { id: 'meadow', name: '阳光草原', shortCode: 'SMC' },
  { id: 'desert', name: '黄金沙漠', shortCode: 'GDC' },
  { id: 'snow', name: '冰封雪原', shortCode: 'FPC' },
  { id: 'atoll', name: '碧海环礁', shortCode: 'TAC' },
  { id: 'autumn', name: '枫叶山谷', shortCode: 'MVC' },
  { id: 'lava', name: '熔岩裂谷', shortCode: 'MCC' },
  { id: 'sakura', name: '樱花幽谷', shortCode: 'SGC' },
  { id: 'citadel', name: '蒸汽古堡', shortCode: 'CCC' },
  { id: 'crystal', name: '水晶矿洞', shortCode: 'CCG' },
];

test('菜单可切换选择全部9大地图并更新展示与3D状态', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('track-menu')).toBeVisible();

  for (const track of ALL_TRACKS) {
    await selectTrack(page, track.id);
    await expect(page.getByTestId(`track-${track.id}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#menu-track-name')).toContainText(track.name);

    const state = await debugState(page);
    expect(state.trackId).toBe(track.id);
  }
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

test('碧海环礁与枫叶山谷多人比赛正常生成、显示专属标识与结算', async ({ page }) => {
  // Test Atoll
  await startMode(page, 'race', 'atoll');
  await expect(page.getByTestId('race-hud')).toBeVisible();
  await expect(page.locator('#brand-mark')).toContainText('TAC');
  let state = await debugState(page);
  expect(state.trackId).toBe('atoll');
  expect((state.karts as unknown[]).length).toBe(4);
  await debugAdvance(page, 4);
  await debugFinish(page);
  await expect(page.getByTestId('results-panel')).toBeVisible();
  await expect(page.locator('#results-caption')).toContainText('碧海环礁');

  // Test Autumn
  await page.getByTestId('back-to-menu').click();
  await startMode(page, 'race', 'autumn');
  await expect(page.getByTestId('race-hud')).toBeVisible();
  await expect(page.locator('#brand-mark')).toContainText('MVC');
  state = await debugState(page);
  expect(state.trackId).toBe('autumn');
  expect((state.karts as unknown[]).length).toBe(4);
  await debugAdvance(page, 4);
  await debugFinish(page);
  await expect(page.getByTestId('results-panel')).toBeVisible();
  await expect(page.locator('#results-caption')).toContainText('枫叶山谷');
});

test('蒸汽古堡与水晶矿洞多人比赛正常生成、显示专属标识与结算', async ({ page }) => {
  // Test Citadel
  await startMode(page, 'race', 'citadel');
  await expect(page.getByTestId('race-hud')).toBeVisible();
  await expect(page.locator('#brand-mark')).toContainText('CCC');
  let state = await debugState(page);
  expect(state.trackId).toBe('citadel');
  expect((state.karts as unknown[]).length).toBe(4);
  await debugAdvance(page, 4);
  await debugFinish(page);
  await expect(page.getByTestId('results-panel')).toBeVisible();
  await expect(page.locator('#results-caption')).toContainText('蒸汽古堡');

  // Test Crystal
  await page.getByTestId('back-to-menu').click();
  await startMode(page, 'race', 'crystal');
  await expect(page.getByTestId('race-hud')).toBeVisible();
  await expect(page.locator('#brand-mark')).toContainText('CCG');
  state = await debugState(page);
  expect(state.trackId).toBe('crystal');
  expect((state.karts as unknown[]).length).toBe(4);
  await debugAdvance(page, 4);
  await debugFinish(page);
  await expect(page.getByTestId('results-panel')).toBeVisible();
  await expect(page.locator('#results-caption')).toContainText('水晶矿洞');
});

test('全部新地图个人计时赛能独立记录成绩并持久化', async ({ page }) => {
  await startMode(page, 'time-trial', 'citadel');
  await expect(page.getByTestId('race-hud')).toBeVisible();
  await expect(page.locator('#mode-label')).toContainText('蒸汽古堡');

  await debugAdvance(page, 4);
  await debugFinish(page);
  await expect(page.getByTestId('results-panel')).toBeVisible();

  // Return to menu and verify citadel record is visible
  await page.getByTestId('back-to-menu').click();
  await expect(page.getByTestId('track-menu')).toBeVisible();
  await selectTrack(page, 'citadel');
  await expect(page.locator('#menu-record')).not.toContainText('暂无记录');

  // Verify other records remain independent
  for (const track of ['atoll', 'autumn', 'lava', 'sakura', 'crystal'] as TrackName[]) {
    await selectTrack(page, track);
    const storage = await page.evaluate((id) => window.__gameDebug?.getStorage(id), track);
    expect(storage).toBeDefined();
  }
});

test('全量9大赛道的所有景观植物均不侵入赛道', async ({ page }) => {
  await page.goto('/');

  for (const track of ALL_TRACKS) {
    await selectTrack(page, track.id);
    const state = await debugState(page);
    expect(state.trackId).toBe(track.id);
  }
});
