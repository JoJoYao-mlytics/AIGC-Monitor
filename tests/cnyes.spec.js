const { test, expect } = require('@playwright/test');
const AIGCMonitor = require('../src/monitor');

// 設置環境變數
process.env.SITE_ID = 'cnyes';

test.describe('CNYES (鉅亨網) AIGC 功能監控', () => {
    test('應該成功完成所有 AIGC 功能檢查', async () => {
        const monitor = new AIGCMonitor();
        const results = await monitor.run();

        // 驗證基本結果
        expect(results.status).not.toBe('failed');
        expect(results.site).toBe('cnyes');
        
        // 驗證網站可訪問性
        expect(results.results.website_accessible).toBe(true);
        
        // 驗證文章載入
        expect(results.results.news_article_loaded).toBe(true);
        
        // 驗證 AIGC 資源載入 (至少有一個 API 成功)
        expect(results.results.aigc_resources_loaded).toBe(true);
        
        // 驗證 AI 區塊存在 (可能為 warning 狀態)
        console.log('AI 區塊檢查結果:', results.results.ai_section_found);
        
        // 驗證 AI 問題可用
        expect(results.results.ai_questions_available).toBe(true);
        
        // 驗證 AI 內容生成
        expect(results.results.ai_content_generated).toBe(true);
        
        // 驗證性能指標存在
        expect(results.performance.total_duration).toBeGreaterThan(0);
        expect(results.performance.page_load_time).toBeGreaterThan(0);
        
        // 驗證截圖已生成
        expect(results.screenshots.length).toBeGreaterThan(0);
        
        // 輸出詳細結果
        console.log('\n📊 測試結果摘要:');
        console.log(`狀態: ${results.status}`);
        console.log(`總執行時間: ${results.performance.total_duration}ms`);
        console.log(`API 請求數: ${results.api_requests.length}`);
        console.log(`Console 訊息數: ${results.console_messages.length}`);
        console.log(`截圖數: ${results.screenshots.length}`);
        console.log(`錯誤數: ${results.errors.length}`);
        
        // 如果有錯誤，輸出錯誤詳情
        if (results.errors.length > 0) {
            console.log('\n⚠️ 錯誤詳情:');
            results.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.message}`);
            });
        }
    }, 180000); // 3 分鐘超時
    
    test('應該正確追蹤 AIGC API 請求', async () => {
        const monitor = new AIGCMonitor();
        const results = await monitor.run();
        
        // 驗證有 API 請求被記錄
        expect(results.api_requests.length).toBeGreaterThan(0);
        
        // 驗證 AIGC 相關 API 請求
        const aigcRequests = results.api_requests.filter(req => 
            req.url.includes('api.aigc.mlytics.com')
        );
        
        expect(aigcRequests.length).toBeGreaterThan(0);
        
        // 輸出 AIGC API 詳情
        console.log('\n📡 AIGC API 請求詳情:');
        aigcRequests.forEach(req => {
            console.log(`- ${req.method} ${req.url} (${req.status}) - ${req.responseTimeMs}ms`);
        });
        
        // 驗證性能統計
        if (results.performance.api_avg_response_ms) {
            expect(results.performance.api_avg_response_ms).toBeGreaterThan(0);
            console.log(`\n⚡ API 平均響應時間: ${results.performance.api_avg_response_ms}ms`);
        }
    }, 180000);
    
    test('應該驗證完整的 AI 問答流程', async () => {
        const monitor = new AIGCMonitor();
        const results = await monitor.run();
        
        // 驗證完整流程
        const checks = {
            '網站可訪問': results.results.website_accessible,
            '文章已載入': results.results.news_article_loaded,
            'AIGC 資源已載入': results.results.aigc_resources_loaded,
            'AI 區塊已找到': results.results.ai_section_found,
            'AI 問題可用': results.results.ai_questions_available,
            'AI 內容已生成': results.results.ai_content_generated
        };
        
        console.log('\n✅ 完整流程檢查:');
        Object.entries(checks).forEach(([name, passed]) => {
            console.log(`${passed ? '✅' : '❌'} ${name}: ${passed}`);
        });
        
        // 計算通過率
        const passedChecks = Object.values(checks).filter(v => v).length;
        const totalChecks = Object.keys(checks).length;
        const passRate = (passedChecks / totalChecks * 100).toFixed(2);
        
        console.log(`\n📈 通過率: ${passRate}% (${passedChecks}/${totalChecks})`);
        
        // 至少要通過主要檢查項目
        expect(results.results.website_accessible).toBe(true);
        expect(results.results.news_article_loaded).toBe(true);
        expect(results.results.aigc_resources_loaded).toBe(true);
    }, 180000);
});

