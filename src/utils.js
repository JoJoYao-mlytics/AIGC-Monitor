const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');

/**
 * 確保必要的目錄存在
 */
async function ensureDirectories(dateFolder, siteId) {
    const baseDir = path.join(process.cwd(), 'reports', siteId, dateFolder);
    const screenshotsDir = path.join(baseDir, 'screenshots');
    const resultsDir = path.join(baseDir, 'results');
    
    await fs.ensureDir(screenshotsDir);
    await fs.ensureDir(resultsDir);
    
    return {
        baseDir,
        screenshotsDir,
        resultsDir
    };
}

/**
 * 截圖並保存
 */
async function takeScreenshot(page, dateFolder, timestamp, name, type, results, siteId) {
    try {
        const { screenshotsDir } = await ensureDirectories(dateFolder, siteId);
        const filename = `${timestamp}-${name}.png`;
        const filepath = path.join(screenshotsDir, filename);
        
        await page.screenshot({
            path: filepath,
            fullPage: true
        });
        
        results.screenshots.push({
            name,
            type,
            filename,
            filepath,
            timestamp: moment().toISOString()
        });
        
        console.log(`📸 截圖已保存: ${filename}`);
        
    } catch (error) {
        console.error(`❌ 截圖失敗 (${name}):`, error.message);
    }
}

/**
 * 漸進式滾動頁面
 */
async function progressiveScroll(page, steps = 3) {
    try {
        const viewportHeight = await page.evaluate(() => window.innerHeight);
        const scrollStep = viewportHeight * 0.8;
        
        for (let i = 0; i < steps; i++) {
            await page.evaluate((step) => {
                window.scrollBy(0, step);
            }, scrollStep);
            
            await page.waitForTimeout(1000);
        }
        
        // 滾動回頂部
        await page.evaluate(() => {
            window.scrollTo(0, 0);
        });
        
        await page.waitForTimeout(500);
        
    } catch (error) {
        console.warn('⚠️ 頁面滾動失敗:', error.message);
    }
}

/**
 * 記錄頁面結構（用於調試）
 */
async function logPageStructure(page, results) {
    try {
        const structure = await page.evaluate(() => {
            const elements = [];
            
            // 記錄主要元素
            const mainElements = document.querySelectorAll('main, article, .content, .ai-section, h1, h2, h3');
            mainElements.forEach(el => {
                elements.push({
                    tag: el.tagName.toLowerCase(),
                    text: el.textContent?.substring(0, 100),
                    classes: Array.from(el.classList),
                    id: el.id
                });
            });
            
            return {
                url: window.location.href,
                title: document.title,
                elements: elements.slice(0, 20) // 限制數量
            };
        });
        
        results.page_structure = structure;
        
    } catch (error) {
        console.warn('⚠️ 記錄頁面結構失敗:', error.message);
    }
}

/**
 * 等待元素出現或消失
 */
async function waitForElementState(page, selector, state = 'visible', timeout = 10000) {
    try {
        const element = page.locator(selector);
        await element.waitFor({ state, timeout });
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * 安全地獲取元素文本
 */
async function safeGetText(page, selector) {
    try {
        const element = page.locator(selector).first();
        await element.waitFor({ timeout: 5000 });
        return await element.textContent();
    } catch (error) {
        return null;
    }
}

/**
 * 檢查元素是否存在
 */
async function elementExists(page, selector, timeout = 5000) {
    try {
        await page.locator(selector).first().waitFor({ timeout });
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * 關閉可能的彈窗或廣告
 */
async function closeModals(page) {
    const modalSelectors = [
        '[data-testid="modal-close"]',
        '.modal-close',
        '.close-button',
        '[aria-label="Close"]',
        '[aria-label="關閉"]',
        'button:has-text("關閉")',
        'button:has-text("Close")',
        '.popup-close'
    ];
    
    for (const selector of modalSelectors) {
        try {
            const closeButton = page.locator(selector);
            if (await closeButton.isVisible({ timeout: 1000 })) {
                await closeButton.click();
                await page.waitForTimeout(1000);
                console.log(`✅ 關閉彈窗: ${selector}`);
            }
        } catch (error) {
            // 忽略錯誤，繼續嘗試下一個選擇器
        }
    }
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化持續時間
 */
function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * 生成唯一的測試 ID
 */
function generateTestId() {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
    ensureDirectories,
    takeScreenshot,
    progressiveScroll,
    logPageStructure,
    waitForElementState,
    safeGetText,
    elementExists,
    closeModals,
    formatFileSize,
    formatDuration,
    generateTestId
};
