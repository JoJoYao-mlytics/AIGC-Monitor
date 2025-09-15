const { test, expect } = require('@playwright/test');
const AIGCMonitor = require('../src/monitor');

test.describe('GUGU AIGC 功能測試', () => {
    let monitor;

    test.beforeEach(async () => {
        // 設置環境變數
        process.env.SITE_ID = 'gugu';
        process.env.BASE_URL = 'https://www.gugu.fund/';
        
        monitor = new AIGCMonitor();
    });

    test('完整 AIGC 流程測試', async () => {
        const results = await monitor.run();
        
        // 驗證基本結果
        expect(results.status).toBe('success');
        expect(results.site).toBe('gugu');
        
        // 驗證各項檢查結果
        expect(results.results.website_accessible).toBe(true);
        expect(results.results.news_article_loaded).toBe(true);
        expect(results.results.ai_section_found).toBe(true);
        expect(results.results.ai_questions_available).toBe(true);
        expect(results.results.ai_content_generated).toBe(true);
        expect(results.results.aigc_resources_loaded).toBe(true);
        
        // 驗證 AIGC 資源載入
        expect(results.aigc_verification.script_loaded).toBe(true);
        expect(results.aigc_verification.css_loaded).toBe(true);
        expect(results.aigc_verification.tracker_called).toBe(true);
        
        // 驗證效能指標
        expect(results.performance.total_duration).toBeGreaterThan(0);
        expect(results.performance.page_load_time).toBeGreaterThan(0);
        
        // 驗證 API 請求
        expect(results.api_requests.length).toBeGreaterThan(0);
        
        // 驗證截圖
        expect(results.screenshots.length).toBeGreaterThan(0);
    });

    test('網站可訪問性測試', async ({ page }) => {
        const config = require('../src/config').config;
        
        await page.goto(config.baseUrl);
        await expect(page).toHaveTitle(/股股/);
        
        // 檢查主要元素是否存在
        const mainContent = page.locator('main, .main-content, article').first();
        await expect(mainContent).toBeVisible();
    });

    test('最新發燒文章區塊測試', async ({ page }) => {
        const config = require('../src/config').config;
        
        await page.goto(config.baseUrl);
        
        // 檢查是否有最新發燒文章區塊
        const newsSection = page.getByText('最新發燒文章');
        await expect(newsSection).toBeVisible();
        
        // 檢查是否有文章連結
        const articleLinks = page.locator('a[href*="/blog/"]');
        await expect(articleLinks.first()).toBeVisible();
    });

    test('AIGC 資源載入測試', async ({ page }) => {
        const config = require('../src/config').config;
        
        // 監控網路請求
        const requests = [];
        page.on('response', response => {
            requests.push({
                url: response.url(),
                status: response.status()
            });
        });
        
        // 導航到文章頁面
        await page.goto('https://school.gugu.fund/blog/invest-news/5288080656');
        
        // 等待頁面載入完成
        await page.waitForLoadState('networkidle');
        
        // 檢查關鍵 AIGC 資源是否載入
        const jsLoaded = requests.some(req => 
            req.url.includes('db_answer.min.js') && req.status === 200
        );
        const cssLoaded = requests.some(req => 
            req.url.includes('aigc-answer.css') && req.status === 200
        );
        const trackerCalled = requests.some(req => 
            req.url.includes('api.aigc.mlytics.com/tracker') && req.status === 200
        );
        
        expect(jsLoaded).toBe(true);
        expect(cssLoaded).toBe(true);
        expect(trackerCalled).toBe(true);
    });

    test('AI 區塊存在性測試', async ({ page }) => {
        // 導航到文章頁面
        await page.goto('https://school.gugu.fund/blog/invest-news/5288080656');
        
        // 滾動頁面以觸發懶載入
        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight * 2);
        });
        await page.waitForTimeout(3000);
        
        // 檢查 "你可能也想知道" 區塊
        const aiSection = page.getByRole('heading', { name: /你可能也想知道/ });
        await expect(aiSection).toBeVisible({ timeout: 10000 });
    });

    test('AI 問題連結測試', async ({ page, context }) => {
        // 導航到文章頁面
        await page.goto('https://school.gugu.fund/blog/invest-news/5288080656');
        
        // 等待 AI 區塊載入
        await page.waitForTimeout(5000);
        
        // 滾動到 AI 區塊
        const aiSection = page.getByRole('heading', { name: /你可能也想知道/ });
        await aiSection.scrollIntoViewIfNeeded();
        
        // 找到第一個 AI 問題連結
        const questionLink = page.locator('a[href*="/ai/answer"]').first();
        await expect(questionLink).toBeVisible({ timeout: 10000 });
        
        // 獲取問題文字
        const questionText = await questionLink.textContent();
        expect(questionText).toBeTruthy();
        
        // 點擊連結並等待新頁面
        const [newPage] = await Promise.all([
            context.waitForEvent('page'),
            questionLink.click()
        ]);
        
        await newPage.waitForLoadState('domcontentloaded');
        
        // 驗證新頁面標題
        const newPageTitle = await newPage.title();
        expect(newPageTitle).toContain('AIGC');
        
        // 檢查是否有 AI 內容
        const aiContent = newPage.getByText('Powered by Mlytics AI');
        await expect(aiContent).toBeVisible({ timeout: 30000 });
        
        await newPage.close();
    });

    test('Console 訊息檢查測試', async ({ page }) => {
        const consoleMessages = [];
        
        page.on('console', msg => {
            consoleMessages.push(msg.text());
        });
        
        // 導航到文章頁面
        await page.goto('https://school.gugu.fund/blog/invest-news/5288080656');
        await page.waitForTimeout(5000);
        
        // 檢查是否有預期的 console 訊息
        const expectedMessages = [
            'AIGC 腳本加載完成',
            '🚀 Powered by Mlytics AI'
        ];
        
        let foundMessages = 0;
        for (const expected of expectedMessages) {
            const found = consoleMessages.some(msg => msg.includes(expected));
            if (found) foundMessages++;
        }
        
        expect(foundMessages).toBeGreaterThan(0);
    });

    test('錯誤處理測試', async ({ page }) => {
        // 測試無效 URL
        const invalidUrl = 'https://invalid-gugu-url.com';
        
        try {
            await page.goto(invalidUrl, { timeout: 10000 });
        } catch (error) {
            expect(error.message).toContain('net::ERR_NAME_NOT_RESOLVED');
        }
    });

    test('效能基準測試', async ({ page }) => {
        const startTime = Date.now();
        
        await page.goto('https://www.gugu.fund/');
        await page.waitForLoadState('domcontentloaded');
        
        const loadTime = Date.now() - startTime;
        
        // 頁面載入時間應該在合理範圍內（60秒內）
        expect(loadTime).toBeLessThan(60000);
        
        console.log(`頁面載入時間: ${loadTime}ms`);
    });
});
