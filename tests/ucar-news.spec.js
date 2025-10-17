const { test, expect } = require('@playwright/test');
const AIGCMonitor = require('../src/monitor');

// 設置環境變數
process.env.SITE_ID = 'ucar-news';

test.describe('U-CAR 車壇新聞 AIGC 功能監控', () => {
    test('應該成功完成所有 AIGC 功能檢查', async () => {
        const monitor = new AIGCMonitor();
        const results = await monitor.run();

        // 驗證基本結果
        expect(results.status).not.toBe('failed');
        expect(results.site).toBe('ucar-news');
        
        // 驗證網站可訪問性
        expect(results.results.website_accessible).toBe(true);
        
        // 驗證文章載入
        expect(results.results.news_article_loaded).toBe(true);
        
        // 驗證 AI 區塊存在
        expect(results.results.ai_section_found).toBe(true);
        
        // 驗證 AI 問題可用
        expect(results.results.ai_questions_available).toBe(true);
        
        // 驗證 AI 內容生成
        expect(results.results.ai_content_generated).toBe(true);
        
        // 驗證 AIGC 資源載入（可能為 warning 狀態）
        console.log('AIGC 資源載入檢查結果:', results.results.aigc_resources_loaded);
        
        // 驗證性能指標存在
        expect(results.performance.total_duration).toBeGreaterThan(0);
        expect(results.performance.page_load_time).toBeGreaterThan(0);
        
        // 驗證截圖已生成
        expect(results.screenshots.length).toBeGreaterThan(0);
        
        // 輸出詳細結果
        console.log('\n📊 測試結果摘要:');
        console.log(`狀態: ${results.status}`);
        console.log(`總執行時間: ${results.performance.total_duration}ms`);
        console.log(`頁面載入時間: ${results.performance.page_load_time}ms`);
        console.log(`API 請求數: ${results.api_requests.length}`);
        console.log(`Console 訊息數: ${results.console_messages.length}`);
        console.log(`截圖數: ${results.screenshots.length}`);
        console.log(`錯誤數: ${results.errors.length}`);
        
        // 如果有錯誤，輸出錯誤詳情
        if (results.errors.length > 0) {
            console.log('\n⚠️ 錯誤詳情:');
            results.errors.forEach((error, index) => {
                console.log(`${index + 1}. [${error.step}] ${error.message}`);
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
            req.url.includes('api.aigc.mlytics.com') ||
            req.url.includes('aigc.u-car.com.tw')
        );
        
        console.log(`\n📡 AIGC API 請求數: ${aigcRequests.length}`);
        
        // 輸出 AIGC API 詳情
        if (aigcRequests.length > 0) {
            console.log('\n📡 AIGC API 請求詳情:');
            aigcRequests.forEach(req => {
                console.log(`- ${req.method} ${req.url} (${req.status}) - ${req.responseTimeMs}ms`);
            });
        }
        
        // 驗證性能統計
        if (results.performance.api_avg_response_ms) {
            expect(results.performance.api_avg_response_ms).toBeGreaterThan(0);
            console.log(`\n⚡ API 平均響應時間: ${results.performance.api_avg_response_ms}ms`);
            console.log(`⚡ API 最大響應時間: ${results.performance.api_max_response_ms}ms`);
            console.log(`⚡ API 最小響應時間: ${results.performance.api_min_response_ms}ms`);
        }
    }, 180000);
    
    test('應該驗證完整的 AI 問答流程', async () => {
        const monitor = new AIGCMonitor();
        const results = await monitor.run();
        
        // 驗證完整流程
        const checks = {
            '網站可訪問': results.results.website_accessible,
            '車壇新聞文章已載入': results.results.news_article_loaded,
            'AI 區塊已找到': results.results.ai_section_found,
            'AI 問題可用': results.results.ai_questions_available,
            'AI 內容已生成': results.results.ai_content_generated,
            'AIGC 資源已載入': results.results.aigc_resources_loaded
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
        expect(results.results.ai_section_found).toBe(true);
        expect(results.results.ai_questions_available).toBe(true);
        expect(results.results.ai_content_generated).toBe(true);
    }, 180000);
    
    test('應該驗證 AIGC 資源載入', async () => {
        const monitor = new AIGCMonitor();
        const results = await monitor.run();
        
        // 驗證 AIGC 驗證結果
        const verification = results.aigc_verification;
        
        console.log('\n🔍 AIGC 資源驗證詳情:');
        console.log(`JavaScript 腳本載入: ${verification.script_loaded ? '✅' : '❌'}`);
        console.log(`追蹤器 API 呼叫: ${verification.tracker_called ? '✅' : '❌'}`);
        console.log(`Console 訊息檢測: ${verification.console_messages_found ? '✅' : '❌'}`);
        
        // 檢查 Console 訊息
        const aigcConsoleMessages = results.console_messages.filter(msg => 
            msg.text.includes('AIGC') || 
            msg.text.includes('aigc') ||
            msg.text.includes('Mlytics')
        );
        
        if (aigcConsoleMessages.length > 0) {
            console.log('\n📝 AIGC 相關 Console 訊息:');
            aigcConsoleMessages.forEach(msg => {
                console.log(`[${msg.type}] ${msg.text.substring(0, 100)}`);
            });
        }
        
        // 只要有部分資源載入即可
        const hasAnyResource = 
            verification.script_loaded || 
            verification.tracker_called || 
            results.results.aigc_resources_loaded;
        
        expect(hasAnyResource).toBe(true);
    }, 180000);
    
    test('應該驗證 Mlytics 與 AIGC 資源載入', async () => {
        const monitor = new AIGCMonitor();
        const results = await monitor.run();
        
        // 驗證 Mlytics 相關請求
        const mlyticsRequests = results.api_requests.filter(req => 
            req.url.includes('mlytics.com')
        );
        
        const aigcRequests = results.api_requests.filter(req => 
            req.url.includes('aigc')
        );
        
        console.log('\n🌐 Mlytics & AIGC 資源驗證:');
        console.log(`Mlytics 相關請求數: ${mlyticsRequests.length}`);
        console.log(`AIGC 相關請求數: ${aigcRequests.length}`);
        
        // 驗證關鍵資源
        const hasMlyticsTMC = results.api_requests.some(req => 
            req.url.includes('tags-assets.mlytics.com/client/tmc.js')
        );
        const hasAIGCApp = results.api_requests.some(req => 
            req.url.includes('api.aigc.mlytics.com/js/aigc_app.min.js')
        );
        
        console.log(`✅ Mlytics TMC 腳本: ${hasMlyticsTMC ? '已載入' : '未載入'}`);
        console.log(`✅ AIGC App 腳本: ${hasAIGCApp ? '已載入' : '未載入'}`);
        
        // 至少要有其中一個資源載入
        expect(mlyticsRequests.length + aigcRequests.length).toBeGreaterThan(0);
    }, 180000);
    
    test('應該驗證車壇新聞區專屬內容', async () => {
        const monitor = new AIGCMonitor();
        const results = await monitor.run();
        
        // 驗證基礎 URL 是車壇新聞區
        expect(results.baseUrl).toContain('news.u-car.com.tw');
        
        // 驗證文章 URL 格式
        const articleUrl = results.api_requests.find(req => req.url.includes('/news/article/'));
        console.log('\n🗞️ 車壇新聞區專屬驗證:');
        console.log(`基礎 URL: ${results.baseUrl}`);
        if (articleUrl) {
            console.log(`✅ 確認為車壇新聞區文章: ${articleUrl.url}`);
        }
        
        // 驗證基本檢查通過
        expect(results.results.website_accessible).toBe(true);
        expect(results.results.news_article_loaded).toBe(true);
    }, 180000);
});

