import { expect } from '@playwright/test';
import type { Page, BrowserContext, FrameLocator } from '@playwright/test';
import type { SiteConfig } from './site-configs';

export async function navigateToArticle(page: Page, config: SiteConfig): Promise<string> {
  await page.goto(config.articleListUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const articleLink = page.locator(config.articleLinkPattern).first();
  await expect(articleLink).toBeVisible({ timeout: 15_000 });
  await articleLink.click();
  await page.waitForLoadState('domcontentloaded');
  return page.title();
}

export async function findAndClickAigcQuestion(
  page: Page,
  context: BrowserContext,
  config: SiteConfig
): Promise<{ answerPage: Page; questionText: string }> {
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 1500);
  }
  await expect(page.getByText(config.widgetHeadingText).first()).toBeVisible({ timeout: 15_000 });

  const questionLinks = page.locator(config.questionLinkPattern);
  await expect(questionLinks.first()).toBeVisible({ timeout: 10_000 });
  const count = await questionLinks.count();
  expect(count).toBeGreaterThan(0);

  const questionText = (await questionLinks.first().textContent()) ?? '';
  const [answerPage] = await Promise.all([
    context.waitForEvent('page'),
    questionLinks.first().click(),
  ]);
  await answerPage.waitForLoadState('domcontentloaded');

  return { answerPage, questionText };
}

export async function waitForAnswerReady(
  target: Page | FrameLocator,
  config: SiteConfig
): Promise<void> {
  if (config.loadingIndicatorSelector) {
    await expect(target.locator(config.loadingIndicatorSelector)).toBeHidden({ timeout: 30_000 });
  } else {
    if ('waitForLoadState' in target) {
      await (target as Page).waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {
        // soft timeout：網路未必完全空閒，繼續執行
      });
    }
  }
}

export async function assertAnswerSections(
  target: Page | FrameLocator,
  config: SiteConfig
): Promise<void> {
  const answerContent = target.locator(config.answerContentSelector).first();
  await answerContent.scrollIntoViewIfNeeded();
  await expect(answerContent).toBeVisible({ timeout: 10_000 });

  const dataSource = target.locator(config.dataSourceSelector).first();
  await dataSource.scrollIntoViewIfNeeded();
  await expect(dataSource).toBeVisible({ timeout: 10_000 });

  const relatedQuestions = target.locator(config.relatedQuestionsSelector).first();
  await relatedQuestions.scrollIntoViewIfNeeded();
  await expect(relatedQuestions).toBeVisible({ timeout: 10_000 });
}

export function getAnswerFrame(answerPage: Page, config: SiteConfig): FrameLocator | null {
  if (!config.usesIframe || !config.iframePattern) return null;
  return answerPage.frameLocator(config.iframePattern);
}
