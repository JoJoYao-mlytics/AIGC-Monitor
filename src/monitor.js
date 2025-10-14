const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const { config, siteId } = require('./config');
const { setupNetworkMonitoring } = require('./network');
const { ensureDirectories, takeScreenshot, progressiveScroll, logPageStructure } = require('./utils');
const { checkGuguAIGCFunctionality } = require('./gugu-aigc');
const { checkCMoneyAIGCFunctionality } = require('./cmoney-aigc');
const { checkBnextAIGCFunctionality, preflightBnext } = require('./bnext-aigc');
const { checkCnyesAIGCFunctionality } = require('./cnyes-aigc');
const { checkUcarAIGCFunctionality } = require('./ucar-aigc');
const { saveResults } = require('./reporter');

class AIGCMonitor {
    constructor() {
        this.timestamp = moment().format('YYYY-MM-DD-HH-mm-ss');
        this.dateFolder = moment().format('YYYY-MM-DD');
        this.results = {
            timestamp: moment().toISOString(),
            status: 'success',
            site: siteId,
            baseUrl: config.baseUrl,
            results: {
                website_accessible: false,
                news_article_loaded: false,
                ai_section_found: false,
                ai_questions_available: false,
                ai_content_generated: false,
                aigc_resources_loaded: false
            },
            api_requests: [],
            console_messages: [],
            screenshots: [],
            errors: [],
            performance: {
                total_duration: 0,
                page_load_time: 0,
                ai_generation_time: 0
            },
            aigc_verification: {
                script_loaded: false,
                css_loaded: false,
                tracker_called: false,
                console_messages_found: false
            }
        };
        this.startTime = Date.now();
    }

    async run() {
        let browser = null;
        try {
            console.log('🚀 開始執行 AIGC 監控...');
            console.log(`📍 監控站點: ${siteId} (${config.baseUrl})`);

            await ensureDirectories(this.dateFolder, siteId);

            browser = await chromium.launch({
                headless: process.env.CI === 'true' || process.env.DEBUG !== 'true',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });

            const context = await browser.newContext({
                viewport: { width: 1920, height: 1080 },
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });

            const page = await context.newPage();
            this.page = page;

            // 監聽網路請求與 console 訊息（含新分頁）
            setupNetworkMonitoring(page, this.results);
            this.setupConsoleMonitoring(page);
            context.on('page', p => {
                try {
                    setupNetworkMonitoring(p, this.results);
                    this.setupConsoleMonitoring(p);
                } catch (_) {}
            });

            await this.checkWebsiteAccessibility(page);
            if (siteId === 'bnext') {
                // 先做 BNEXT preflight: 清空＋等待彈窗並嘗試關閉
                await preflightBnext(page, config);
            }
            await this.navigateToArticle(page);

            if (siteId === 'gugu') {
                await checkGuguAIGCFunctionality(page, context, this.results, config, this.dateFolder, this.timestamp);
            } else if (siteId === 'cmoney') {
                await checkCMoneyAIGCFunctionality(page, context, this.results, config, this.dateFolder, this.timestamp);
            } else if (siteId === 'bnext') {
                await checkBnextAIGCFunctionality(page, context, this.results, config, this.dateFolder, this.timestamp);
            } else if (siteId === 'cnyes') {
                await checkCnyesAIGCFunctionality(page, context, this.results, config, this.dateFolder, this.timestamp);
            } else if (siteId === 'ucar') {
                await checkUcarAIGCFunctionality(page, context, this.results, config, this.dateFolder, this.timestamp);
            } else {
                throw new Error(`不支援的站點: ${siteId}`);
            }

            this.results.performance.total_duration = Date.now() - this.startTime;
            this.calculateApiStats();
            await saveResults(this.results, this.dateFolder, this.timestamp, siteId);

            console.log('✅ 監控執行完成');
            console.log(`📊 結果: ${JSON.stringify(this.results.results, null, 2)}`);
        } catch (error) {
            console.error('❌ 監控執行失敗:', error);
            this.results.status = 'failed';
            this.results.errors.push({
                message: error.message,
                stack: error.stack,
                timestamp: moment().toISOString()
            });
            await saveResults(this.results, this.dateFolder, this.timestamp, siteId);
            throw error;
        } finally {
            if (browser) await browser.close();
        }
        return this.results;
    }

    setupConsoleMonitoring(page) {
        page.on('console', msg => {
            const text = msg.text();
            const type = msg.type();

            const isFilteredGtmWarning = (
                type === 'warning' &&
                text.includes("Failed to execute 'postMessage' on 'DOMWindow'") &&
                text.includes('googletagmanager.com')
            );
            if (isFilteredGtmWarning) return;

            const message = { type, text, timestamp: moment().toISOString() };
            this.results.console_messages.push(message);

            const expectedMessages = config.expectedConsoleMessages || [];
            for (const expected of expectedMessages) {
                if (text.includes(expected)) {
                    this.results.aigc_verification.console_messages_found = true;
                    console.log(`✅ 找到預期的 console 訊息: ${expected}`);
                }
            }
            if (process.env.DEBUG === 'true') {
                console.log(`[${type.toUpperCase()}] ${text}`);
            }
        });
    }

