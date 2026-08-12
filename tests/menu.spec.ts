import { expect, test } from '@playwright/test';

test('菜单加载并可选择比赛模式', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('mode-menu')).toBeVisible();
  await expect(page.getByTestId('time-trial-mode')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('race-mode').click();
  await expect(page.getByTestId('race-mode')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('start-race')).toContainText('多人比赛');
});
