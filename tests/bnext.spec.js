const { test, expect } = require('@playwright/test');

test.describe('BNEXT AIGC 功能測試', () => {
    let monitor;

    test.beforeEach(async () => {
        process.env.SITE_ID = 'bnext';
        process.env.BASE_URL = 'https://www.bnext.com.tw/articles';
        const AIGCMonitor = require('../src/monitor');
        monitor = new AIGCMonitor();
    });

    test('完整 AIGC 流程測試', async () => {
        const results = await monitor.run();

        expect(results.site).toBe('bnext');
        expect(results.results.website_accessible).toBe(true);
        expect(results.results.news_article_loaded).toBe(true);
        expect(results.results.ai_section_found).toBe(true);
        expect(results.results.ai_questions_available).toBe(true);
        expect(results.results.aigc_resources_loaded).toBe(true);
    });
});


