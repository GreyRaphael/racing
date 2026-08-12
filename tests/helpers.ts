import { Page } from '@playwright/test';

export async function startMode(page: Page, mode: 'time-trial' | 'race' = 'time-trial'): Promise<void> {
  await page.goto('/');
  if (mode === 'race') await page.getByTestId('race-mode').click();
  await page.getByTestId('start-race').click();
}

export async function debugState(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => window.__gameDebug?.getState() ?? {});
}

export async function debugAdvance(page: Page, seconds: number): Promise<void> {
  await page.evaluate((value) => window.__gameDebug?.advance(value), seconds);
}

export async function debugFinish(page: Page): Promise<void> {
  await page.evaluate(() => window.__gameDebug?.finishRace());
}
