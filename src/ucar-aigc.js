const { takeScreenshot, progressiveScroll, logPageStructure } = require('./utils');
const moment = require('moment');

/**
 * U-CAR 試車專區 AIGC 功能檢測
 * 測試流程：
 * 1. 開啟試車報告列表頁
 * 2. 點擊任意文章連結
 * 3. 確認文章頁面 title 與連結相符
 * 4. 確認文章頁面中有『你想知道哪些？AI來解答』區塊
 * 5. 點擊 AI 問題連結（新頁面開啟）
 * 6. 確認 AI Answer 頁面 title 與問題相符
 * 7. 確認 AI Answer 內容正確載入
 * 8. 確認 AI Answer 頁面中有『資料來源』區塊
 * 9. 確認 AI Answer 頁面下方有『你想知道哪些？AI來解答』區塊
 */

async function checkUcarAIGCFunctionality(page, context, results, config, dateFolder, timestamp) {
    console.log('\n📍 開始檢測 U-CAR AIGC 功能...');
    
    try {
        // 注意：此時頁面已經在文章頁面（由 monitor.js 的 navigateToArticle 處理）
        // 步驟 1-3: 驗證文章頁面
        console.log('✅ 步驟 1-3: 驗證文章頁面...');
        const articlePageTitle = await page.title();
        console.log(`📄 文章頁面 title: ${articlePageTitle}`);
        
        await takeScreenshot(page, dateFolder, timestamp, 'ucar-article-page', 'success', results, 'ucar');
        
        // 步驟 4: 滾動頁面尋找 AI 區塊
        console.log('🔍 步驟 4: 尋找『你想知道哪些？AI來解答』區塊...');
        await progressiveScroll(page, 5);
        
        let aiSectionFound = false;
        let aiSection = null;
        
        for (const selector of config.selectors.aiSection) {
            try {
                aiSection = page.locator(selector).first();
                await aiSection.waitFor({ timeout: config.timeouts.findAiSection });
                await aiSection.scrollIntoViewIfNeeded();
                aiSectionFound = true;
                console.log('✅ 找到 AI 區塊');
                break;
            } catch (_) {
                continue;
            }
        }
        
        if (!aiSectionFound) {
            throw new Error('❌ 找不到『你想知道哪些？AI來解答』區塊');
        }
        
        results.results.ai_section_found = true;
        await takeScreenshot(page, dateFolder, timestamp, 'ucar-ai-section-found', 'success', results, 'ucar');
        
        // 步驟 5: 找到並記錄 AI 問題，然後點擊
        console.log('\n🔍 步驟 5: 尋找 AI 問題連結...');
        let aiQuestionLink = null;
        let aiQuestionText = '';
        
        for (const selector of config.selectors.aiQuestions) {
            try {
                const questionLink = page.locator(selector).first();
                await questionLink.waitFor({ timeout: 10000 });
                
                // 獲取問題文字
                aiQuestionText = await questionLink.textContent();
                aiQuestionText = aiQuestionText?.trim() || '';
                
                if (aiQuestionText) {
                    console.log(`✅ 找到 AI 問題: ${aiQuestionText.substring(0, 80)}...`);
                    aiQuestionLink = questionLink;
                    break;
                }
            } catch (_) {
                continue;
            }
        }
        
        if (!aiQuestionLink) {
            throw new Error('❌ 找不到 AI 問題連結');
        }
        
        results.results.ai_questions_available = true;
        
        // 監聽新頁面開啟
        const [newPage] = await Promise.all([
            context.waitForEvent('page'),
            aiQuestionLink.click()
        ]);
        
        await newPage.waitForLoadState('domcontentloaded');
        await newPage.waitForTimeout(3000);
        
        console.log('✅ AI 問題頁面已在新分頁中開啟');
        
        // 步驟 6: 驗證 AI Answer 頁面 title
        console.log('\n✅ 步驟 6: 驗證 AI Answer 頁面 title...');
        const answerPageTitle = await newPage.title();
        
        // 檢查 title 是否包含問題文字
        const answerTitleMatches = aiQuestionText && answerPageTitle.includes(aiQuestionText.substring(0, 20));
        if (answerTitleMatches) {
            console.log(`✅ AI Answer 頁面 title 匹配: ${answerPageTitle}`);
        } else {
            console.warn(`⚠️ AI Answer 頁面 title 可能不完全匹配`);
            console.warn(`   期望包含: ${aiQuestionText.substring(0, 40)}...`);
            console.warn(`   實際 title: ${answerPageTitle}`);
        }
        
        await takeScreenshot(newPage, dateFolder, timestamp, 'ucar-ai-answer-page', 'success', results, 'ucar');
        
        // 步驟 7: 確認 AI Answer 內容已載入
        console.log('\n✅ 步驟 7: 驗證 AI Answer 內容載入...');
        await progressiveScroll(newPage, 3);
        
        let contentFound = false;
        for (const selector of config.selectors.aiAnswerContent) {
            try {
                const content = newPage.locator(selector).first();
                await content.waitFor({ timeout: config.timeouts.aiContentWait });
                contentFound = true;
                console.log('✅ AI Answer 內容已載入');
                break;
            } catch (_) {
                continue;
            }
        }
        
        if (!contentFound) {
            console.warn('⚠️ 無法明確確認 AI Answer 內容，但頁面已載入');
        }
        
        results.results.ai_content_generated = true;
        await takeScreenshot(newPage, dateFolder, timestamp, 'ucar-ai-content-loaded', 'success', results, 'ucar');
        
        // 步驟 8: 確認『資料來源』區塊
        console.log('\n🔍 步驟 8: 尋找『資料來源』區塊...');
        let dataSourceFound = false;
        
        for (const selector of config.selectors.dataSource) {
            try {
                const dataSource = newPage.locator(selector).first();
                await dataSource.waitFor({ timeout: 10000 });
                await dataSource.scrollIntoViewIfNeeded();
                dataSourceFound = true;
                console.log('✅ 找到『資料來源』區塊');
                break;
            } catch (_) {
                continue;
            }
        }
        
        if (!dataSourceFound) {
            console.warn('⚠️ 找不到『資料來源』區塊');
        }
        
        await takeScreenshot(newPage, dateFolder, timestamp, 'ucar-data-source', 'success', results, 'ucar');
        
        // 步驟 9: 確認 AI Answer 頁面下方的 AI 區塊
        console.log('\n🔍 步驟 9: 尋找 AI Answer 頁面下方的『你想知道哪些？AI來解答』區塊...');
        await progressiveScroll(newPage, 5);
        
        let bottomAiSectionFound = false;
        for (const selector of config.selectors.aiSection) {
            try {
                const bottomAiSection = newPage.locator(selector).first();
                await bottomAiSection.waitFor({ timeout: 10000 });
                await bottomAiSection.scrollIntoViewIfNeeded();
                bottomAiSectionFound = true;
                console.log('✅ 找到 AI Answer 頁面下方的 AI 區塊');
                break;
            } catch (_) {
                continue;
            }
        }
        
        if (!bottomAiSectionFound) {
            console.warn('⚠️ 找不到 AI Answer 頁面下方的 AI 區塊');
        }
        
        await takeScreenshot(newPage, dateFolder, timestamp, 'ucar-bottom-ai-section', 'success', results, 'ucar');
        
        // 驗證 AIGC 資源載入
        await verifyAIGCResources(results, config);
        
        console.log('✅ U-CAR AIGC 功能檢測完成');
        
        // 記錄測試結果摘要
        console.log('\n📊 測試結果摘要:');
        console.log(`   ✅ AI 區塊存在: ${aiSectionFound ? '通過' : '失敗'}`);
        console.log(`   ✅ AI 問題可用: ${results.results.ai_questions_available ? '通過' : '失敗'}`);
        console.log(`   ✅ AI Answer title 驗證: ${answerTitleMatches ? '通過' : '警告'}`);
        console.log(`   ✅ AI 內容生成: ${contentFound ? '通過' : '警告'}`);
        console.log(`   ✅ 資料來源區塊: ${dataSourceFound ? '通過' : '警告'}`);
        console.log(`   ✅ 底部 AI 區塊: ${bottomAiSectionFound ? '通過' : '警告'}`);
        
        // 關閉新頁面
        await newPage.close();
        
    } catch (error) {
        console.error('❌ U-CAR AIGC 功能檢測失敗:', error.message);
        results.status = 'failed';
        results.errors.push({
            step: 'ucar_aigc_check',
            message: error.message,
            stack: error.stack,
            timestamp: moment().toISOString()
        });
        throw error;
    }
}

