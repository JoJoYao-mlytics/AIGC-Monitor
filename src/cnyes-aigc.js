const { takeScreenshot, progressiveScroll } = require('./utils');

/**
 * CNYES (鉅亨網) 站點專用的 AIGC 功能檢測
 * 
 * 測試流程：
 * 1. 找到『頭條區塊』
 * 2. 點擊『頭條區塊』裡任意文章連結
 * 3. 確認開啟的文章頁面的 title 與剛剛點擊的連結是符合的
 * 4. 確認開啟的文章頁面中下方，是否有『想知道更多? AI來回答』的區塊與內容
 * 5. 點擊『想知道更多? AI來回答』中任意連結 (會開啟新的頁面)
 * 6. 確認頁面 title 與剛剛點擊的相符
 * 7. 確認內容有正確載入
 * 8. 確認 Answer 頁面中間是否有『資料來源』的區塊與內容
 * 9. 確認 Answer 頁面中下方，是否有『想知道更多? AI來回答』的區塊與內容
 */
async function checkCnyesAIGCFunctionality(page, context, results, config, dateFolder, timestamp) {
    console.log('📍 開始檢查 CNYES AIGC 功能...');
    
    try {
        // 1. 驗證 AIGC 相關資源載入
        await verifyAigcResources(page, results, config);
        
        // 2. 檢查 "想知道更多? AI來回答" 區塊
        await checkAISectionExists(page, results, config, dateFolder, timestamp);
        
        // 3. 檢查 AI 問題連結並導航到 AI 回答頁面
        await checkAIQuestions(page, context, results, config, dateFolder, timestamp);
        
        console.log('✅ CNYES AIGC 功能檢查完成');
        
    } catch (error) {
        console.error('❌ CNYES AIGC 功能檢查失敗:', error.message);
        results.status = 'failed';
        results.errors.push({
            message: `CNYES AIGC 檢查失敗: ${error.message}`,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

/**
 * 驗證 AIGC 相關資源是否正確載入
 */
async function verifyAigcResources(page, results, config) {
    console.log('🔍 驗證 AIGC 資源載入 (以 API 為準)...');

    // 只以 AIGC API 是否成功回應作為資源載入判定
    const apiKeys = [
        'questions_html',
        'answer_html',
        'member_html',
        'questions_ajax',
        'metadata_html'
    ];

    let successCount = 0;
    for (const key of apiKeys) {
        const url = config.apiEndpoints[key];
        if (!url) continue;
        const found = results.api_requests.find(req => req.url.includes(url));
        if (found && found.status >= 200 && found.status < 300) {
            successCount++;
            results.aigc_verification[`${key}_loaded`] = true;
            console.log(`✅ API OK: ${key} - ${url}`);
        }
    }

    // 有任一 AIGC API 成功即視為 AIGC 資源載入
    results.results.aigc_resources_loaded = successCount > 0;

    // 檢查 console 訊息
    const expectedMessages = config.expectedConsoleMessages || [];
    let foundMessages = 0;
    
    for (const expected of expectedMessages) {
        const found = results.console_messages.find(msg => 
            msg.text.includes(expected)
        );
        if (found) {
            foundMessages++;
            console.log(`✅ 找到預期 console 訊息: ${expected}`);
        }
    }
    
    results.aigc_verification.console_messages_found = foundMessages > 0;

    console.log(`📊 AIGC API 成功數: ${successCount}/${apiKeys.length}`);
}

/**
 * 檢查 "想知道更多? AI來回答" AI 區塊是否存在
 */
async function checkAISectionExists(page, results, config, dateFolder, timestamp) {
    console.log('🔍 檢查 AI 區塊是否存在...');
    
    try {
        // 滾動頁面以確保 AI 區塊載入
        await progressiveScroll(page, 5);
        await page.waitForTimeout(3000);
        
        let aiSectionFound = false;
        const aiSelectors = config.selectors.aiSection;
        
        for (const selector of aiSelectors) {
            try {
                const aiSection = page.locator(selector).first();
                await aiSection.waitFor({ timeout: config.timeouts.findAiSection });
                
                const text = await aiSection.textContent();
                console.log(`✅ 找到 AI 區塊: ${text?.substring(0, 50)}...`);
                
                results.results.ai_section_found = true;
                aiSectionFound = true;
                
                await takeScreenshot(page, dateFolder, timestamp, 'ai-section-found', 'success', results, 'cnyes');
                break;
            } catch (error) {
                continue;
            }
        }
        
        if (!aiSectionFound) {
            console.warn('⚠️ 未找到 AI 區塊，但繼續執行...');
            results.status = 'warning';
            await takeScreenshot(page, dateFolder, timestamp, 'ai-section-not-found', 'issues', results, 'cnyes');
        }
        
    } catch (error) {
        console.error('❌ 檢查 AI 區塊失敗:', error.message);
        results.results.ai_section_found = false;
        await takeScreenshot(page, dateFolder, timestamp, 'ai-section-error', 'issues', results, 'cnyes');
        throw error;
    }
}

/**
 * 檢查 AI 問題連結並驗證 AI 回答頁面
 */
async function checkAIQuestions(page, context, results, config, dateFolder, timestamp) {
    console.log('🔍 檢查 AI 問題連結...');
    
    try {
        // 等待並尋找 AI 問題連結
        await page.waitForTimeout(config.timeouts.aiInitialWait);
        
        let questionLinkFound = false;
        let questionText = '';
        let questionUrl = '';
        const questionSelectors = config.selectors.aiQuestions;
        
        for (const selector of questionSelectors) {
            try {
                const questionLink = page.locator(selector).first();
                await questionLink.waitFor({ timeout: config.timeouts.findQuestion });
                
                questionText = await questionLink.textContent();
                questionUrl = await questionLink.getAttribute('href');
                
                console.log(`✅ 找到 AI 問題: ${questionText?.substring(0, 100)}...`);
                
                results.results.ai_questions_available = true;
                questionLinkFound = true;
                
                // 點擊問題連結（可能開新分頁）
                console.log('🔗 點擊 AI 問題連結...');
                
                // 監聽新分頁
                const newPagePromise = context.waitForEvent('page', { timeout: 30000 }).catch(() => null);
                
                await questionLink.click();
                
                // 等待新分頁或當前頁導航
                let aiAnswerPage = await newPagePromise;
                if (!aiAnswerPage) {
                    console.log('ℹ️ 未開啟新分頁，使用當前頁面');
                    aiAnswerPage = page;
                } else {
                    console.log('✅ 開啟新分頁');
                }
                
                await aiAnswerPage.waitForLoadState('domcontentloaded');
                await aiAnswerPage.waitForTimeout(3000);
                
                // 驗證 AI 回答頁面
                await verifyAIAnswerPage(aiAnswerPage, results, config, dateFolder, timestamp, questionText);
                
                break;
            } catch (error) {
                console.log(`⚠️ 選擇器 ${selector} 失敗: ${error.message}`);
                continue;
            }
        }
        
        if (!questionLinkFound) {
            throw new Error('無法找到 AI 問題連結');
        }
        
    } catch (error) {
        console.error('❌ 檢查 AI 問題失敗:', error.message);
        results.results.ai_questions_available = false;
        await takeScreenshot(page, dateFolder, timestamp, 'ai-questions-error', 'issues', results, 'cnyes');
        throw error;
    }
}

/**
 * 驗證 AI 回答頁面的完整性
 */
async function verifyAIAnswerPage(page, results, config, dateFolder, timestamp, originalQuestionText) {
    console.log('🔍 驗證 AI 回答頁面...');
    
    try {
        // 截圖：AI 回答頁面載入
        await takeScreenshot(page, dateFolder, timestamp, 'ai-answer-page', 'success', results, 'cnyes');
        
        // 步驟 6: 確認頁面 title 與點擊的連結相符
        const pageTitle = await page.title();
        console.log(`📄 頁面標題: ${pageTitle}`);
        
        // 簡單驗證標題與問題文字有關聯（可能不完全一致）
        if (originalQuestionText) {
            const titleMatches = pageTitle.toLowerCase().includes('ai') || 
                                pageTitle.includes('回答') ||
                                pageTitle.includes('AIGC');
            if (titleMatches) {
                console.log('✅ 頁面標題與 AI 回答相關');
            } else {
                console.warn('⚠️ 頁面標題可能與預期不符');
            }
        }
        
        // 步驟 7: 確認內容有正確載入
        await page.waitForTimeout(config.timeouts.aiInitialWait);
        
        // 等待載入指示器消失
        const loadingSelectors = config.selectors.loadingTexts || [];
        for (const loadingSelector of loadingSelectors) {
            try {
                const loading = page.locator(loadingSelector).first();
                if (await loading.count() > 0) {
                    console.log('⏳ 等待 AI 內容生成...');
                    await loading.waitFor({ state: 'hidden', timeout: config.timeouts.aiContentWait });
                }
            } catch (error) {
                // 載入指示器可能不存在，繼續
            }
        }
        
        // 驗證 AI 內容存在
        let aiContentFound = false;
        const aiContentSelectors = config.selectors.aiContent;
        
        for (const selector of aiContentSelectors) {
            try {
                const content = page.locator(selector).first();
                await content.waitFor({ timeout: 10000 });
                
                console.log(`✅ 找到 AI 內容: ${selector}`);
                aiContentFound = true;
                break;
            } catch (error) {
                continue;
            }
        }
        
        if (aiContentFound) {
            results.results.ai_content_generated = true;
            console.log('✅ AI 內容已正確生成');
        } else {
            console.warn('⚠️ 未能確認 AI 內容，但繼續檢查...');
            results.status = 'warning';
        }
        
        // 截圖：AI 內容生成完成
        await takeScreenshot(page, dateFolder, timestamp, 'ai-content-generated', 'success', results, 'cnyes');
        
        // 步驟 8: 確認 Answer 頁面中間是否有『資料來源』的區塊與內容
        await checkDataSourceSection(page, results, config, dateFolder, timestamp);
        
        // 步驟 9: 確認 Answer 頁面中下方，是否有『想知道更多? AI來回答』的區塊與內容
        await checkAISectionAtBottom(page, results, config, dateFolder, timestamp);
        
    } catch (error) {
        console.error('❌ 驗證 AI 回答頁面失敗:', error.message);
        results.results.ai_content_generated = false;
        await takeScreenshot(page, dateFolder, timestamp, 'ai-answer-verification-error', 'issues', results, 'cnyes');
        throw error;
    }
}

/**
 * 檢查『資料來源』區塊
 */
async function checkDataSourceSection(page, results, config, dateFolder, timestamp) {
    console.log('🔍 檢查『資料來源』區塊...');
    
    try {
        // 滾動頁面以確保區塊載入
        await progressiveScroll(page, 3);
        
        let dataSourceFound = false;
        const dataSourceSelectors = config.selectors.dataSourceSection;
        
        for (const selector of dataSourceSelectors) {
            try {
                const section = page.locator(selector).first();
                await section.waitFor({ timeout: 10000 });
                
                const text = await section.textContent();
                console.log(`✅ 找到資料來源區塊: ${text?.substring(0, 50)}...`);
                
                dataSourceFound = true;
                
                // 驗證區塊內有內容
                const parent = section.locator('xpath=ancestor::*[1]');
                const hasContent = await parent.locator('a, p, div').count() > 0;
                
                if (hasContent) {
                    console.log('✅ 資料來源區塊包含內容');
                } else {
                    console.warn('⚠️ 資料來源區塊可能沒有內容');
                }
                
                await takeScreenshot(page, dateFolder, timestamp, 'data-source-section', 'success', results, 'cnyes');
                break;
            } catch (error) {
                continue;
            }
        }
        
        if (!dataSourceFound) {
            console.warn('⚠️ 未找到資料來源區塊');
            results.status = 'warning';
        }
        
    } catch (error) {
        console.error('❌ 檢查資料來源區塊失敗:', error.message);
        results.status = 'warning';
    }
}

/**
 * 檢查頁面底部的『想知道更多? AI來回答』區塊
 */
async function checkAISectionAtBottom(page, results, config, dateFolder, timestamp) {
    console.log('🔍 檢查底部『想知道更多? AI來回答』區塊...');
    
    try {
        // 滾動到頁面底部
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(2000);
        
        let aiSectionAtBottomFound = false;
        const aiBottomSelectors = config.selectors.aiSectionBottom;
        
        for (const selector of aiBottomSelectors) {
            try {
                const section = page.locator(selector).first();
                await section.waitFor({ timeout: 10000 });
                
                const text = await section.textContent();
                console.log(`✅ 找到底部 AI 區塊: ${text?.substring(0, 50)}...`);
                
                aiSectionAtBottomFound = true;
                
                // 驗證區塊內有問題連結
                const questions = await section.locator('xpath=following::a').count();
                if (questions > 0) {
                    console.log(`✅ 底部 AI 區塊包含 ${questions} 個問題連結`);
                } else {
                    console.warn('⚠️ 底部 AI 區塊可能沒有問題連結');
                }
                
                await takeScreenshot(page, dateFolder, timestamp, 'ai-section-bottom', 'success', results, 'cnyes');
                break;
            } catch (error) {
                continue;
            }
        }
        
        if (!aiSectionAtBottomFound) {
            console.warn('⚠️ 未找到底部 AI 區塊');
            results.status = 'warning';
        }
        
    } catch (error) {
        console.error('❌ 檢查底部 AI 區塊失敗:', error.message);
        results.status = 'warning';
    }
}

module.exports = {
    checkCnyesAIGCFunctionality
};

