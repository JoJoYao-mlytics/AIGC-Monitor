import { test } from '@playwright/test';
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

const config = SITE_CONFIGS.find((c) => c.name === 'ucar-news')!;

test.describe(`${config.displayName} AIGC verification`, () => {
  test('End-to-end flow: Article -> Widget -> Answer', async ({ context, page }, testInfo) => {
    const records = attachNetworkMonitor(context, /mlytics\.com|aigc/);
    await navigateToArticle(page, config);
    const { answerPage } = await findAndClickAigcQuestion(page, context, config);
    const target = getAnswerFrame(answerPage, config) ?? answerPage;
    await waitForAnswerReady(target, config);
    await assertAnswerSections(target, config);
    for (const pattern of config.apiUrlPatterns) assertApiStatus(records, pattern);
    await attachNetworkLog(records, testInfo);
  });
});
