#!/usr/bin/env node

// 在載入任何模組之前設置環境變數
process.env.SITE_ID = 'cmoney';
process.env.BASE_URL = 'https://www.cmoney.tw/index.html';
process.env.DEBUG = 'true';

/**
 * AIGC Monitor CMoney 使用示例
 * 
 * 這個腳本展示了如何使用 AIGC Monitor 來監控 CMoney 站點的 AIGC 功能
 */

const AIGCMonitor = require('./src/monitor');

async function runCMoneyExample() {
    console.log('🚀 AIGC Monitor - CMoney 使用示例');
    console.log('==================================\n');
    
     try {
         console.log('📍 配置信息:');
         console.log(`   站點: ${process.env.SITE_ID}`);
         console.log(`   URL: ${process.env.BASE_URL}`);
         console.log(`   調試模式: ${process.env.DEBUG}\n`);
        
        // 創建監控實例
        const monitor = new AIGCMonitor();
        
        console.log('⏳ 開始執行 CMoney 監控...\n');
        
        // 執行監控
        const results = await monitor.run();
        
        console.log('\n✅ CMoney 監控執行完成!');
        console.log('========================\n');
        
        // 顯示結果摘要
        console.log('📊 結果摘要:');
        console.log(`   狀態: ${results.status}`);
        console.log(`   執行時間: ${results.performance.total_duration}ms`);
        console.log(`   頁面載入時間: ${results.performance.page_load_time}ms\n`);
        
        console.log('🔍 檢查項目:');
        const checks = results.results;
        console.log(`   ✅ 網站可訪問: ${checks.website_accessible ? '通過' : '失敗'}`);
        console.log(`   ✅ 文章載入: ${checks.news_article_loaded ? '通過' : '失敗'}`);
        console.log(`   ✅ AI 區塊: ${checks.ai_section_found ? '通過' : '失敗'}`);
        console.log(`   ✅ AI 問題: ${checks.ai_questions_available ? '通過' : '失敗'}`);
        console.log(`   ✅ AI 內容生成: ${checks.ai_content_generated ? '通過' : '失敗'}`);
        console.log(`   ✅ AIGC 資源: ${checks.aigc_resources_loaded ? '通過' : '失敗'}\n`);
        
        console.log('🌐 網路統計:');
        console.log(`   總請求數: ${results.api_requests.length}`);
        console.log(`   平均回應時間: ${results.performance.api_avg_response_ms || 'N/A'}ms\n`);
        
        console.log('📸 截圖數量:', results.screenshots.length);
        console.log('❌ 錯誤數量:', results.errors.length);
        
        if (results.errors.length > 0) {
            console.log('\n⚠️ 錯誤詳情:');
            results.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error.message}`);
            });
        }
        
        console.log('\n📁 CMoney 報告文件已保存到 reports/cmoney/ 目錄');
        console.log('   - HTML 報告: 包含完整的視覺化結果');
        console.log('   - JSON 報告: 機器可讀的詳細數據');
        console.log('   - 摘要報告: 簡潔的文字格式摘要');
        
        console.log('\n💡 CMoney 特別說明:');
        console.log('   - CMoney 的 AIGC 功能可能只在特定文章頁面出現');
        console.log('   - 如果在首頁未找到 AI 區塊，這是正常現象');
        console.log('   - 建議檢查具體的投資筆記頁面以驗證 AIGC 功能');
        
        // 根據結果設置退出碼
        process.exit(results.status === 'success' ? 0 : 1);
        
    } catch (error) {
        console.error('\n❌ CMoney 監控執行失敗:');
        console.error('   錯誤:', error.message);
        
        if (process.env.DEBUG === 'true') {
            console.error('   堆疊:', error.stack);
        }
        
        console.log('\n💡 CMoney 故障排除建議:');
        console.log('   1. 檢查 CMoney 網站是否可正常訪問');
        console.log('   2. 確認 CMoney 的頁面結構是否有變更');
        console.log('   3. 檢查配置文件 config.cmoney.json 中的選擇器');
        console.log('   4. 嘗試訪問具體的投資筆記頁面');
        console.log('   5. 啟用調試模式: DEBUG=true node example-cmoney.js');
        
        process.exit(1);
    }
}

// 如果直接執行此文件
if (require.main === module) {
    runCMoneyExample();
}

module.exports = runCMoneyExample;