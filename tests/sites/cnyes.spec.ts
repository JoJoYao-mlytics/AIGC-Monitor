import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('cnyes.com AIGC verification', () => {
  test('End-to-end flow with network capture', async ({ context, page }, testInfo) => {
    const networkLogs: Array<{ method: string; url: string; status?: number }> = [];

    context.on('requestfinished', async (req) => {
      const url = req.url();
      if (url.includes('mlytics.com') || url.includes('aigc')) {
        try {
          const res = await req.response();
          networkLogs.push({ method: req.method(), url, status: res?.status() });
        } catch {
          networkLogs.push({ method: req.method(), url });
        }
      }
    });

    // 1) Open homepage
    await page.goto('https://www.cnyes.com/', { waitUntil: 'domcontentloaded' });
    await testInfo.attach('home.png', { body: await page.screenshot(), contentType: 'image/png' });

    // Utility: try close common popups
    async function tryCloseOverlays() {
      const candidates = [
        page.getByRole('button', { name: /close/i }).first(),
        page.locator('button[aria-label="close"], button[aria-label="Close"]').first(),
        page.locator('svg[aria-label*="close" i]').first(),
        page.locator('img[src*="modal-icon-close" i]').first(),
        page.getByRole('button', { name: /關閉|關閉視窗/ }).first(),
        page.getByRole('button', { name: '×' }).first(),
      ];
      for (const loc of candidates) {
        try {
          if (await loc.isVisible({ timeout: 500 })) {
            await loc.click({ timeout: 1000 });
          }
        } catch {}
      }
    }

    await tryCloseOverlays();

    // 2) Locate headline (頭條) section or navigate to its listing as fallback
    let navigatedToHeadline = false;
    try {
      const headlineNav = page.getByRole('link', { name: /頭條/ }).first();
      if (await headlineNav.isVisible({ timeout: 2000 })) {
        await headlineNav.click();
        navigatedToHeadline = true;
      }
    } catch {}
    if (!navigatedToHeadline) {
      try {
        const headlineSection = page.locator('section:has-text("頭條")');
        if (!(await headlineSection.count())) throw new Error('fallback');
      } catch {
        await page.goto('https://news.cnyes.com/news/cat/headline', { waitUntil: 'domcontentloaded' });
      }
    }

    // 3) Click any article in headline and record link text/href
    const candidateLink = page.locator('a[href^="/news/id/"]');
    const candidateAbs = page.locator('a[href^="https://news.cnyes.com/news/id/"]');
    const articleLink = (await candidateLink.count()) ? candidateLink.first() : candidateAbs.first();
    const linkText = (await articleLink.innerText({ timeout: 10_000 })).trim().replace(/[+＋]\s*$/, '').trim();
    const linkHref = await articleLink.getAttribute('href');
    expect(linkHref).toBeTruthy();
    await articleLink.click();
    await testInfo.attach('clicked-article.png', { body: await page.screenshot(), contentType: 'image/png' });

    // 4) Verify article page title matches clicked link (via H1)
    const h1 = page.getByRole('heading', { level: 1 }).first();
    await expect(h1).toBeVisible();
    const articleTitle = (await h1.innerText()).trim();
    expect(articleTitle).toContain(linkText);
    await testInfo.attach('article-page.png', { body: await page.screenshot(), contentType: 'image/png' });

    // 5) Confirm AI section exists and click first link (opens new tab)
    // Scroll to trigger lazy-loading near the bottom of the article
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(300);
    }

    const aiTextRe = /AI來回答/;
    let linkNearAi = page.locator('a[href*="/news/aigc/answer"], a[href*="aigc.cnyes.com/answer"]').first();

    if (!(await linkNearAi.count())) {
      // Fallback: find container by text then find a link within/near it
      const aiTextNode = page.getByText(aiTextRe).first();
      await aiTextNode.waitFor({ state: 'visible', timeout: 10_000 });
      const candidateIn = aiTextNode.locator('a').first();
      linkNearAi = (await candidateIn.count()) ? candidateIn : aiTextNode.locator('..').locator('a').first();
    }

    await tryCloseOverlays();

    const aiLinkTextResolved = async () => {
      try {
        return (await linkNearAi.innerText({ timeout: 3000 })).trim().replace(/[+＋]\s*$/, '').trim();
      } catch {
        return '';
      }
    };
    const aiLinkText = await aiLinkTextResolved();

    const newPagePromise = context.waitForEvent('page');
    await linkNearAi.click({ timeout: 10_000 });
    const answerPage = await newPagePromise;
    await answerPage.waitForLoadState('domcontentloaded');
    await testInfo.attach('answer-opened.png', { body: await answerPage.screenshot(), contentType: 'image/png' });

    // 6) Verify new tab loaded expected AIGC answer URL and content
    await answerPage.waitForLoadState('domcontentloaded');
    for (let i = 0; i < 6; i++) {
      await answerPage.mouse.wheel(0, 1600);
      await answerPage.waitForTimeout(250);
    }
    const answerURL = answerPage.url();
    expect(/news\.cnyes\.com\/news\/aigc\/answer|aigc\.cnyes\.com\/answer/.test(answerURL)).toBeTruthy();
    // Optionally capture title/heading for debugging (no hard assertion due to content variations)
    const answerTitle = await answerPage.title();
    const answerHeading = answerPage.getByRole('heading').first();
    const answerHeadingText = (await answerHeading.innerText().catch(() => Promise.resolve(''))).trim();

    // 7) Confirm presence of 資料來源 and 想知道更多? AI來回答
    // Try to find sections on main page first
    let dsFound = (await answerPage.getByText('資料來源').count()) > 0;
    let aiMoreFound = (await answerPage.getByText(/想知道更多|AI來回答/).count()) > 0;

    // If not found, probe likely iframe(s) hosting AIGC content
    if (!dsFound || !aiMoreFound) {
      const frames = answerPage.frames();
      for (const fr of frames) {
        const u = fr.url();
        if (/aigc\.cnyes\.com\/answer|news\.cnyes\.com\/news\/aigc\/answer/.test(u)) {
          if (!dsFound) dsFound = (await fr.getByText('資料來源').count()) > 0;
          if (!aiMoreFound) aiMoreFound = (await fr.getByText(/想知道更多|AI來回答/).count()) > 0;
          if (dsFound && aiMoreFound) break;
        }
      }
    }

    expect.soft(dsFound).toBeTruthy();
    expect.soft(aiMoreFound).toBeTruthy();
    // Basic content presence
    expect(await answerPage.locator('p, li').count()).toBeGreaterThan(3);
    await testInfo.attach('answer-validated.png', { body: await answerPage.screenshot(), contentType: 'image/png' });

    // Save filtered network logs
    const outPath = testInfo.outputPath('network-aigc.json');
    fs.writeFileSync(outPath, JSON.stringify(networkLogs, null, 2), 'utf-8');
    await testInfo.attach('network-aigc.json', { path: outPath, contentType: 'application/json' });
  });
});