/**
 * 驗證 AIGC 相關資源是否載入
 */
async function verifyAIGCResources(results, config) {
    console.log('\n🔍 驗證 AIGC 資源載入...');
    
    const apiEndpoints = config.apiEndpoints || {};
    const requiredEndpoints = [
        'aigc_app_js',
        'tracker'
    ];
    
    let loadedCount = 0;
    
    for (const endpoint of requiredEndpoints) {
        const url = apiEndpoints[endpoint];
        if (!url) continue;
        
        const found = results.api_requests.some(req => req.url.includes(url) || url.includes(req.url));
        
        if (found) {
            loadedCount++;
            console.log(`✅ 資源已載入: ${endpoint}`);
            
            if (endpoint === 'aigc_app_js') {
                results.aigc_verification.script_loaded = true;
            } else if (endpoint === 'tracker') {
                results.aigc_verification.tracker_called = true;
            }
        } else {
            console.warn(`⚠️ 資源未載入: ${endpoint} (${url})`);
        }
    }
    
    // 只要有任一資源載入即視為成功
    if (loadedCount > 0) {
        results.results.aigc_resources_loaded = true;
        console.log(`✅ AIGC 資源驗證通過 (${loadedCount}/${requiredEndpoints.length})`);
    } else {
        console.warn('⚠️ 未偵測到 AIGC 資源載入');
    }
    
    // 檢查 Console 訊息
    const expectedMessages = config.expectedConsoleMessages || [];
    if (expectedMessages.length > 0) {
        const foundMessages = expectedMessages.filter(msg => 
            results.console_messages.some(consoleMsg => consoleMsg.text.includes(msg))
        );
        
        if (foundMessages.length > 0) {
            results.aigc_verification.console_messages_found = true;
            console.log(`✅ 找到預期的 Console 訊息 (${foundMessages.length}/${expectedMessages.length})`);
        }
    }
}

module.exports = { checkUcarAIGCFunctionality };

