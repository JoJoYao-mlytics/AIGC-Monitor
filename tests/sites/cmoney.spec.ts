import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('cmoney.tw AIGC verification', () => {
  test('End-to-end flow: News -> Article -> AIGC Answer', async ({ context, page }, testInfo) => {
    const networkLogs: Array<{ method: string; url: string; status?: number; resourceType?: string }> = [];

    // 監聽網路請求，記錄 mlytics.com 和 aigc 相關資源
    context.on('requestfinished', async (req) => {
      const url = req.url();
      if (url.includes('mlytics.com') || url.includes('aigc')) {
        try {
          const res = await req.response();
          networkLogs.push({ 
            method: req.method(), 
            url, 
            status: res?.status(),
            resourceType: req.resourceType()
          });
        } catch {
          networkLogs.push({ 
            method: req.method(), 
            url,
            resourceType: req.resourceType()
          });
        }
      }
    });

    console.log('\n📍 步驟 1: 導航到 CMoney 新聞快訊頁面');
    // 1) 導航到 CMoney 新聞快訊頁面
    await page.goto('https://www.cmoney.tw/notes/?navId=twstock_news', { 
      waitUntil: 'domcontentloaded' 
    });
    await page.waitForTimeout(3000); // 等待頁面完全載入
    await testInfo.attach('01-articles-list.png', { 
      body: await page.screenshot({ fullPage: false }), 
      contentType: 'image/png' 
    });
    console.log('✅ 頁面載入完成:', page.url());

    // 確認頁面載入
    expect(page.url()).toContain('cmoney.tw');
    await expect(page.locator('body')).toBeVisible();
    
    // 滾動頁面以確保內容載入
    console.log('\n📍 步驟 2: 滾動頁面以載入文章');
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(2000);

    console.log('\n📍 步驟 3: 尋找並點擊新聞快訊文章');
    // 2) 點擊「新聞快訊」裡的任意文章
    // 策略：尋找文章列表中的連結
    let articleClicked = false;
    let articleLinkText = '';
    
    // 方法1: 尋找包含「股價」、「飆升」等關鍵字的文章
    try {
      const articleLink = page.locator('a[href*="/notes/note-detail.aspx"]').first();
      const linkCount = await articleLink.count();
      console.log(`找到 ${linkCount} 個文章連結`);
      
      if (linkCount > 0) {
        // 取得第一個可見的文章連結
        await articleLink.waitFor({ state: 'visible', timeout: 5000 });
        articleLinkText = (await articleLink.textContent())?.trim() || '';
        console.log('準備點擊文章:', articleLinkText);
        await articleLink.click({ timeout: 5000 });
        articleClicked = true;
      }
    } catch (e) {
      console.log('方法1失敗，嘗試方法2:', e);
    }
    
    // 方法2: 如果方法1失敗，尋找任何可點擊的文章標題
    if (!articleClicked) {
      try {
        const anyArticleLink = page.locator('article a, .article-item a, [class*="article"] a').first();
        if (await anyArticleLink.count() > 0) {
          articleLinkText = (await anyArticleLink.textContent())?.trim() || '';
          console.log('方法2找到文章:', articleLinkText);
          await anyArticleLink.click({ force: true });
          articleClicked = true;
        }
      } catch (e) {
        console.log('方法2也失敗:', e);
      }
    }
    
    if (!articleClicked) {
      throw new Error('❌ 無法找到可點擊的文章');
    }
    
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // 等待內容載入
    console.log('✅ 文章頁面載入完成');
    
    await testInfo.attach('02-article-clicked.png', { 
      body: await page.screenshot({ fullPage: false }), 
      contentType: 'image/png' 
    });

    console.log('\n📍 步驟 4: 驗證文章頁面標題');
    // 3) 確認開啟的文章頁面的 title
    const pageTitle = await page.title();
    console.log('📰 文章頁面標題:', pageTitle);
    console.log('📰 點擊的連結文字:', articleLinkText);
    
    // 驗證標題不為空
    expect(pageTitle.length).toBeGreaterThan(0);
    // 軟斷言：檢查標題與連結文字的相關性
    if (articleLinkText) {
      const titleWords = pageTitle.split(/\s+/);
      const linkWords = articleLinkText.split(/\s+/);
      const hasCommonWord = titleWords.some(word => 
        word.length > 1 && linkWords.some(linkWord => linkWord.includes(word) || word.includes(linkWord))
      );
      expect.soft(hasCommonWord || pageTitle.includes(articleLinkText.substring(0, 5)))
        .toBeTruthy();
    }

    console.log('\n📍 步驟 5: 滾動頁面以載入 AIGC 區塊');
    // 4) 滾動到頁面底部以確保 AIGC 區塊載入
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 1000);
      await page.waitForTimeout(800);
    }

    console.log('\n📍 步驟 6: 尋找「你可能想知道」區塊');
    // 5) 確認文章頁面裡有「你可能想知道」區塊
    // 使用正確的 class 選擇器（可能有多個，取第一個）
    const aigcSection = page.locator('h2.question-title').first();
    await expect(aigcSection).toBeVisible({ timeout: 15000 });
    console.log('✅ 找到 AIGC 區塊');
    
    // 確認文字內容
    const aigcText = await aigcSection.textContent();
    console.log(`   AIGC 區塊標題: "${aigcText}"`);
    
    await testInfo.attach('03-aigc-section-found.png', { 
      body: await page.screenshot({ fullPage: false }), 
      contentType: 'image/png' 
    });

    console.log('\n📍 步驟 7: 點擊 AIGC 問題連結');
    // 6) 點擊「你可能想知道」裡的任意連結（會開啟新分頁）
    const aigcQuestionLink = page.locator('a[href*="aigc"]').first();
    
    await aigcQuestionLink.waitFor({ state: 'visible', timeout: 10000 });
    const aigcLinkText = (await aigcQuestionLink.textContent())?.trim() || '';
    console.log('🔗 準備點擊 AIGC 問題:', aigcLinkText);

    // 等待新分頁開啟
    const newPagePromise = context.waitForEvent('page');
    await aigcQuestionLink.click();
    const answerPage = await newPagePromise;
    await answerPage.waitForLoadState('domcontentloaded');
    await answerPage.waitForTimeout(3000);
    console.log('✅ Answer 頁面已開啟');
    
    await testInfo.attach('04-answer-page-opened.png', { 
      body: await answerPage.screenshot({ fullPage: false }), 
      contentType: 'image/png' 
    });

    console.log('\n📍 步驟 8: 驗證 Answer 頁面標題與內容');
    // 7) 確認 Answer 頁面 title 與剛剛點擊的相符
    const answerTitle = await answerPage.title();
    console.log('📄 Answer 頁面標題:', answerTitle);
    console.log('📄 點擊的問題文字:', aigcLinkText);
    
    expect(answerTitle.length).toBeGreaterThan(0);
    
    // 確認 URL 包含 aigc 相關路徑
    const answerURL = answerPage.url();
    console.log('🔗 Answer 頁面 URL:', answerURL);
    expect(answerURL).toMatch(/aigc.*cmoney\.tw|cmoney\.tw.*aigc/);

    // 驗證標題與連結的相關性（彈性匹配）
    if (aigcLinkText) {
      const titleWords = answerTitle.split(/[?？!！\s]+/).filter(w => w.length > 1);
      const linkWords = aigcLinkText.split(/[?？!！\s]+/).filter(w => w.length > 1);
      const hasCommonWords = titleWords.some(word => 
        linkWords.some(linkWord => linkWord.includes(word) || word.includes(linkWord))
      );
      expect.soft(hasCommonWords).toBeTruthy();
    }

    console.log('\n📍 步驟 9: 滾動 Answer 頁面以載入完整內容');
    // 滾動以確保所有內容載入
    await answerPage.mouse.wheel(0, 1000);
    await answerPage.waitForTimeout(1000);
    
    await testInfo.attach('05-answer-content.png', { 
      body: await answerPage.screenshot({ fullPage: false }), 
      contentType: 'image/png' 
    });

    // 繼續滾動以找到「資料來源」
    await answerPage.mouse.wheel(0, 1000);
    await answerPage.waitForTimeout(1000);

    console.log('\n📍 步驟 10: 驗證「資料來源」區塊');
    // 8) 確認 Answer 頁面有「資料來源」區塊
    // 使用正確的 id 選擇器
    const dataSourceSection = answerPage.locator('#source_area');
    await expect(dataSourceSection).toBeVisible({ timeout: 10000 });
    console.log('✅ 找到資料來源區塊 (#source_area)');
    
    await testInfo.attach('06-data-source-section.png', { 
      body: await answerPage.screenshot({ fullPage: false }), 
      contentType: 'image/png' 
    });

    console.log('\n📍 步驟 11: 驗證底部「你想知道哪些？AI來解答」區塊');
    // 9) 確認 Answer 頁面底部有「你想知道哪些？AI來解答」區塊
    await answerPage.mouse.wheel(0, 1500);
    await answerPage.waitForTimeout(1000);
    
    // 使用正確的 id 選擇器
    const questionArea = answerPage.locator('#question_area');
    await expect(questionArea).toBeVisible({ timeout: 10000 });
    console.log('✅ 找到 AI 推薦區塊 (#question_area)');
    
    await testInfo.attach('07-bottom-aigc-section.png', { 
      body: await answerPage.screenshot({ fullPage: false }), 
      contentType: 'image/png' 
    });

    // 確認頁面有實際內容
    const contentLocators = await answerPage.locator('p, li, div[class*="content"], h1, h2, h3').count();
    console.log(`📝 頁面內容元素數量: ${contentLocators}`);
    expect(contentLocators).toBeGreaterThan(5);

    // 最終完整頁面截圖
    await testInfo.attach('08-answer-complete.png', { 
      body: await answerPage.screenshot({ fullPage: true }), 
      contentType: 'image/png' 
    });

    console.log('\n📍 步驟 12: 儲存網路日誌與統計');
    // 儲存網路日誌
    const networkLogPath = testInfo.outputPath('network-cmoney-aigc.json');
    fs.writeFileSync(networkLogPath, JSON.stringify(networkLogs, null, 2), 'utf-8');
    await testInfo.attach('network-cmoney-aigc.json', { 
      path: networkLogPath, 
      contentType: 'application/json' 
    });

    // 輸出統計資訊
    const mlyticsCount = networkLogs.filter(log => log.url.includes('mlytics.com')).length;
    const aigcCount = networkLogs.filter(log => log.url.includes('aigc')).length;
    console.log(`\n📊 網路資源統計:`);
    console.log(`   ✅ mlytics.com 相關請求: ${mlyticsCount}`);
    console.log(`   ✅ AIGC 相關請求: ${aigcCount}`);
    console.log(`   📦 總請求數: ${networkLogs.length}`);

    // 驗證必要資源已載入
    expect(mlyticsCount).toBeGreaterThan(0);
    expect(aigcCount).toBeGreaterThan(0);

    console.log('\n✅ 所有測試步驟完成！');

    // 清理：關閉新分頁
    await answerPage.close();
  });
});
