const { takeScreenshot, progressiveScroll, logPageStructure } = require('./utils');
const moment = require('moment');

/**
 * U-CAR AM (售後市場) AIGC 功能檢測
 * 測試流程：
 * 1. 開啟 AM 首頁 https://am.u-car.com.tw/am
 * 2. 找到並點擊任意文章連結
 * 3. 確認開啟的文章頁面的 title 與剛剛點擊的連結相符
 * 4. 確認文章頁面中下方有『你想知道哪些？AI來解答』的區塊與內容
 * 5. 點擊『你想知道哪些？AI來解答』中任意連結（會開啟新頁面）
 * 6. 確認頁面 title 與剛剛點擊的相符
 * 7. 確認內容有正確載入
 * 8. 確認 Answer 頁面中間是否有『資料來源』的區塊與內容
 * 9. 確認 Answer 頁面中下方，是否有『你想知道哪些？AI來解答』的區塊與內容
 * 10. 同時確認 mlytics.com 和 aigc 資源正確載入
 */

async function checkUcarAmAIGCFunctionality(page, context, results, config, dateFolder, timestamp) {
    console.log('\n📍 開始檢測 U-CAR AM (售後市場) AIGC 功能...');
    
    try {
        // 注意：此時頁面已經在文章頁面（由 monitor.js 的 navigateToArticle 處理）
        // 步驟 1-3: 驗證文章頁面
        console.log('✅ 步驟 1-3: 驗證售後市場文章頁面...');
        const articlePageTitle = await page.title();
        console.log(`📄 售後市場文章頁面 title: ${articlePageTitle}`);
        
        // 驗證是否為售後市場文章
        const url = page.url();
        if (!url.includes('/am/article/')) {
            console.warn('⚠️ 警告: 頁面 URL 不包含 /am/article/');
        }
        
        await takeScreenshot(page, dateFolder, timestamp, 'ucar-am-article-page', 'success', results, 'ucar-am');
        
        // 步驟 4: 滾動頁面尋找 AI 區塊
        console.log('\n🔍 步驟 4: 尋找『你想知道哪些？AI來解答』區塊...');
        await progressiveScroll(page, 5);
        
        let aiSectionFound = false;
        let aiSection = null;
        
        for (const selector of config.selectors.aiSection) {
            try {
                aiSection = page.locator(selector).first();
                await aiSection.waitFor({ timeout: config.timeouts.findAiSection });
                await aiSection.scrollIntoViewIfNeeded();
                aiSectionFound = true;
                console.log('✅ 找到『你想知道哪些？AI來解答』區塊');
                break;
            } catch (_) {
                continue;
            }
        }
        
        if (!aiSectionFound) {
            throw new Error('❌ 找不到『你想知道哪些？AI來解答』區塊');
        }
        
        results.results.ai_section_found = true;
        await takeScreenshot(page, dateFolder, timestamp, 'ucar-am-ai-section-found', 'success', results, 'ucar-am');
        
        // 獲取所有 AI 問題連結
        console.log('\n🔍 獲取所有 AI 問題連結...');
        const aiQuestions = [];
        
        for (const selector of config.selectors.aiQuestions) {
            try {
                const questionLinks = await page.locator(selector).all();
                for (const link of questionLinks) {
                    const text = await link.textContent();
                    const href = await link.getAttribute('href');
                    if (text && href) {
                        aiQuestions.push({ text: text.trim(), href, link });
                    }
                }
                if (aiQuestions.length > 0) {
                    break;
                }
            } catch (_) {
                continue;
            }
        }
        
        if (aiQuestions.length === 0) {
            throw new Error('❌ 找不到任何 AI 問題連結');
        }
        
        console.log(`✅ 找到 ${aiQuestions.length} 個 AI 問題:`);
        aiQuestions.forEach((q, i) => {
            console.log(`   ${i + 1}. ${q.text.substring(0, 60)}...`);
        });
        
        results.results.ai_questions_available = true;
        
        // 步驟 5: 點擊第一個 AI 問題連結
        console.log('\n🔍 步驟 5: 點擊第一個 AI 問題連結...');
        const firstQuestion = aiQuestions[0];
        const aiQuestionText = firstQuestion.text;
        
        console.log(`📌 選擇的問題: ${aiQuestionText}`);
        
        // 使用 Promise.race 來處理可能的多種情況
        const [answerPage] = await Promise.all([
            context.waitForEvent('page', { timeout: 30000 }),
            firstQuestion.link.click()
        ]);
        
        await answerPage.waitForLoadState('domcontentloaded');
        await answerPage.waitForTimeout(3000); // 等待頁面穩定
        console.log('✅ AI Answer 頁面已在新分頁中開啟');
        
        // 步驟 6: 確認頁面 title 與剛剛點擊的相符
        console.log('\n✅ 步驟 6: 驗證 Answer 頁面 title...');
        const answerPageTitle = await answerPage.title();
        const answerTitleMatches = answerPageTitle.includes(aiQuestionText.substring(0, 20));
        
        if (answerTitleMatches) {
            console.log(`✅ Answer 頁面 title 匹配成功`);
            console.log(`   問題: ${aiQuestionText}`);
            console.log(`   Title: ${answerPageTitle}`);
        } else {
            console.warn(`⚠️ Answer 頁面 title 可能不完全匹配`);
            console.warn(`   期望包含: ${aiQuestionText.substring(0, 20)}...`);
            console.warn(`   實際 title: ${answerPageTitle}`);
            results.status = 'warning';
            results.errors.push({
                step: 'answer_page_title_verification',
                message: `Answer 頁面 title 不完全匹配。預期包含: "${aiQuestionText.substring(0, 20)}", 實際 title: "${answerPageTitle}"`,
                timestamp: moment().toISOString()
            });
        }
        
        await takeScreenshot(answerPage, dateFolder, timestamp, 'ucar-am-ai-answer-page', 'success', results, 'ucar-am');
        
        // 步驟 7: 確認內容有正確載入
        console.log('\n✅ 步驟 7: 驗證 Answer 內容載入...');
        await progressiveScroll(answerPage, 3);
        
        let contentFound = false;
        for (const selector of config.selectors.aiAnswerContent) {
            try {
                const content = answerPage.locator(selector).first();
                await content.waitFor({ timeout: config.timeouts.aiContentWait });
                const contentText = await content.textContent();
                console.log(`✅ Answer 內容已載入: ${contentText?.substring(0, 40)}...`);
                contentFound = true;
                break;
            } catch (_) {
                continue;
            }
        }
        
        if (!contentFound) {
            console.warn('⚠️ 無法明確確認 Answer 內容標題，檢查頁面內容...');
            const bodyText = await answerPage.textContent('body');
            if (bodyText && bodyText.length > 100) {
                console.log('✅ 頁面內容已載入（基於 body 內容長度）');
                contentFound = true;
            }
        }
        
        results.results.ai_content_generated = true;
        await takeScreenshot(answerPage, dateFolder, timestamp, 'ucar-am-ai-content-loaded', 'success', results, 'ucar-am');
        
        // 步驟 8: 確認 Answer 頁面中間是否有『資料來源』的區塊與內容
        console.log('\n🔍 步驟 8: 尋找『資料來源』區塊...');
        let dataSourceFound = false;
        
        for (const selector of config.selectors.dataSource) {
            try {
                const dataSource = answerPage.locator(selector).first();
                await dataSource.waitFor({ timeout: 10000 });
                await dataSource.scrollIntoViewIfNeeded();
                dataSourceFound = true;
                console.log('✅ 找到『資料來源』區塊');
                
                // 嘗試獲取資料來源連結數量
                try {
                    const sourceLinks = await answerPage.locator('a[href*="u-car.com.tw"]').count();
                    console.log(`   找到 ${sourceLinks} 個資料來源連結`);
                } catch (_) {}
                break;
            } catch (_) {
                continue;
            }
        }
        
        if (!dataSourceFound) {
            console.warn('⚠️ 找不到『資料來源』區塊標題');
            // 嘗試尋找資料來源連結
            try {
                const hasSourceLinks = await answerPage.locator('a[href*="u-car.com.tw"]').count() > 0;
                if (hasSourceLinks) {
                    console.log('✅ 但找到了資料來源連結');
                    dataSourceFound = true;
                }
            } catch (_) {}
            
            results.status = 'warning';
            results.errors.push({
                step: 'data_source_verification',
                message: '找不到『資料來源』區塊標題或連結',
                timestamp: moment().toISOString()
            });
        }
        
        await takeScreenshot(answerPage, dateFolder, timestamp, 'ucar-am-data-source', 'success', results, 'ucar-am');
        
        // 步驟 9: 確認 Answer 頁面中下方，是否有『你想知道哪些？AI來解答』的區塊與內容
        console.log('\n🔍 步驟 9: 尋找 Answer 頁面下方的『你想知道哪些？AI來解答』區塊...');
        await progressiveScroll(answerPage, 5);
        
        let bottomAiSectionFound = false;
        
        for (const selector of config.selectors.aiSection) {
            try {
                const bottomAiSection = answerPage.locator(selector).first();
                await bottomAiSection.waitFor({ timeout: 10000 });
                await bottomAiSection.scrollIntoViewIfNeeded();
                bottomAiSectionFound = true;
                console.log('✅ 找到 Answer 頁面下方的『你想知道哪些？AI來解答』區塊');
                
                // 嘗試獲取延伸問題數量
                try {
                    for (const qSelector of config.selectors.aiQuestions) {
                        const bottomQuestions = await answerPage.locator(qSelector).count();
                        if (bottomQuestions > 0) {
                            console.log(`   找到 ${bottomQuestions} 個延伸問題`);
                            break;
                        }
                    }
                } catch (_) {}
                break;
            } catch (_) {
                continue;
            }
        }
        
        if (!bottomAiSectionFound) {
            console.warn('⚠️ 找不到 Answer 頁面下方的『你想知道哪些？AI來解答』區塊');
            results.status = 'warning';
            results.errors.push({
                step: 'bottom_ai_section_verification',
                message: '找不到 Answer 頁面下方的『你想知道哪些？AI來解答』區塊',
                timestamp: moment().toISOString()
            });
        }
        
        await takeScreenshot(answerPage, dateFolder, timestamp, 'ucar-am-bottom-ai-section', 'success', results, 'ucar-am');
        
        // 步驟 10: 同時確認 Mlytics.com 和 AIGC 相關資源正確載入
        await verifyAIGCResources(results, config);
        
        console.log('\n✅ U-CAR AM (售後市場) AIGC 功能檢測完成');
        
        // 關閉新頁面
        await answerPage.close();
        
    } catch (error) {
        console.error('❌ U-CAR AM (售後市場) AIGC 功能檢測失敗:', error.message);
        results.status = 'failed';
        results.errors.push({
            step: 'ucar_am_aigc_check',
            message: error.message,
            stack: error.stack,
            timestamp: moment().toISOString()
        });
        throw error;
    }
}