    async checkWebsiteAccessibility(page) {
        console.log('📍 檢查網站可訪問性...');
        const pageLoadStart = Date.now();
        try {
            await page.goto(config.baseUrl, { waitUntil: 'domcontentloaded', timeout: config.timeouts.pageLoad });
            try {
                await page.locator('main, article, .main-content').first().waitFor({ timeout: Math.min(15000, config.timeouts.pageLoad) });
            } catch (_) {
                console.warn('⚠️ 主要內容區域未找到，繼續執行');
            }
            this.results.performance.page_load_time = Date.now() - pageLoadStart;
            this.results.results.website_accessible = true;
            await takeScreenshot(page, this.dateFolder, this.timestamp, 'website-loaded', 'success', this.results, siteId);
            console.log('✅ 網站可正常訪問');
        } catch (error) {
            console.error('❌ 網站無法訪問:', error.message);
            this.results.status = 'failed';
            await takeScreenshot(page, this.dateFolder, this.timestamp, 'website-failed', 'issues', this.results, siteId);
            throw error;
        }
    }

    async navigateToArticle(page) {
        console.log('📍 導航到文章頁面...');
        try {
            const currentUrl = page.url();
            if (currentUrl.includes('/blog/') || currentUrl.includes('/article/') || currentUrl.includes('/news/id/')) {
                console.log('✅ 已在文章頁面');
                this.results.results.news_article_loaded = true;
                await progressiveScroll(page, 3);
                await takeScreenshot(page, this.dateFolder, this.timestamp, 'article-loaded', 'success', this.results, siteId);
                return;
            }

            console.log('🔍 在首頁尋找文章連結...');
            await progressiveScroll(page, 2);

            let articleFound = false;
            const newsSelectors = config.selectors.newsLinks;
            for (const selector of newsSelectors) {
                try {
                    const el = page.locator(selector).first();
                    await el.waitFor({ timeout: config.timeouts.findNews });
                    const title = await el.textContent();
                    console.log(`✅ 找到文章: ${title?.substring(0, 50)}...`);

                    // 先嘗試以 href 導航，避免點擊被攔截
                    let href = await el.getAttribute('href');
                    if (!href) {
                        const anchor = el.locator('xpath=ancestor::a[1]').first();
                        if (await anchor.count()) {
                            href = await anchor.getAttribute('href');
                        }
                    }

                    if (href) {
                        const absolute = new URL(href, page.url()).toString();
                        await page.goto(absolute, { waitUntil: 'domcontentloaded', timeout: config.timeouts.pageLoad });
                    } else {
                        // 最後手段：強制點擊
                        await el.scrollIntoViewIfNeeded();
                        await el.click({ force: true });
                        try {
                            await page.waitForURL(u => /\/article\//.test(String(u)), { timeout: config.timeouts.pageLoad });
                        } catch (_) {}
                    }

                    await page.waitForLoadState('domcontentloaded');
                    articleFound = true;
                    break;
                } catch (_) {
                    continue;
                }
            }

            if (!articleFound) throw new Error('無法找到文章連結');

            await page.waitForTimeout(2000);
            await progressiveScroll(page, 3);
            this.results.results.news_article_loaded = true;
            await takeScreenshot(page, this.dateFolder, this.timestamp, 'article-loaded', 'success', this.results, siteId);
            console.log('✅ 成功導航到文章頁面');
        } catch (error) {
            console.error('❌ 導航到文章頁面失敗:', error.message);
            this.results.status = 'warning';
            await takeScreenshot(page, this.dateFolder, this.timestamp, 'article-failed', 'issues', this.results, siteId);
            throw error;
        }
    }

    calculateApiStats() {
        try {
            const responseTimes = this.results.api_requests
                .map(r => r.responseTimeMs)
                .filter(v => typeof v === 'number');
            if (responseTimes.length > 0) {
                const sum = responseTimes.reduce((a, b) => a + b, 0);
                const avg = Math.round(sum / responseTimes.length);
                const max = Math.max(...responseTimes);
                const min = Math.min(...responseTimes);
                this.results.performance.api_avg_response_ms = avg;
                this.results.performance.api_max_response_ms = max;
                this.results.performance.api_min_response_ms = min;
                this.results.performance.api_total_requests = responseTimes.length;
            }
        } catch (error) {
            console.warn('⚠️ 計算 API 統計失敗:', error.message);
        }
    }
}

if (require.main === module) {
    const monitor = new AIGCMonitor();
    monitor.run().catch(error => {
        console.error('監控執行失敗:', error);
        process.exit(1);
    });
}

module.exports = AIGCMonitor;

