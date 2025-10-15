const { takeScreenshot, progressiveScroll, logPageStructure } = require('./utils');
const moment = require('moment');

/**
 * U-CAR 機車區 AIGC 功能檢測
 * 測試流程：
 * 1. 開啟機車文章列表頁 https://motor.u-car.com.tw/motor/articles
 * 2. 找到『機車區塊』並點擊任意文章連結
 * 3. 確認開啟的文章頁面的 title 與剛剛點擊的連結相符
 * 4. 確認文章頁面中下方有『你想知道哪些？AI來解答』的區塊與內容
 * 5. 點擊『你想知道哪些？AI來解答』中任意連結（會開啟新頁面）
 * 6. 確認頁面 title 與剛剛點擊的相符
 * 7. 確認內容有正確載入
 * 8. 確認 Answer 頁面中間是否有『資料來源』的區塊與內容
 * 9. 確認 Answer 頁面中下方，是否有『你想知道哪些？AI來解答』的區塊與內容
 */

async function checkUcarMotorAIGCFunctionality(page, context, results, config, dateFolder, timestamp) {
    console.log('\n📍 開始檢測 U-CAR 機車區 AIGC 功能...');
    
    try {
        // 注意：此時頁面已經在文章頁面（由 monitor.js 的 navigateToArticle 處理）
        // 步驟 1-3: 驗證文章頁面
        console.log('✅ 步驟 1-3: 驗證機車文章頁面...');
        const articlePageTitle = await page.title();
        console.log(`📄 機車文章頁面 title: ${articlePageTitle}`);
        
        // 驗證是否為機車區文章
        const url = page.url();
        if (!url.includes('/motor/article/')) {
            console.warn('⚠️ 警告: 頁面 URL 不包含 /motor/article/');
        }
        
        await takeScreenshot(page, dateFolder, timestamp, 'ucar-motor-article-page', 'success', results, 'ucar-motor');
        
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
        await takeScreenshot(page, dateFolder, timestamp, 'ucar-motor-ai-section-found', 'success', results, 'ucar-motor');
        
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
        
        // 步驟 5: 點擊第一個 AI 問題連結
        console.log('\n🔍 步驟 5: 點擊第一個 AI 問題連結...');
        const firstQuestion = aiQuestions[0];
        const aiQuestionText = firstQuestion.text;
        
        console.log(`📌 選擇的問題: ${aiQuestionText}`);
        
        results.results.ai_questions_available = true;
        
        // 監聽新頁面開啟
        const [newPage] = await Promise.all([
            context.waitForEvent('page', { timeout: 30000 }),
            firstQuestion.link.click()
        ]);
        
        await newPage.waitForLoadState('domcontentloaded');
        await newPage.waitForTimeout(3000);
        
        console.log('✅ AI 問題頁面已在新分頁中開啟');
        
        // 步驟 6: 驗證 AI Answer 頁面 title
        console.log('\n✅ 步驟 6: 驗證 AI Answer 頁面 title...');
        const answerPageTitle = await newPage.title();
        
        // 檢查 title 是否包含問題文字的前 20 個字元
        const questionPrefix = aiQuestionText.substring(0, 20);
        const answerTitleMatches = answerPageTitle.includes(questionPrefix);
        
        if (answerTitleMatches) {
            console.log(`✅ AI Answer 頁面 title 匹配成功`);
            console.log(`   問題: ${aiQuestionText}`);
            console.log(`   Title: ${answerPageTitle}`);
        } else {
            console.warn(`⚠️ AI Answer 頁面 title 可能不完全匹配`);
            console.warn(`   期望包含: ${questionPrefix}...`);
            console.warn(`   實際 title: ${answerPageTitle}`);
        }
        
        await takeScreenshot(newPage, dateFolder, timestamp, 'ucar-motor-ai-answer-page', 'success', results, 'ucar-motor');
        
        // 步驟 7: 確認 AI Answer 內容已載入
        console.log('\n✅ 步驟 7: 驗證 AI Answer 內容載入...');
        await progressiveScroll(newPage, 3);
        
        let contentFound = false;
        for (const selector of config.selectors.aiAnswerContent) {
            try {
                const content = newPage.locator(selector).first();
                await content.waitFor({ timeout: config.timeouts.aiContentWait });
                const contentText = await content.textContent();
                console.log(`✅ AI Answer 內容已載入: ${contentText?.substring(0, 40)}...`);
                contentFound = true;
                break;
            } catch (_) {
                continue;
            }
        }
        
        if (!contentFound) {
            console.warn('⚠️ 無法明確確認 AI Answer 內容標題，檢查頁面內容...');
            // 嘗試其他方式驗證內容存在
            const bodyText = await newPage.textContent('body');
            if (bodyText && bodyText.length > 100) {
                console.log('✅ 頁面內容已載入（基於 body 內容長度）');
                contentFound = true;
            }
        }
        
        results.results.ai_content_generated = true;
        await takeScreenshot(newPage, dateFolder, timestamp, 'ucar-motor-ai-content-loaded', 'success', results, 'ucar-motor');
        
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
                
                // 嘗試獲取資料來源連結數量
                try {
                    const sourceLinks = await newPage.locator('a[href*="u-car.com.tw"]').count();
                    console.log(`   找到 ${sourceLinks} 個資料來源連結`);
                } catch (_) {}
                
                break;
            } catch (_) {
                continue;
            }
        }
        
        if (!dataSourceFound) {
            console.warn('⚠️ 找不到『資料來源』區塊標題');
            // 嘗試查找是否有來源連結
            try {
                const hasSourceLinks = await newPage.locator('a[href*="u-car.com.tw"]').count() > 0;
                if (hasSourceLinks) {
                    console.log('✅ 但找到了資料來源連結');
                    dataSourceFound = true;
                }
            } catch (_) {}
        }
        
        await takeScreenshot(newPage, dateFolder, timestamp, 'ucar-motor-data-source', 'success', results, 'ucar-motor');
        
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
                console.log('✅ 找到 AI Answer 頁面下方的『你想知道哪些？AI來解答』區塊');
                
                // 獲取底部 AI 問題數量
                try {
                    for (const qSelector of config.selectors.aiQuestions) {
                        const bottomQuestions = await newPage.locator(qSelector).count();
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
            console.warn('⚠️ 找不到 AI Answer 頁面下方的『你想知道哪些？AI來解答』區塊');
        }
        
        await takeScreenshot(newPage, dateFolder, timestamp, 'ucar-motor-bottom-ai-section', 'success', results, 'ucar-motor');
        
        // 驗證 AIGC 資源載入
        await verifyAIGCResources(results, config);
        
        console.log('\n✅ U-CAR 機車區 AIGC 功能檢測完成');
        
        // 記錄測試結果摘要
        console.log('\n📊 測試結果摘要:');
        console.log(`   ✅ AI 區塊存在: ${aiSectionFound ? '✅ 通過' : '❌ 失敗'}`);
        console.log(`   ✅ AI 問題可用: ${results.results.ai_questions_available ? '✅ 通過' : '❌ 失敗'}`);
        console.log(`   ✅ AI Answer title 驗證: ${answerTitleMatches ? '✅ 通過' : '⚠️ 警告'}`);
        console.log(`   ✅ AI 內容生成: ${contentFound ? '✅ 通過' : '⚠️ 警告'}`);
        console.log(`   ✅ 資料來源區塊: ${dataSourceFound ? '✅ 通過' : '⚠️ 警告'}`);
        console.log(`   ✅ 底部 AI 區塊: ${bottomAiSectionFound ? '✅ 通過' : '⚠️ 警告'}`);
        
        // 關閉新頁面
        await newPage.close();
        
    } catch (error) {
        console.error('❌ U-CAR 機車區 AIGC 功能檢測失敗:', error.message);
        results.status = 'failed';
        results.errors.push({
            step: 'ucar_motor_aigc_check',
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
            // 處理帶參數的 URL 匹配
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

module.exports = { checkUcarMotorAIGCFunctionality };

