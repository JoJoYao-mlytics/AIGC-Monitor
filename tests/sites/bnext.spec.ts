import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('bnext.com.tw AIGC verification', () => {
  test('End-to-end flow: Article List -> Article -> AIGC -> Answer', async ({ context, page }, testInfo) => {
    const networkLogs: Array<{ method: string; url: string; status?: number; resourceType?: string }> = [];

    // 監控網路請求（mlytics.com 和 aigc 相關資源）
    context.on('requestfinished', async (req) => {
      const url = req.url();
      if (url.includes('mlytics.com') || url.includes('aigc')) {
        try {
          const res = await req.response();
          networkLogs.push({
            method: req.method(),
            url,
            status: res?.status(),
            resourceType: req.resourceType(),
          });
        } catch {
          networkLogs.push({ method: req.method(), url, resourceType: req.resourceType() });
        }
      }
    });

    // 步驟 1: 開啟文章列表頁
    console.log('📄 Step 1: Opening articles list page...');
    await page.goto('https://www.bnext.com.tw/articles', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000); // 等待頁面完全載入
    await testInfo.attach('01-articles-list.png', {
      body: await page.screenshot({ fullPage: false }),
      contentType: 'image/png',
    });

    // 工具函數：處理彈窗
    async function tryClosePopup() {
      try {
        const popup = await page.locator('#custom-popup > div.custom-popup_box').isVisible({ timeout: 1000 });
        if (popup) {
          await page.locator('#custom-popup button, #custom-popup .close, #custom-popup [class*="close"]').first().click({ timeout: 2000 });
          console.log('✅ Popup closed');
        }
      } catch {
        console.log('ℹ️  No popup detected or already closed');
      }
    }

    // 步驟 2: 檢查並關閉彈窗（如果有）
    await tryClosePopup();

    // 步驟 3: 點擊第一篇文章
    console.log('📰 Step 3: Clicking first article...');
    
    // 等待內容載入並滾動一下以確保所有元素都載入
    await page.waitForTimeout(2000);
    
    // 方法 1: 嘗試找到任何有實質內容的連結
    const articleLink = await page.locator('a').evaluateAll((links) => {
      for (const link of links) {
        const text = link.textContent?.trim() || '';
        const href = (link as HTMLAnchorElement).href;
        // 尋找有實質內容且 href 看起來像文章的連結
        if (text.length > 15 && href && 
            (href.includes('/articles/') || href.includes('/article/') || href.includes('bnext.com.tw'))) {
          return {
            text: text.substring(0, 100),
            href: href
          };
        }
      }
      return null;
    });

    let articleLinkText: string;
    let articleHref: string;

    if (articleLink) {
      articleLinkText = articleLink.text;
      articleHref = articleLink.href;
      console.log(`   Found article via method 1`);
    } else {
      // 方法 2: 直接找頁面上第一個看起來像文章標題的文字
      const firstArticle = await page.evaluate(() => {
        // 找所有可能的文章容器
        const containers = document.querySelectorAll('article, [class*="article"], [class*="card"], [class*="item"]');
        for (const container of containers) {
          const link = container.querySelector('a[href]') as HTMLAnchorElement;
          const text = container.textContent?.trim().substring(0, 100);
          if (link && text && text.length > 15) {
            return { href: link.href, text };
          }
        }
        return null;
      });
      
      if (!firstArticle) {
        throw new Error('無法找到文章連結');
      }
      
      articleLinkText = firstArticle.text;
      articleHref = firstArticle.href;
      console.log(`   Found article via method 2`);
    }

    console.log(`   Article title: "${articleLinkText}"`);
    console.log(`   Article href: ${articleHref}"`);
    
    // 導航到文章頁面
    await page.goto(articleHref);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await testInfo.attach('02-article-clicked.png', {
      body: await page.screenshot({ fullPage: false }),
      contentType: 'image/png',
    });

    // 步驟 4: 驗證文章頁面標題
    console.log('✅ Step 4: Verifying article page title...');
    const articleH1 = page.locator('h1').first();
    await expect(articleH1).toBeVisible({ timeout: 10_000 });
    const actualTitle = await articleH1.innerText();
    console.log(`   Page title: "${actualTitle}"`);

    // 彈性匹配：提取關鍵字進行驗證
    const extractKeywords = (text: string) => {
      return text
        .replace(/[！？，。、；：\s\|\-–—]/g, ' ')
        .split(' ')
        .filter((w) => w.length > 2)
        .slice(0, 5);
    };
    const linkKeywords = extractKeywords(articleLinkText || '');
    const titleKeywords = extractKeywords(actualTitle);
    const hasMatchingKeywords = linkKeywords.some((kw) => titleKeywords.includes(kw));
    expect(hasMatchingKeywords || actualTitle.includes(articleLinkText || '')).toBeTruthy();

    // 步驟 5: 再次檢查彈窗
    await tryClosePopup();

    // 步驟 6: 滾動頁面以載入 AIGC widget
    console.log('🔍 Step 6: Scrolling to load AIGC widget...');
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(400);
    }

    // 尋找『你想知道哪些？AI來解答』區塊
    console.log('🤖 Step 6.5: Looking for AIGC section...');
    const aigcHeading = page.getByRole('heading', { name: /你想知道哪些.*AI來解答/i });
    await expect(aigcHeading).toBeVisible({ timeout: 15_000 });
    await aigcHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await testInfo.attach('03-aigc-section-found.png', {
      body: await page.screenshot({ fullPage: false }),
      contentType: 'image/png',
    });

    // 步驟 7: 點擊 AIGC 問題連結（開啟新分頁）
    console.log('🔗 Step 7: Clicking AIGC question link...');
    const aigcQuestionLink = page.locator('a[href*="ai.bnext.com.tw/answer"]').first();
    await aigcQuestionLink.waitFor({ state: 'visible', timeout: 10_000 });

    const questionText = await aigcQuestionLink.innerText();
    console.log(`   Question: "${questionText}"`);

    const [answerPage] = await Promise.all([
      context.waitForEvent('page'),
      aigcQuestionLink.click(),
    ]);

    await answerPage.waitForLoadState('domcontentloaded');
    await answerPage.waitForTimeout(3000);
    await testInfo.attach('04-answer-page-opened.png', {
      body: await answerPage.screenshot({ fullPage: false }),
      contentType: 'image/png',
    });

    // 步驟 8: 驗證 Answer 頁面標題
    console.log('✅ Step 8: Verifying Answer page title...');
    const answerTitle = await answerPage.title();
    console.log(`   Answer page title: "${answerTitle}"`);

    // 驗證標題包含問題關鍵字或 AIGC 關鍵字
    const answerTitleLower = answerTitle.toLowerCase();
    expect(
      answerTitleLower.includes('aigc') ||
      answerTitleLower.includes(questionText.toLowerCase().slice(0, 20))
    ).toBeTruthy();

    // 步驟 9: 驗證 Answer 內容載入
    console.log('📝 Step 9: Verifying Answer content...');
    const answerContent = answerPage.locator('p, li');
    expect(await answerContent.count()).toBeGreaterThan(3);

    // 檢查 Mlytics AI 標記（僅記錄，不做斷言）
    const hasMlyticsAI = await answerPage.getByText(/Powered by.*Mlytics|Mlytics.*AI/i).count();
    if (hasMlyticsAI > 0) {
      console.log('✅ Found Mlytics AI branding');
    } else {
      console.log('ℹ️  Mlytics AI branding not found (non-critical)');
    }
    
    await testInfo.attach('05-answer-content.png', {
      body: await answerPage.screenshot({ fullPage: false }),
      contentType: 'image/png',
    });

    // 步驟 10: 滾動並驗證『資料來源』區塊
    console.log('📚 Step 10: Verifying Data Source section...');
    for (let i = 0; i < 3; i++) {
      await answerPage.mouse.wheel(0, 1200);
      await answerPage.waitForTimeout(300);
    }

    const dataSourceHeading = answerPage.getByRole('heading', { name: /資料來源|Data Source/i });
    await expect(dataSourceHeading).toBeVisible({ timeout: 10_000 });
    await dataSourceHeading.scrollIntoViewIfNeeded();
    await answerPage.waitForTimeout(500);
    await testInfo.attach('06-data-source-section.png', {
      body: await answerPage.screenshot({ fullPage: false }),
      contentType: 'image/png',
    });

    // 步驟 11: 驗證底部『你想知道哪些？AI來解答』區塊
    console.log('🔄 Step 11: Verifying bottom AIGC section...');
    for (let i = 0; i < 3; i++) {
      await answerPage.mouse.wheel(0, 1000);
      await answerPage.waitForTimeout(300);
    }

    const bottomAigcHeading = answerPage.getByRole('heading', { name: /你想知道哪些.*AI來解答/i });
    await expect(bottomAigcHeading).toBeVisible({ timeout: 10_000 });
    await bottomAigcHeading.scrollIntoViewIfNeeded();
    await answerPage.waitForTimeout(500);
    await testInfo.attach('07-bottom-aigc-section.png', {
      body: await answerPage.screenshot({ fullPage: false }),
      contentType: 'image/png',
    });

    // 最終完整截圖
    await testInfo.attach('08-answer-complete.png', {
      body: await answerPage.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });

    // 保存網路日誌
    const networkLogPath = testInfo.outputPath('network-aigc.json');
    fs.writeFileSync(networkLogPath, JSON.stringify(networkLogs, null, 2), 'utf-8');
    await testInfo.attach('network-aigc.json', {
      path: networkLogPath,
      contentType: 'application/json',
    });

    // 驗證關鍵資源載入
    const hasMLyticsJS = networkLogs.some((log) => log.url.includes('mlytics.com') && log.url.includes('.js'));
    const hasAIGCJS = networkLogs.some((log) => log.url.includes('aigc') && log.url.includes('.js'));

    console.log(`\n📊 Network Resource Summary:`);
    console.log(`   - Mlytics JS loaded: ${hasMLyticsJS ? '✅' : '❌'}`);
    console.log(`   - AIGC JS loaded: ${hasAIGCJS ? '✅' : '❌'}`);
    console.log(`   - Total AIGC requests: ${networkLogs.length}`);

    expect.soft(hasMLyticsJS).toBeTruthy();
    expect.soft(hasAIGCJS).toBeTruthy();

    console.log('\n✅ All steps completed successfully!');
  });
});

