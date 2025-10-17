const { test, expect } = require('@playwright/test');
const AIGCMonitor = require('../src/monitor');

process.env.SITE_ID = 'ucar-am';

test.describe('U-CAR AM (售後市場) AIGC 功能監控', () => {
    test('應該成功完成所有 AIGC 功能檢查', async () => {
        const monitor = new AIGCMonitor();
        const results = await monitor.run();

        expect(results.status).not.toBe('failed');
        expect(results.site).toBe('ucar-am');
        expect(results.results.website_accessible).toBe(true);
        expect(results.results.news_article_loaded).toBe(true);
        expect(results.results.ai_section_found).toBe(true);
        expect(results.results.ai_questions_available).toBe(true);
        expect(results.results.ai_content_generated).toBe(true);
        console.log('AIGC 資源載入檢查結果:', results.results.aigc_resources_loaded);
        expect(results.performance.total_duration).toBeGreaterThan(0);
        expect(results.performance.page_load_time).toBeGreaterThan(0);
        expect(results.screenshots.length).toBeGreaterThan(0);
    }, 180000);

    test('應該正確追蹤 AIGC API 請求', async () => {
        const monitor = new AIGCMonitor();
        const results = await monitor.run();

        expect(results.api_requests.length).toBeGreaterThan(0);
        const aigcRequests = results.api_requests.filter(req =>
            req.url.includes('api.aigc.mlytics.com') ||
            req.url.includes('aigc.u-car.com.tw') ||
            req.url.includes('tags-assets.mlytics.com')
        );
        expect(aigcRequests.length).toBeGreaterThan(0);
        if (results.performance.api_avg_response_ms) {
            expect(results.performance.api_avg_response_ms).toBeGreaterThan(0);
        }
    }, 180000);

    test('應該驗證完整的 AI 問答流程', async () => {
        const monitor = new AIGCMonitor();
        const results = await monitor.run();

        const checks = {
            '網站可訪問': results.results.website_accessible,
            'AM 售後市場文章已載入': results.results.news_article_loaded,
            'AI 區塊已找到': results.results.ai_section_found,
            'AI 問題可用': results.results.ai_questions_available,
            'AI 內容已生成': results.results.ai_content_generated,
            'AIGC 資源已載入': results.results.aigc_resources_loaded
        };

        Object.entries(checks).forEach(([name, passed]) => {
            console.log(`${passed ? '✅' : '❌'} ${name}: ${passed}`);
        });

        expect(results.results.website_accessible).toBe(true);
        expect(results.results.news_article_loaded).toBe(true);
        expect(results.results.ai_section_found).toBe(true);
        expect(results.results.ai_questions_available).toBe(true);
        expect(results.results.ai_content_generated).toBe(true);
    }, 180000);

    test('應該驗證 AIGC 資源載入', async () => {
        const monitor = new AIGCMonitor();
        const results = await monitor.run();

        const verification = results.aigc_verification;
        console.log(`JavaScript 腳本載入: ${verification.script_loaded ? '✅' : '❌'}`);
        console.log(`追蹤器 API 呼叫: ${verification.tracker_called ? '✅' : '❌'}`);
        console.log(`Console 訊息檢測: ${verification.console_messages_found ? '✅' : '❌'}`);

        const hasAnyResource =
            verification.script_loaded ||
            verification.tracker_called ||
            results.results.aigc_resources_loaded;

        expect(hasAnyResource).toBe(true);
    }, 180000);

    test('應該驗證 Mlytics.com 和 AIGC 相關資源正確載入', async () => {
        const monitor = new AIGCMonitor();
        const results = await monitor.run();

        const mlyticsTmcLoaded = results.api_requests.some(req => req.url.includes('tags-assets.mlytics.com/client/tmc.js') && req.status === 200);
        const aigcAppJsLoaded = results.api_requests.some(req => req.url.includes('api.aigc.mlytics.com/js/aigc_app.min.js') && req.status === 200);
        const aigcTrackerCalled = results.api_requests.some(req => req.url.includes('api.aigc.mlytics.com/tracker') && req.status === 200);

        console.log(`\n🔍 Mlytics & AIGC 資源驗證:`);
        console.log(`  Mlytics TMC 腳本載入: ${mlyticsTmcLoaded ? '✅' : '❌'}`);
        console.log(`  AIGC App JS 腳本載入: ${aigcAppJsLoaded ? '✅' : '❌'}`);
        console.log(`  AIGC Tracker API 呼叫: ${aigcTrackerCalled ? '✅' : '❌'}`);

        expect(mlyticsTmcLoaded).toBe(true);
        expect(aigcAppJsLoaded).toBe(true);
        expect(aigcTrackerCalled).toBe(true);
    }, 180000);

    test('應該驗證 Answer 頁面 CSS 資源載入', async () => {
        const monitor = new AIGCMonitor();
        const results = await monitor.run();

        const answerCssLoaded = results.api_requests.some(req =>
            req.url.includes('api.aigc.mlytics.com/css/aigc_answer.min.css') && req.status === 200
        );

        console.log(`\n🔍 Answer 頁面 CSS 資源驗證:`);
        console.log(`  AIGC Answer CSS 載入: ${answerCssLoaded ? '✅' : '❌'}`);

        expect(answerCssLoaded).toBe(true);
    }, 180000);

    test('應該驗證售後市場專屬內容', async () => {
        const monitor = new AIGCMonitor();
        const results = await monitor.run();

        expect(results.baseUrl).toContain('am.u-car.com.tw');
        const articleUrl = results.api_requests.find(req => req.url.includes('/am/article/'));
        if (articleUrl) {
            console.log(`✅ 確認為售後市場文章: ${articleUrl.url}`);
        }
        expect(results.results.website_accessible).toBe(true);
        expect(results.results.news_article_loaded).toBe(true);
    }, 180000);
});

