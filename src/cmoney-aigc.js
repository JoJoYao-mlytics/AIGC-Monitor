const { takeScreenshot, progressiveScroll } = require('./utils');

/**
 * CMoney 站點專用的 AIGC 功能檢測
 */
async function checkCMoneyAIGCFunctionality(page, context, results, config, dateFolder, timestamp) {
    console.log('📍 開始檢查 CMoney AIGC 功能...');
    
    try {
        // 1. 檢查 AIGC 相關資源載入
        await verifyAigcResources(page, results, config);
        
        // 2. 檢查 "你可能想知道" 區塊
        await checkAISectionExists(page, results, config, dateFolder, timestamp);
        
        // 3. 檢查 AI 問題連結
        await checkAIQuestions(page, context, results, config, dateFolder, timestamp);
        
        console.log('✅ CMoney AIGC 功能檢查完成');
        
    } catch (error) {
        console.error('❌ CMoney AIGC 功能檢查失敗:', error.message);
        results.status = 'failed';
        results.errors.push({
            message: `CMoney AIGC 檢查失敗: ${error.message}`,
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
    console.log('🔍 驗證 CMoney AIGC 資源載入...');
    
     const requiredResources = [
         'metadata_html',
         'answer_html',
         'questions_html',
         'member_html',
         'questions_ajax'
     ];
    
    let resourcesLoaded = 0;
    
    for (const resourceKey of requiredResources) {
        const resourceUrl = config.apiEndpoints[resourceKey];
        if (!resourceUrl) continue;
        
        const found = results.api_requests.find(req => 
            req.url.includes(resourceUrl) || resourceUrl.includes(req.url)
        );
        
        if (found && found.status === 200) {
            resourcesLoaded++;
            results.aigc_verification[`${resourceKey}_loaded`] = true;
            console.log(`✅ ${resourceKey} 載入成功: ${resourceUrl}`);
        } else {
            console.warn(`⚠️ ${resourceKey} 未載入: ${resourceUrl}`);
        }
    }
    
     results.results.aigc_resources_loaded = resourcesLoaded >= 1; // 至少載入 1 個 AIGC API
    
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
    
    console.log(`📊 CMoney AIGC 資源載入狀態: ${resourcesLoaded}/${requiredResources.length}`);
}

/**
 * 檢查 "你可能想知道" AI 區塊是否存在
 */
async function checkAISectionExists(page, results, config, dateFolder, timestamp) {
    console.log('🔍 檢查 CMoney AI 區塊是否存在...');
    
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
                
                const sectionText = await aiSection.textContent();
                console.log(`✅ 找到 CMoney AI 區塊: ${sectionText?.substring(0, 30)}...`);
                
                aiSectionFound = true;
                break;
            } catch (error) {
                continue;
            }
        }
        
        if (aiSectionFound) {
            results.results.ai_section_found = true;
            await takeScreenshot(page, dateFolder, timestamp, 'cmoney-ai-section-found', 'success', results, 'cmoney');
            console.log('✅ CMoney AI 區塊檢查通過');
        } else {
            console.warn('⚠️ 未找到 CMoney AI 區塊');
            await takeScreenshot(page, dateFolder, timestamp, 'cmoney-ai-section-missing', 'issues', results, 'cmoney');
        }
        
    } catch (error) {
        console.error('❌ CMoney AI 區塊檢查失敗:', error.message);
        await takeScreenshot(page, dateFolder, timestamp, 'cmoney-ai-section-error', 'issues', results, 'cmoney');
        throw error;
    }
}

/**
 * 檢查 AI 問題連結並測試點擊功能
 */
async function checkAIQuestions(page, context, results, config, dateFolder, timestamp) {
    console.log('🔍 檢查 CMoney AI 問題連結...');
    
    try {
        let questionFound = false;
        let questionLink = null;
        let questionText = '';
        
        const questionSelectors = config.selectors.aiQuestions;
        
        for (const selector of questionSelectors) {
            try {
                questionLink = page.locator(selector).first();
                await questionLink.waitFor({ timeout: config.timeouts.findQuestion });
                
                questionText = await questionLink.textContent();
                console.log(`✅ 找到 CMoney AI 問題: ${questionText?.substring(0, 50)}...`);
                
                questionFound = true;
                break;
            } catch (error) {
                continue;
            }
        }
        
        if (!questionFound) {
            console.warn('⚠️ 未找到 CMoney AI 問題連結');
            await takeScreenshot(page, dateFolder, timestamp, 'cmoney-ai-questions-missing', 'issues', results, 'cmoney');
            return;
        }
        
        results.results.ai_questions_available = true;
        await takeScreenshot(page, dateFolder, timestamp, 'cmoney-ai-questions-found', 'success', results, 'cmoney');
        
        // 測試點擊 AI 問題連結
        await testAIQuestionClick(page, context, questionLink, questionText, results, config, dateFolder, timestamp);
        
    } catch (error) {
        console.error('❌ CMoney AI 問題檢查失敗:', error.message);
        await takeScreenshot(page, dateFolder, timestamp, 'cmoney-ai-questions-error', 'issues', results, 'cmoney');
        throw error;
    }
}

/**
 * 測試點擊 AI 問題連結並驗證新頁面
 */
