/**
 * U-CAR AM (售後市場) AIGC 監控範例
 *
 * 執行方式：
 * node example-ucar-am.js
 *
 * 或使用環境變數：
 * SITE_ID=ucar-am BASE_URL=https://am.u-car.com.tw/am DEBUG=true node example-ucar-am.js
 */

const AIGCMonitor = require('./src/monitor');

// 設置環境變數
process.env.SITE_ID = 'ucar-am';
process.env.BASE_URL = process.env.BASE_URL || 'https://am.u-car.com.tw/am';
process.env.DEBUG = process.env.DEBUG || 'true'; // 開啟 debug 模式以查看瀏覽器

async function main() {
    console.log('='.repeat(80));
    console.log('🔧  U-CAR AM (售後市場) AIGC 功能監控範例');
    console.log('='.repeat(80));
    console.log();

    const monitor = new AIGCMonitor();

    try {
        console.log('🚀 開始監控 U-CAR AM (售後市場) AIGC 功能...');
        console.log(`📍 目標網站: ${process.env.BASE_URL}`);
        console.log(`🔍 Debug 模式: ${process.env.DEBUG === 'true' ? '開啟' : '關閉'}`);
        console.log();

        const startTime = Date.now();
        const results = await monitor.run();
        const duration = Date.now() - startTime;

        console.log();
        console.log('='.repeat(80));
        console.log('📊 監控結果摘要');
        console.log('='.repeat(80));
        console.log();

        // 顯示執行狀態
        console.log(`✅ 執行狀態: ${results.status.toUpperCase()}`);
        console.log(`⏱️  總執行時間: ${(duration / 1000).toFixed(2)} 秒`);
        console.log(`📍 站點: ${results.site}`);
        console.log(`🌐 URL: ${results.baseUrl}`);
        console.log();

        // 顯示各項檢查結果
        console.log('📋 檢查項目:');
        console.log(`  ${results.results.website_accessible ? '✅' : '❌'} 網站可訪問性`);
        console.log(`  ${results.results.news_article_loaded ? '✅' : '❌'} 售後市場文章載入`);
        console.log(`  ${results.results.ai_section_found ? '✅' : '❌'} AI 區塊存在`);
        console.log(`  ${results.results.ai_questions_available ? '✅' : '❌'} AI 問題可用`);
        console.log(`  ${results.results.ai_content_generated ? '✅' : '❌'} AI 內容生成`);
        console.log(`  ${results.results.aigc_resources_loaded ? '✅' : '⚠️'} AIGC 資源載入`);
        console.log();

        // 顯示 AIGC 驗證詳情
        console.log('🔍 AIGC 驗證詳情:');
        if (results.aigc_verification.script_loaded) {
            console.log('  ✅ JavaScript 腳本已載入');
        }
        if (results.aigc_verification.tracker_called) {
            console.log('  ✅ 追蹤器 API 已呼叫');
        }
        if (results.aigc_verification.console_messages_found) {
            console.log('  ✅ Console 訊息已找到');
        }
        console.log();

        // 顯示性能統計
        console.log('⚡ 性能統計:');
        console.log(`  • 頁面載入時間: ${results.performance.page_load_time}ms`);
        if (results.performance.ai_generation_time) {
            console.log(`  • AI 生成時間: ${results.performance.ai_generation_time}ms`);
        }
        if (results.performance.api_avg_response_ms) {
            console.log(`  • API 平均響應時間: ${results.performance.api_avg_response_ms}ms`);
            console.log(`  • API 最大響應時間: ${results.performance.api_max_response_ms}ms`);
            console.log(`  • API 最小響應時間: ${results.performance.api_min_response_ms}ms`);
        }
        console.log(`  • API 總請求數: ${results.api_requests.length}`);
        console.log();

        // 顯示 AIGC API 請求
        const aigcRequests = results.api_requests.filter(req =>
            req.url.includes('api.aigc.mlytics.com') ||
            req.url.includes('aigc.u-car.com.tw') ||
            req.url.includes('tags-assets.mlytics.com')
        );
        if (aigcRequests.length > 0) {
            console.log('📡 AIGC API 請求:');
            aigcRequests.forEach(req => {
                const status = req.status >= 200 && req.status < 300 ? '✅' : '❌';
                console.log(`  ${status} ${req.method} ${req.url.split('?')[0]}`);
                console.log(`     狀態: ${req.status} | 響應時間: ${req.responseTimeMs}ms`);
            });
            console.log();
        }

        // 顯示截圖資訊
        if (results.screenshots.length > 0) {
            console.log(`📸 已生成 ${results.screenshots.length} 張截圖`);
            console.log(`   儲存位置: reports/ucar-am/${results.timestamp.split('T')[0]}/`);
            console.log();
        }

        // 顯示錯誤（如有）
        if (results.errors.length > 0) {
            console.log('⚠️ 錯誤訊息:');
            results.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. [${error.step || 'unknown'}] ${error.message}`);
            });
            console.log();
        }

        // 顯示 Console 訊息摘要
        const errorMessages = results.console_messages.filter(msg => msg.type === 'error');
        const warningMessages = results.console_messages.filter(msg => msg.type === 'warning');
        if (errorMessages.length > 0 || warningMessages.length > 0) {
            console.log('📝 Console 訊息摘要:');
            if (errorMessages.length > 0) {
                console.log(`  ❌ 錯誤訊息: ${errorMessages.length} 則`);
            }
            if (warningMessages.length > 0) {
                console.log(`  ⚠️  警告訊息: ${warningMessages.length} 則`);
            }
            console.log();
        }

        // 顯示報告位置
        console.log('='.repeat(80));
        console.log('📄 完整報告已儲存:');
        const timestamp = results.timestamp.split('T')[1].split('.')[0].replace(/:/g, '-');
        const date = results.timestamp.split('T')[0];
        console.log(`   • JSON: reports/ucar-am/${date}/ucar-am-${timestamp}-results.json`);
        console.log(`   • HTML: reports/ucar-am/${date}/ucar-am-${timestamp}-report.html`);
        console.log('='.repeat(80));
        console.log();

        // 根據狀態返回不同的退出碼
        if (results.status === 'failed') {
            console.log('❌ 監控失敗');
            process.exit(1);
        } else if (results.status === 'warning') {
            console.log('⚠️ 監控完成，但有警告');
            process.exit(0);
        } else {
            console.log('✅ 監控成功完成');
            process.exit(0);
        }

    } catch (error) {
        console.error();
        console.error('='.repeat(80));
        console.error('❌ 監控執行失敗');
        console.error('='.repeat(80));
        console.error();
        console.error('錯誤訊息:', error.message);
        console.error();
        console.error('堆疊追蹤:');
        console.error(error.stack);
        console.error();
        process.exit(1);
    }
}

main();

