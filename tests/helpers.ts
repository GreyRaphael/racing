import { Page } from '@playwright/test';

export type TrackName = 'meadow' | 'desert' | 'snow' | 'atoll' | 'autumn' | 'lava' | 'sakura' | 'citadel' | 'crystal';

export async function startMode(
  page: Page,
  mode: 'time-trial' | 'race' = 'time-trial',
  track: TrackName = 'meadow',
): Promise<void> {
  await page.goto('/');
  await page.getByTestId(`track-${track}`).click();
  if (mode === 'race') await page.getByTestId('race-mode').click();
  await page.getByTestId('start-race').click();
}

export async function selectTrack(page: Page, track: TrackName): Promise<void> {
  await page.getByTestId(`track-${track}`).click();
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
