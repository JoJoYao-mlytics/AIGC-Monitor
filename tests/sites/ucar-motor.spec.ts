import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('motor.u-car.com.tw AIGC verification', () => {
  test('End-to-end flow: Motor Article -> AIGC Question -> Answer page', async ({ context, page }, testInfo) => {
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

    // STEP 1: Navigate to motor articles listing
    console.log('STEP 1: Opening motor articles page...');
    await page.goto('https://motor.u-car.com.tw/motor/articles', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000); // Wait for dynamic content
    await testInfo.attach('01-motor-articles-list.png', { 
      body: await page.screenshot({ fullPage: false }), 
      contentType: 'image/png' 
    });

    // STEP 2: Find and click first motor article
    console.log('STEP 2: Finding and clicking motor article...');
    
    // Locate any motor article link - try to find the title heading
    const articleLink = page.locator('a[href*="/motor/article/"]').first();
    await expect(articleLink).toBeVisible({ timeout: 10000 });
    
    const articleHref = await articleLink.getAttribute('href');
    console.log(`  Article URL: ${articleHref}`);
    
    expect(articleHref).toContain('/motor/article/');
    
    await articleLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await testInfo.attach('02-motor-article-clicked.png', { 
      body: await page.screenshot({ fullPage: false }), 
      contentType: 'image/png' 
    });

    // STEP 3: Verify article page title
    console.log('STEP 3: Verifying article page loaded...');
    const pageTitle = await page.title();
    console.log(`  Page title: "${pageTitle}"`);
    
    // The page title should contain "U-CAR機車"
    expect(pageTitle).toContain('U-CAR');
    expect(pageTitle).toContain('機車');
    console.log('  ✓ Article page loaded successfully');

    // STEP 4: Scroll down to find "你想知道哪些？AI來解答" section
    console.log('STEP 4: Scrolling to find AIGC section in article...');
    
    // Scroll down progressively to trigger lazy-loaded AIGC widget
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(500);
    }

    // Wait for AIGC section to appear
    const aigcSectionHeading = page.locator('h2, h3').filter({ hasText: /你想知道哪些.*AI來解答/ });
    await expect(aigcSectionHeading).toBeVisible({ timeout: 15000 });
    console.log('  ✓ Found AIGC section in article');

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

    // Wait for new page to open
    const newPagePromise = context.waitForEvent('page');
    await firstQuestion.click();
    const answerPage = await newPagePromise;
    await answerPage.waitForLoadState('domcontentloaded');
    await answerPage.waitForTimeout(3000); // Wait longer for AIGC content to load

    // STEP 6: Verify Answer page title matches question
    console.log('STEP 6: Verifying Answer page title...');
    const answerPageTitle = await answerPage.title();
    const answerPageUrl = answerPage.url();
    console.log(`  Answer page title: "${answerPageTitle}"`);
    console.log(`  Answer page URL: ${answerPageUrl}`);
    console.log(`  Original question: "${questionText}"`);

    // Verify URL is AIGC answer page
    expect(answerPageUrl).toContain('aigc.u-car.com.tw/answer');
    
    // Verify page has AIGC branding
    expect(answerPageTitle).toContain('AIGC');
    
    // Verify title contains key parts of the question
    const questionWords = questionText.split(/\s+/).filter(w => w.length > 2).slice(0, 5);
    const titleMatchesQuestion = questionWords.some(word => answerPageTitle.includes(word));
    expect(titleMatchesQuestion, `Answer page title should contain keywords from question`).toBeTruthy();

    await testInfo.attach('04-answer-page-opened.png', { 
      body: await answerPage.screenshot({ fullPage: false }), 
      contentType: 'image/png' 
    });

    // STEP 7: Verify Answer content is loaded correctly
    console.log('STEP 7: Verifying Answer content is loaded...');
    
    // Check for main answer heading (h1)
    const answerHeading = answerPage.locator('h1').first();
    await expect(answerHeading).toBeVisible({ timeout: 10000 });
    const answerHeadingText = await answerHeading.textContent();
    console.log(`  Answer heading: "${answerHeadingText}"`);

    // Verify "Answer / Powered by Mlytics AI" badge (soft check)
    const mlyticsAiBadge = answerPage.locator('text=/Powered by|Mlytics|AI/i').first();
    const hasMlyticsBadge = await mlyticsAiBadge.isVisible().catch(() => false);
    expect.soft(hasMlyticsBadge, 'Powered by Mlytics AI badge should be visible').toBeTruthy();
    console.log(`  Mlytics AI badge: ${hasMlyticsBadge ? '✓ Found' : '⚠ Not found (continuing anyway)'}`);

    // Verify answer has substantive content
    const contentElements = answerPage.locator('p, li, h3, h4');
    const contentCount = await contentElements.count();
    console.log(`  Found ${contentCount} content elements`);
    expect(contentCount).toBeGreaterThan(5);

    // Check for specific content sections
    const hasParagraphs = await answerPage.locator('p').count() > 0;
    const hasLists = await answerPage.locator('ul, ol').count() > 0;
    console.log(`  Has paragraphs: ${hasParagraphs}, Has lists: ${hasLists}`);
    expect(hasParagraphs || hasLists).toBeTruthy();

    await testInfo.attach('05-answer-content.png', { 
      body: await answerPage.screenshot({ fullPage: false }), 
      contentType: 'image/png' 
    });

    // STEP 8: Scroll and verify "資料來源" (Data Source) section in middle
    console.log('STEP 8: Looking for 資料來源 section...');
    
    // Scroll down to load all content
    for (let i = 0; i < 5; i++) {
      await answerPage.mouse.wheel(0, 1500);
      await answerPage.waitForTimeout(500);
    }

    // Look for Data Source section with flexible selectors
    const dataSourceHeading = answerPage.locator('h3, h4, h5, text').filter({ 
      hasText: /資料來源|Data Source/i 
    });
    await expect(dataSourceHeading.first()).toBeVisible({ timeout: 10000 });
    console.log('  ✓ Found 資料來源 (Data Source) section');

    // Verify data source has links to source articles (soft check)
    const dataSourceLinks = answerPage.locator('a[href*="u-car.com.tw"]');
    const sourceLinksCount = await dataSourceLinks.count();
    console.log(`  Found ${sourceLinksCount} source article links`);
    expect.soft(sourceLinksCount, 'Data source section should contain article links').toBeGreaterThan(0);

    await testInfo.attach('06-data-source-section.png', { 
      body: await answerPage.screenshot({ fullPage: false }), 
      contentType: 'image/png' 
    });

    // STEP 9: Verify "你想知道哪些？AI來解答" section at bottom
    console.log('STEP 9: Looking for bottom AIGC section...');
    
    // Continue scrolling to bottom
    for (let i = 0; i < 3; i++) {
      await answerPage.mouse.wheel(0, 1500);
      await answerPage.waitForTimeout(500);
    }

    const bottomAigcHeading = answerPage.locator('h2, h3').filter({ 
      hasText: /你想知道哪些.*AI來解答/ 
    });
    await expect(bottomAigcHeading).toBeVisible({ timeout: 10000 });
    console.log('  ✓ Found bottom AIGC section with related questions');

    // Verify new AIGC questions exist
    const relatedQuestions = answerPage.locator('h4').filter({ hasText: /.{10,}/ });
    const relatedQuestionsCount = await relatedQuestions.count();
    console.log(`  Found ${relatedQuestionsCount} related questions`);
    expect(relatedQuestionsCount).toBeGreaterThan(0);

    // List related questions
    for (let i = 0; i < Math.min(relatedQuestionsCount, 5); i++) {
      const questionText = await relatedQuestions.nth(i).textContent();
      console.log(`    ${i + 1}. ${questionText}`);
    }

    await testInfo.attach('07-bottom-aigc-section.png', { 
      body: await answerPage.screenshot({ fullPage: false }), 
      contentType: 'image/png' 
    });

    // Full page screenshot of complete answer page
    await testInfo.attach('08-answer-complete-fullpage.png', { 
      body: await answerPage.screenshot({ fullPage: true }), 
      contentType: 'image/png' 
    });

    // === Network Resource Verification ===
    console.log('\n=== Network Resource Verification ===');
    const mlyticsRequests = networkLogs.filter(log => log.url.includes('mlytics.com'));
    const aigcRequests = networkLogs.filter(log => log.url.includes('aigc'));
    
    console.log(`Mlytics requests: ${mlyticsRequests.length}`);
    mlyticsRequests.slice(0, 10).forEach(req => {
      console.log(`  [${req.status || '?'}] ${req.method} ${req.url.substring(0, 100)}...`);
    });

    console.log(`\nAIGC requests: ${aigcRequests.length}`);
    aigcRequests.slice(0, 10).forEach(req => {
      console.log(`  [${req.status || '?'}] ${req.method} ${req.url.substring(0, 100)}...`);
    });

    // Verify critical resources loaded
    const criticalResourcePatterns = [
      { pattern: 'mlytics.com', name: 'Mlytics CDN' },
      { pattern: 'aigc_app', name: 'AIGC App Script' },
      { pattern: 'aigc.u-car.com.tw', name: 'AIGC API' }
    ];

    console.log('\n=== Critical Resources Check ===');
    criticalResourcePatterns.forEach(({ pattern, name }) => {
      const found = networkLogs.some(log => 
        log.url.includes(pattern) && (!log.status || log.status === 200)
      );
      console.log(`  ${found ? '✓' : '✗'} ${name}: ${found ? 'OK' : 'NOT FOUND'}`);
      expect.soft(found, `${name} should load successfully`).toBeTruthy();
    });

    // === Console Logs Verification ===
    console.log('\n=== Console Logs (AIGC related) ===');
    const uniqueConsoleLogs = [...new Set(consoleLogs.map(l => l.text))];
    uniqueConsoleLogs.forEach(logText => {
      console.log(`  ${logText}`);
    });

    // Check for key AIGC initialization messages
    const hasAigcInitLog = consoleLogs.some(log => 
      log.text.includes('AIGC') && (
        log.text.includes('載入') || 
        log.text.includes('完成') ||
        log.text.includes('開始') ||
        log.text.includes('widget') ||
        log.text.includes('網域匹配')
      )
    );
    console.log(`  AIGC initialization logged: ${hasAigcInitLog ? 'Yes' : 'No'}`);
    expect.soft(hasAigcInitLog, 'AIGC initialization should be logged').toBeTruthy();

    // Save comprehensive test logs
    const testSummary = {
      testName: 'motor.u-car.com.tw AIGC E2E Test',
      timestamp: new Date().toISOString(),
      article: {
        title: pageTitle,
        url: page.url()
      },
      question: {
        text: questionText,
        answerPageTitle,
        answerPageUrl
      },
      verification: {
        articleTitleMatches: true,
        aigcSectionFound: true,
        answerContentLoaded: contentCount > 5,
        dataSourceFound: sourceLinksCount > 0,
        bottomAigcSectionFound: relatedQuestionsCount > 0,
        relatedQuestionsCount
      },
      resources: {
        totalNetworkRequests: networkLogs.length,
        mlyticsRequests: mlyticsRequests.length,
        aigcRequests: aigcRequests.length,
        consoleMessages: consoleLogs.length
      },
      networkLogs: networkLogs.slice(0, 50), // Save first 50 requests
      consoleLogs: uniqueConsoleLogs.slice(0, 20) // Save first 20 unique logs
    };

    const summaryPath = testInfo.outputPath('test-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(testSummary, null, 2), 'utf-8');
    await testInfo.attach('test-summary.json', { 
      path: summaryPath, 
      contentType: 'application/json' 
    });

    console.log('\n✅ All 9 steps completed successfully!');
    console.log(`   - Article loaded and verified`);
    console.log(`   - AIGC widget found with ${questionsCount} questions`);
    console.log(`   - Answer page loaded with content`);
    console.log(`   - Data source section verified`);
    console.log(`   - ${relatedQuestionsCount} related questions found`);
    console.log(`   - ${mlyticsRequests.length + aigcRequests.length} AIGC resources loaded\n`);

    await answerPage.close();
  });
});

