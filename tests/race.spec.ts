import { expect, test } from '@playwright/test';
import { debugFinish, startMode } from './helpers';

test('多人比赛生成 AI、显示排名并结算', async ({ page }) => {
  await startMode(page, 'race');
  await expect(page.getByTestId('position-counter')).toBeVisible();
  const state = await page.evaluate(() => window.__gameDebug?.getState());
  expect((state?.karts as unknown[]).length).toBe(4);
  await debugFinish(page);
  await expect(page.getByTestId('results-panel')).toBeVisible();
  await expect(page.getByTestId('results-panel')).toContainText('你');
});

test('可以从结算页重新开始或返回菜单', async ({ page }) => {
  await startMode(page, 'race');
  await debugFinish(page);
  await page.getByTestId('restart-race').click();
  await expect(page.getByTestId('race-hud')).toBeVisible();
  await expect(page.getByTestId('countdown')).toBeVisible();
  await page.evaluate(() => window.__gameDebug?.finishRace());
  await page.getByTestId('back-to-menu').click();
  await expect(page.getByTestId('mode-menu')).toBeVisible();
});
