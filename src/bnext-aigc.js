const { takeScreenshot, progressiveScroll } = require('./utils');

/**
 * BNext 站點專用的 AIGC 功能檢測
 * 流程：
 * 1) 保障乾淨狀態（清空 local/session/cookies 並重新載入當前頁）
 * 2) 嘗試等待 30 秒觀察彈窗，若出現則關閉（#custom-popup-close）
 * 3) 在文章頁驗證「你想知道哪些？AI來解答」區塊與問題連結
 * 4) 點擊其中一個問題 → 新分頁驗證標題與內容關鍵字
 * 5) 驗證 AIGC 資源（以 console 訊息與可見內容為主，API 為輔）
 */
async function checkBnextAIGCFunctionality(page, context, results, config, dateFolder, timestamp) {
    console.log('📍 開始檢查 BNext AIGC 功能...');

    try {
        await ensureCleanState(page);
        await maybeCloseBnextPopup(page);

        // 1. 檢查 AIGC 相關資源（以 console 訊息/關鍵元素為主）
        await verifyAigcResources(page, results, config);

        // 2. 檢查「你想知道哪些？AI來解答」區塊
        await checkAISectionExists(page, results, config, dateFolder, timestamp);

        // 3. 檢查 AI 問題連結
        await checkAIQuestions(page, context, results, config, dateFolder, timestamp);

        console.log('✅ BNext AIGC 功能檢查完成');

    } catch (error) {
        console.error('❌ BNext AIGC 功能檢查失敗:', error.message);
        results.status = 'failed';
        results.errors.push({
            message: `BNext AIGC 檢查失敗: ${error.message}`,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

async function ensureCleanState(page) {
    try {
        // 以頁面腳本清空 localStorage / sessionStorage / cookies，然後重新載入
        await page.evaluate(() => {
            try { localStorage.clear(); } catch (e) {}
            try { sessionStorage.clear(); } catch (e) {}
            try {
                const parts = document.cookie.split(';');
                for (const c of parts) {
                    const eq = c.indexOf('=');
                    const name = (eq > -1 ? c.substr(0, eq) : c).trim();
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                    const host = location.hostname;
                    const segs = host.split('.');
                    for (let i = 0; i < segs.length - 1; i++) {
                        const domain = '.' + segs.slice(i).join('.');
                        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${domain}`;
                    }
                }
            } catch (e) {}
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        console.log('🧹 已嘗試清空站內儲存並重新載入');
    } catch {
        // 忽略
    }
}

async function maybeCloseBnextPopup(page) {
    try {
        // 等待 30s 讓彈窗出現
        await page.waitForTimeout(30000);

        const selectors = [
            '#custom-popup-close',
            'div#custom-popup-close',
            '[id*="custom"][id*="popup"][id*="close"]',
            '[class*="popup"] [id*="close"]',
            'button:has-text("關閉")',
            '[aria-label="Close"]',
            '[aria-label="關閉"]'
        ];

        let closed = false;
        for (const sel of selectors) {
            try {
                const btn = page.locator(sel).first();
                if (await btn.isVisible({ timeout: 1000 })) {
                    await btn.click({ trial: false });
                    await page.waitForTimeout(800);
                    closed = true;
                    console.log(`✅ 關閉 BNext 彈窗: ${sel}`);
                    break;
                }
            } catch {}
        }

        // 嘗試在 iframe 內關閉
        if (!closed) {
            for (const frame of page.frames()) {
                try {
                    const btn = frame.locator('#custom-popup-close').first();
                    if (await btn.isVisible({ timeout: 500 })) {
                        await btn.click();
                        await page.waitForTimeout(800);
                        closed = true;
                        console.log('✅ 關閉 BNext 彈窗 (iframe)');
                        break;
                    }
                } catch {}
            }
        }

        if (!closed) {
            console.warn('⚠️ 未偵測到可點擊的彈窗關閉按鈕');
        }
    } catch {}
}

async function preflightBnext(page, config) {
    try {
        const needClear = config.clearOnStart === true || process.env.CLEAR_ON_START === 'true';
        if (needClear) {
            await ensureCleanState(page);
        }
        await maybeCloseBnextPopup(page);
    } catch (e) {
        console.warn('⚠️ BNEXT preflight 失敗，持續流程:', e?.message);
    }
}

/** 驗證 AIGC 相關資源
 * - 以 console 訊息與頁面內容為主（BNext 文章頁 AIGC 區塊為「你想知道哪些？AI來解答」）
 * - 若有 api.aigc.mlytics.com /api/* 端點也會一併記錄（由 network.js 處理）
 */
async function verifyAigcResources(page, results, config) {
    console.log('🔍 驗證 BNext AIGC 資源載入...');

    // 依 console 訊息判定腳本載入
    const expectedMessages = config.expectedConsoleMessages || [];
    for (const expected of expectedMessages) {
        const found = results.console_messages.find(msg => msg.text.includes(expected));
        if (found) {
            results.aigc_verification.console_messages_found = true;
            if (expected.includes('腳本加載') || expected.toLowerCase().includes('script')) {
                results.aigc_verification.script_loaded = true;
            }
        }
    }

    // 以 API 請求補強（若存在）
    const apiKeys = ['questions_html','answer_html','member_html','questions_ajax','metadata_html'];
    for (const key of apiKeys) {
        const url = config.apiEndpoints?.[key];
        if (!url) continue;
        const found = results.api_requests.find(req => req.url.includes(url) || url.includes(req.url));
        if (found && found.status >= 200 && found.status < 300) {
            results.aigc_verification[`${key}_loaded`] = true;
        }
    }

    // 粗略結論：若 console 訊息或任一 API 命中，視為 AIGC 資源載入
    const apiLoaded = apiKeys.some(k => results.aigc_verification[`${k}_loaded`] === true);
    results.results.aigc_resources_loaded = !!(results.aigc_verification.script_loaded || results.aigc_verification.console_messages_found || apiLoaded);
}

/** 檢查 AI 區塊是否存在（你想知道哪些？AI來解答） */
async function checkAISectionExists(page, results, config, dateFolder, timestamp) {
    console.log('🔍 檢查 BNext AI 區塊是否存在...');
    try {
        await progressiveScroll(page, 5);
        await page.waitForTimeout(2000);

        let found = false;
        const aiSelectors = config.selectors.aiSection;
        for (const selector of aiSelectors) {
            try {
                const aiSection = page.locator(selector).first();
                await aiSection.waitFor({ timeout: config.timeouts.findAiSection });
                found = true;
                break;
            } catch {}
        }

        if (found) {
            results.results.ai_section_found = true;
            await takeScreenshot(page, dateFolder, timestamp, 'bnext-ai-section-found', 'success', results, 'bnext');
        } else {
            await takeScreenshot(page, dateFolder, timestamp, 'bnext-ai-section-missing', 'issues', results, 'bnext');
            console.warn('⚠️ 未找到 BNext AI 區塊');
        }
    } catch (error) {
        await takeScreenshot(page, dateFolder, timestamp, 'bnext-ai-section-error', 'issues', results, 'bnext');
        throw error;
    }
}

/** 檢查 AI 問題連結並測試點擊功能 */
async function checkAIQuestions(page, context, results, config, dateFolder, timestamp) {
    console.log('🔍 檢查 BNext AI 問題連結...');
    try {
        let questionLink = null;
        let questionText = '';

        const questionSelectors = config.selectors.aiQuestions;
        for (const selector of questionSelectors) {
            try {
                const link = page.locator(selector).first();
                await link.waitFor({ timeout: config.timeouts.findQuestion });
                questionLink = link;
                questionText = (await link.textContent()) || '';
                break;
            } catch {}
        }

        if (!questionLink) {
            await takeScreenshot(page, dateFolder, timestamp, 'bnext-ai-questions-missing', 'issues', results, 'bnext');
            console.warn('⚠️ 未找到 BNext AI 問題連結');
            return;
        }

        results.results.ai_questions_available = true;
        await takeScreenshot(page, dateFolder, timestamp, 'bnext-ai-questions-found', 'success', results, 'bnext');

        await testAIQuestionClick(page, context, questionLink, questionText, results, config, dateFolder, timestamp);
    } catch (error) {
        await takeScreenshot(page, dateFolder, timestamp, 'bnext-ai-questions-error', 'issues', results, 'bnext');
        throw error;
    }
}

/** 測試點擊 AI 問題連結並驗證新頁面 */
async function testAIQuestionClick(page, context, questionLink, questionText, results, config, dateFolder, timestamp) {
    console.log('🔍 測試 BNext AI 問題連結點擊...');
    const start = Date.now();
    const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        questionLink.click()
    ]);
    await newPage.waitForLoadState('domcontentloaded');

    const newTitle = await newPage.title();
    console.log(`📄 BNext 新頁面標題: ${newTitle}`);

    const keywords = questionText.replace(/[#？?]/g, '').slice(0, 10);
    const titleOk = newTitle.includes(keywords) || newTitle.includes('AIGC');
    if (!titleOk) console.warn('⚠️ 新頁面標題可能不匹配');

    await waitForAIContentGeneration(newPage, results, config);
    await verifyAIContent(newPage, results, config, dateFolder, timestamp);

    results.performance.ai_generation_time = Date.now() - start;
    results.results.ai_content_generated = true;
    await takeScreenshot(newPage, dateFolder, timestamp, 'bnext-ai-content-generated', 'success', results, 'bnext');

    await newPage.close();
}

async function waitForAIContentGeneration(page, results, config) {
    // BNext 的 AIGC 子站多為即時內容，使用超時與關鍵元素雙策略
    await page.waitForTimeout(config.timeouts.aiInitialWait);
    const contentSelectors = config.selectors.aiContent || [];
    const waits = contentSelectors.map(sel => page.locator(sel).first().waitFor({ timeout: config.timeouts.aiContentWait }).catch(() => {}));
    await Promise.race([
        Promise.all(waits),
        page.waitForTimeout(config.timeouts.aiContentWait)
    ]);
}

async function verifyAIContent(page, results, config, dateFolder, timestamp) {
    let contentFound = false;
    const contentSelectors = config.selectors.aiContent || [];
    for (const selector of contentSelectors) {
        try {
            const el = page.locator(selector).first();
            await el.waitFor({ timeout: 5000 });
            const text = await el.textContent();
            if (text && text.trim().length > 20) {
                contentFound = true;
                break;
            }
        } catch {}
    }
    const bodyText = (await page.textContent('body')) || '';
    const kw = config.keywords.ai || [];
    const keywordFound = kw.some(k => bodyText.includes(k));

    if (!(contentFound && keywordFound)) {
        console.warn('⚠️ BNext AI 內容驗證未完全通過');
    }
}

module.exports = {
    checkBnextAIGCFunctionality,
    preflightBnext,
    ensureCleanState,
    maybeCloseBnextPopup
};


