import { test, expect } from '@playwright/test';
import { SITE_CONFIGS } from '../helpers/site-configs';
import {
  navigateToArticle,
  findAndClickAigcQuestion,
  waitForAnswerReady,
  assertAnswerSections,
  getAnswerFrame,
} from '../helpers/aigc-flow';
import {
  attachNetworkMonitor,
  assertApiStatus,
  attachNetworkLog,
} from '../helpers/network-monitor';

const config = SITE_CONFIGS.find((c) => c.name === 'gvm')!;

test.describe(`${config.displayName} AIGC verification`, () => {
  test('End-to-end flow: Article -> Widget -> Answer (iframe)', async ({ context, page }, testInfo) => {
    const records = attachNetworkMonitor(context, /mlytics\.com|aigc/);

    await navigateToArticle(page, config);
    const { answerPage } = await findAndClickAigcQuestion(page, context, config);

    await answerPage.waitForLoadState('domcontentloaded');
    const frame = getAnswerFrame(answerPage, config);
    if (!frame) throw new Error('GVM iframe not found — check iframePattern in site-configs.ts');

    await waitForAnswerReady(frame, config);
    await assertAnswerSections(frame, config);

    // GVM 額外驗證：「觀看原始文章」CTA
    await expect(answerPage.locator('a[href*="returnarticle"]').first()).toBeVisible({ timeout: 5_000 });

    for (const pattern of config.apiUrlPatterns) assertApiStatus(records, pattern);
    await attachNetworkLog(records, testInfo);
  });
});
