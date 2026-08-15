import { Page } from '@playwright/test';

export async function startMode(
  page: Page,
  mode: 'time-trial' | 'race' = 'time-trial',
  track: 'meadow' | 'desert' | 'snow' = 'meadow',
): Promise<void> {
  await page.goto('/');
  if (track === 'snow') await page.getByTestId('track-snow').click();
  else if (track === 'desert') await page.getByTestId('track-desert').click();
  else await page.getByTestId('track-meadow').click();
  if (mode === 'race') await page.getByTestId('race-mode').click();
  await page.getByTestId('start-race').click();
}

export async function selectTrack(page: Page, track: 'meadow' | 'desert' | 'snow'): Promise<void> {
  if (track === 'snow') await page.getByTestId('track-snow').click();
  else if (track === 'desert') await page.getByTestId('track-desert').click();
  else await page.getByTestId('track-meadow').click();
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
