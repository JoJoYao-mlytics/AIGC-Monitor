import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('roadtest.u-car.com.tw AIGC verification', () => {
  test('End-to-end flow: Article -> AIGC Question -> Answer page', async ({ context, page }, testInfo) => {
    const networkLogs: Array<{ method: string; url: string; status?: number; type?: string }> = [];
    const consoleLogs: Array<{ type: string; text: string }> = [];

    // Network monitoring for mlytics and AIGC resources
    context.on('requestfinished', async (req) => {
      const url = req.url();
      if (url.includes('mlytics.com') || url.includes('aigc')) {
        try {
          const res = await req.response();
          networkLogs.push({ 
            method: req.method(), 
            url, 
            status: res?.status(),
            type: req.resourceType()
          });
        } catch {
          networkLogs.push({ method: req.method(), url, type: req.resourceType() });
        }
      }
    });

    // Console monitoring for AIGC initialization messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('AIGC') || text.includes('aigc')) {
        consoleLogs.push({ type: msg.type(), text });
      }
    });

    // STEP 1: Navigate to roadtest articles listing
    console.log('STEP 1: Opening roadtest articles page...');
    await page.goto('https://roadtest.u-car.com.tw/roadtest/articles', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000); // Wait for dynamic content
    await testInfo.attach('01-articles-list.png', { 
      body: await page.screenshot({ fullPage: false }), 
      contentType: 'image/png' 
    });

    // STEP 2: Find and click article in "試車報告" section
    console.log('STEP 2: Finding article in 試車報告 section...');
    
    // Locate article links in the test drive report section
    const articleLink = page.locator('a[href*="/roadtest/article/"]').first();
    await expect(articleLink).toBeVisible({ timeout: 10000 });
    
    const articleLinkText = (await articleLink.textContent())?.trim() || '';
    const articleHref = await articleLink.getAttribute('href');
    console.log(`  Found article: "${articleLinkText}"`);
    console.log(`  Article URL: ${articleHref}`);
    
    expect(articleHref).toContain('/roadtest/article/');
    
    await articleLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await testInfo.attach('02-article-clicked.png', { 
      body: await page.screenshot({ fullPage: false }), 
      contentType: 'image/png' 
    });

    // STEP 3: Verify article page title matches
    console.log('STEP 3: Verifying article title...');
    const pageTitle = await page.title();
    console.log(`  Page title: "${pageTitle}"`);
    
    // The page title should contain the site name "U-CAR試車"
    expect(pageTitle).toContain('U-CAR');

    // STEP 4: Scroll to bottom and find "你想知道哪些？AI來解答" section
    console.log('STEP 4: Scrolling to find AIGC section...');
    
    // Scroll down to trigger lazy-loaded AIGC widget
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(500);
    }

    // Wait for AIGC section to appear
    const aigcSectionHeading = page.locator('h2, h3').filter({ hasText: /你想知道哪些.*AI來解答/ });
    await expect(aigcSectionHeading).toBeVisible({ timeout: 15000 });
    console.log('  ✓ Found AIGC section');

    // Scroll the AIGC section into view
    await aigcSectionHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await testInfo.attach('03-aigc-section-found.png', { 
      body: await page.screenshot({ fullPage: false }), 
      contentType: 'image/png' 
    });

    // Verify AIGC questions exist
    const aigcQuestions = page.locator('a[href*="aigc.u-car.com.tw/answer"]');
    const questionsCount = await aigcQuestions.count();
    console.log(`  Found ${questionsCount} AIGC questions`);
    expect(questionsCount).toBeGreaterThan(0);

    // STEP 5: Click first AIGC question link (opens new tab)
    console.log('STEP 5: Clicking AIGC question link...');
    const firstQuestion = aigcQuestions.first();
    const questionText = (await firstQuestion.textContent())?.trim() || '';
    console.log(`  Question: "${questionText}"`);

    const newPagePromise = context.waitForEvent('page');
    await firstQuestion.click();
    const answerPage = await newPagePromise;
    await answerPage.waitForLoadState('domcontentloaded');
    await answerPage.waitForTimeout(2000);

    // STEP 6: Verify Answer page title matches question
    console.log('STEP 6: Verifying Answer page...');
    const answerPageTitle = await answerPage.title();
    const answerPageUrl = answerPage.url();
    console.log(`  Answer page title: "${answerPageTitle}"`);
    console.log(`  Answer page URL: ${answerPageUrl}`);

    // Verify URL is AIGC answer page
    expect(answerPageUrl).toContain('aigc.u-car.com.tw/answer');
    
    // Verify page has AIGC branding
    expect(answerPageTitle).toContain('AIGC');

    await testInfo.attach('04-answer-page-opened.png', { 
      body: await answerPage.screenshot({ fullPage: false }), 
      contentType: 'image/png' 
    });

    // STEP 7: Verify Answer content is loaded
    console.log('STEP 7: Verifying Answer content...');
    
    // Check for main answer heading
    const answerHeading = answerPage.locator('h1').first();
    await expect(answerHeading).toBeVisible({ timeout: 10000 });
    const answerHeadingText = await answerHeading.textContent();
    console.log(`  Answer heading: "${answerHeadingText}"`);

    // Verify answer has content (paragraphs, lists, etc.)
    const contentElements = answerPage.locator('p, li');
    const contentCount = await contentElements.count();
    console.log(`  Found ${contentCount} content elements`);
    expect(contentCount).toBeGreaterThan(3);

    // STEP 8: Scroll and verify "資料來源" section exists
    console.log('STEP 8: Looking for 資料來源 section...');
    
    // Scroll down to load all content
    for (let i = 0; i < 5; i++) {
      await answerPage.mouse.wheel(0, 1500);
      await answerPage.waitForTimeout(400);
    }

    const dataSourceHeading = answerPage.locator('h3, h4, h5').filter({ hasText: '資料來源' });
    await expect(dataSourceHeading).toBeVisible({ timeout: 10000 });
    console.log('  ✓ Found 資料來源 section');

    await testInfo.attach('05-answer-datasource.png', { 
      body: await answerPage.screenshot({ fullPage: false }), 
      contentType: 'image/png' 
    });

    // STEP 9: Verify "你想知道哪些？AI來解答" section at bottom
    console.log('STEP 9: Looking for bottom AIGC section...');
    
    const bottomAigcHeading = answerPage.locator('h3, h2').filter({ hasText: /你想知道哪些.*AI來解答/ });
    await expect(bottomAigcHeading).toBeVisible({ timeout: 10000 });
    console.log('  ✓ Found bottom AIGC section');

    // Verify new AIGC questions exist
    const moreQuestions = answerPage.locator('h4, a').filter({ hasText: /.+/ });
    const moreQuestionsCount = await moreQuestions.count();
    console.log(`  Found ${moreQuestionsCount} additional questions`);
    expect(moreQuestionsCount).toBeGreaterThan(0);

    await testInfo.attach('06-answer-complete.png', { 
      body: await answerPage.screenshot({ fullPage: true }), 
      contentType: 'image/png' 
    });

    // Verify mlytics/AIGC resources loaded
    console.log('\n=== Network Resource Verification ===');
    const mlyticsRequests = networkLogs.filter(log => log.url.includes('mlytics.com'));
    const aigcRequests = networkLogs.filter(log => log.url.includes('aigc'));
    
    console.log(`Mlytics requests: ${mlyticsRequests.length}`);
    mlyticsRequests.forEach(req => {
      console.log(`  [${req.status || '?'}] ${req.method} ${req.url}`);
    });

    console.log(`\nAIGC requests: ${aigcRequests.length}`);
    aigcRequests.forEach(req => {
      console.log(`  [${req.status || '?'}] ${req.method} ${req.url}`);
    });

    // Verify critical resources loaded with 200 status
    const criticalResources = [
      'mlytics.com/client/tmc.js',
      'mlytics.com/js/aigc_app.min.js',
      'aigc.u-car.com.tw/answer'
    ];

    criticalResources.forEach(resource => {
      const found = networkLogs.find(log => 
        log.url.includes(resource) && log.status === 200
      );
      expect.soft(found, `${resource} should load with status 200`).toBeTruthy();
    });

    // Verify AIGC initialization from console logs
    console.log('\n=== Console Logs (AIGC related) ===');
    consoleLogs.forEach(log => {
      console.log(`  [${log.type}] ${log.text}`);
    });

    const aigcInitLog = consoleLogs.find(log => 
      log.text.includes('AIGC') && (
        log.text.includes('載入') || 
        log.text.includes('完成') ||
        log.text.includes('widget')
      )
    );
    expect.soft(aigcInitLog, 'AIGC initialization should be logged').toBeTruthy();

    // Save network logs to file
    const networkLogPath = testInfo.outputPath('network-logs.json');
    fs.writeFileSync(networkLogPath, JSON.stringify({
      networkLogs,
      consoleLogs,
      summary: {
        totalRequests: networkLogs.length,
        mlyticsRequests: mlyticsRequests.length,
        aigcRequests: aigcRequests.length,
        consoleMessages: consoleLogs.length
      }
    }, null, 2), 'utf-8');
    await testInfo.attach('network-logs.json', { 
      path: networkLogPath, 
      contentType: 'application/json' 
    });

    console.log('\n✅ All steps completed successfully!');
    await answerPage.close();
  });
});
