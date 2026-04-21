import { test, expect } from '@playwright/test';
import { SITE_CONFIGS } from '../helpers/site-configs';

for (const config of SITE_CONFIGS) {
  test(`[smoke] ${config.displayName} - widget visible`, async ({ page }) => {
    await page.goto(config.articleListUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const articleLink = page.locator(config.articleLinkPattern).first();
    await expect(articleLink).toBeVisible({ timeout: 10_000 });
    await articleLink.click();
    await page.waitForLoadState('domcontentloaded');
    for (let i = 0; i < 5; i++) await page.mouse.wheel(0, 1500);
    await expect(page.getByText(config.widgetHeadingText).first()).toBeVisible({ timeout: 15_000 });
  });
}