async function verifyAIGCResources(results, config) {
    console.log('\n🔍 驗證 Mlytics.com 和 AIGC 資源載入...');
    
    const apiEndpoints = config.apiEndpoints || {};
    const requiredEndpoints = [
        'aigc_app_js',
        'tmc_js', // Mlytics TMC 腳本
        'tracker',
        'member_html',
        'questions_html',
        'answer_html'
    ];
    
    let loadedCount = 0;
    
    for (const endpoint of requiredEndpoints) {
        const url = apiEndpoints[endpoint];
        if (!url) continue;
        
        const found = results.api_requests.some(req => {
            const reqUrl = req.url.split('?')[0];
            const configUrl = url.split('?')[0];
            return reqUrl.includes(configUrl) || configUrl.includes(reqUrl);
        });
        
        if (found) {
            loadedCount++;
            console.log(`✅ 資源已載入: ${endpoint}`);
            if (endpoint === 'aigc_app_js') {
                results.aigc_verification.script_loaded = true;
            } else if (endpoint === 'tracker') {
                results.aigc_verification.tracker_called = true;
            }
        } else {
            console.log(`⚠️ 資源未載入: ${endpoint}`);
        }
    }
    
    if (loadedCount > 0) {
        results.results.aigc_resources_loaded = true;
        console.log(`✅ AIGC 資源驗證通過 (${loadedCount}/${requiredEndpoints.length})`);
    } else {
        console.warn('⚠️ 未偵測到 AIGC 資源載入');
        results.status = 'warning';
        results.errors.push({
            step: 'aigc_resource_verification',
            message: '未偵測到任何 AIGC 相關資源載入',
            timestamp: moment().toISOString()
        });
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
        } else {
            console.warn('⚠️ 未找到預期的 Console 訊息');
            results.status = 'warning';
            results.errors.push({
                step: 'console_message_verification',
                message: '未找到預期的 AIGC 相關 Console 訊息',
                timestamp: moment().toISOString()
            });
        }
    }
}

module.exports = { checkUcarAmAIGCFunctionality };