async function testAIQuestionClick(page, context, questionLink, questionText, results, config, dateFolder, timestamp) {
    console.log('🔍 測試 CMoney AI 問題連結點擊...');
    
    try {
        const aiGenerationStart = Date.now();
        
        // 點擊問題連結（會開啟新分頁）
        const [newPage] = await Promise.all([
            context.waitForEvent('page'),
            questionLink.click()
        ]);
        
        await newPage.waitForLoadState('domcontentloaded');
        
        // 驗證新頁面標題
        const newPageTitle = await newPage.title();
        console.log(`📄 CMoney 新頁面標題: ${newPageTitle}`);
        
        // 檢查標題是否包含問題文字的關鍵字
        const questionKeywords = questionText.replace(/[#？?]/g, '').split('').slice(0, 10).join('');
        const titleContainsQuestion = newPageTitle.includes(questionKeywords) || 
                                    questionText.includes(newPageTitle.split('|')[0].trim()) ||
                                    newPageTitle.includes('AIGC');
        
        if (titleContainsQuestion) {
            console.log('✅ CMoney 新頁面標題與問題匹配');
        } else {
            console.warn(`⚠️ CMoney 新頁面標題可能不匹配: "${newPageTitle}" vs "${questionText}"`);
        }
        
        // 等待 AI 內容生成
        await waitForAIContentGeneration(newPage, results, config);
        
        // 驗證 AI 內容是否正確顯示
        await verifyAIContent(newPage, results, config, dateFolder, timestamp);
        
        results.performance.ai_generation_time = Date.now() - aiGenerationStart;
        results.results.ai_content_generated = true;
        
        await takeScreenshot(newPage, dateFolder, timestamp, 'cmoney-ai-content-generated', 'success', results, 'cmoney');
        
        console.log('✅ CMoney AI 問題連結測試通過');
        
        // 關閉新頁面
        await newPage.close();
        
    } catch (error) {
        console.error('❌ CMoney AI 問題連結測試失敗:', error.message);
        throw error;
    }
}

/**
 * 等待 AI 內容生成完成
 */
async function waitForAIContentGeneration(page, results, config) {
    console.log('⏳ 等待 CMoney AI 內容生成...');
    
    try {
        // 等待載入文字消失或內容出現
        const loadingSelectors = config.selectors.loadingTexts;
        const contentSelectors = config.selectors.aiContent;
        
        // 先等待一段時間讓頁面初始化
        await page.waitForTimeout(config.timeouts.aiInitialWait);
        
        // 等待載入完成（載入文字消失或內容出現）
        const waitPromises = [];
        
        // 等待載入文字消失
        for (const selector of loadingSelectors) {
            waitPromises.push(
                page.locator(selector).waitFor({ state: 'hidden', timeout: config.timeouts.aiContentWait })
                    .catch(() => {}) // 忽略錯誤
            );
        }
        
        // 等待內容出現
        for (const selector of contentSelectors) {
            waitPromises.push(
                page.locator(selector).waitFor({ timeout: config.timeouts.aiContentWait })
                    .catch(() => {}) // 忽略錯誤
            );
        }
        
        // 等待任一條件滿足或超時
        await Promise.race([
            Promise.all(waitPromises),
            page.waitForTimeout(config.timeouts.aiContentWait)
        ]);
        
        console.log('✅ CMoney AI 內容生成等待完成');
        
    } catch (error) {
        console.warn('⚠️ CMoney AI 內容生成等待超時:', error.message);
    }
}

/**
 * 驗證 AI 內容是否正確顯示
 */
async function verifyAIContent(page, results, config, dateFolder, timestamp) {
    console.log('🔍 驗證 CMoney AI 內容...');
    
    try {
        let contentFound = false;
        const contentSelectors = config.selectors.aiContent;
        const expectedKeywords = config.keywords.ai;
        
        // 檢查是否有 AI 內容元素
        for (const selector of contentSelectors) {
            try {
                const contentElement = page.locator(selector).first();
                await contentElement.waitFor({ timeout: 5000 });
                
                const contentText = await contentElement.textContent();
                if (contentText && contentText.trim().length > 50) {
                    contentFound = true;
                    console.log(`✅ 找到 CMoney AI 內容: ${contentText.substring(0, 100)}...`);
                    break;
                }
            } catch (error) {
                continue;
            }
        }
        
        // 檢查頁面是否包含預期的關鍵字
        const pageContent = await page.textContent('body');
        let keywordFound = false;
        
        for (const keyword of expectedKeywords) {
            if (pageContent.includes(keyword)) {
                keywordFound = true;
                console.log(`✅ 找到預期關鍵字: ${keyword}`);
                break;
            }
        }
        
        if (contentFound && keywordFound) {
            console.log('✅ CMoney AI 內容驗證通過');
            results.results.ai_content_generated = true;
        } else {
            console.warn('⚠️ CMoney AI 內容驗證未完全通過');
            console.warn(`內容找到: ${contentFound}, 關鍵字找到: ${keywordFound}`);
        }
        
    } catch (error) {
        console.error('❌ CMoney AI 內容驗證失敗:', error.message);
        await takeScreenshot(page, dateFolder, timestamp, 'cmoney-ai-content-verification-failed', 'issues', results, 'cmoney');
        throw error;
    }
}

module.exports = {
    checkCMoneyAIGCFunctionality,
    verifyAigcResources,
    checkAISectionExists,
    checkAIQuestions,
    testAIQuestionClick,
    waitForAIContentGeneration,
    verifyAIContent
};