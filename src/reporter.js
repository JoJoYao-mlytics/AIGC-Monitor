const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const { ensureDirectories, formatDuration, formatFileSize } = require('./utils');
const { analyzeNetworkStats, getAigcRequestDetails, checkCriticalAigcResources } = require('./network');

/**
 * 保存監控結果
 */
async function saveResults(results, dateFolder, timestamp, siteId) {
    try {
        const { resultsDir } = await ensureDirectories(dateFolder, siteId);
        
        // 生成詳細報告
        const detailedReport = generateDetailedReport(results);
        
        // 保存 JSON 結果
        const jsonFile = path.join(resultsDir, `${timestamp}-results.json`);
        await fs.writeJson(jsonFile, detailedReport, { spaces: 2 });
        
        // 生成 HTML 報告
        const htmlReport = generateHtmlReport(detailedReport);
        const htmlFile = path.join(resultsDir, `${timestamp}-report.html`);
        await fs.writeFile(htmlFile, htmlReport);
        
        // 生成摘要報告
        const summaryReport = generateSummaryReport(detailedReport);
        const summaryFile = path.join(resultsDir, `${timestamp}-summary.txt`);
        await fs.writeFile(summaryFile, summaryReport);
        
        console.log(`📊 結果已保存:`);
        console.log(`   JSON: ${jsonFile}`);
        console.log(`   HTML: ${htmlFile}`);
        console.log(`   摘要: ${summaryFile}`);
        
        return {
            jsonFile,
            htmlFile,
            summaryFile
        };
        
    } catch (error) {
        console.error('❌ 保存結果失敗:', error.message);
        throw error;
    }
}

/**
 * 生成詳細報告
 */
function generateDetailedReport(results) {
    const networkStats = analyzeNetworkStats(results);
    const aigcDetails = getAigcRequestDetails(results);
    const criticalResources = checkCriticalAigcResources(results, results.apiEndpoints || {});
    
    return {
        ...results,
        analysis: {
            network_stats: networkStats,
            aigc_requests: aigcDetails,
            critical_resources: criticalResources,
            success_rate: calculateSuccessRate(results),
            performance_metrics: calculatePerformanceMetrics(results)
        },
        generated_at: moment().toISOString(),
        report_version: '1.0.0'
    };
}

/**
 * 生成 HTML 報告
 */
function generateHtmlReport(report) {
    const { results, analysis, performance, aigc_verification } = report;
    
    return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AIGC 監控報告 - ${report.site}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2em; }
        .header .meta { margin-top: 10px; opacity: 0.9; }
        .content { padding: 30px; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .status-card { padding: 20px; border-radius: 8px; border-left: 4px solid; }
        .status-success { background: #f0f9ff; border-color: #10b981; }
        .status-warning { background: #fffbeb; border-color: #f59e0b; }
        .status-error { background: #fef2f2; border-color: #ef4444; }
        .status-card h3 { margin: 0 0 10px 0; color: #374151; }
        .status-card .value { font-size: 1.5em; font-weight: bold; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .table th { background: #f9fafb; font-weight: 600; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: 500; }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-error { background: #fee2e2; color: #991b1b; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .screenshots { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .screenshot { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
        .screenshot img { width: 100%; height: 200px; object-fit: cover; }
        .screenshot .info { padding: 15px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AIGC 監控報告</h1>
            <div class="meta">
                <div>站點: ${report.site} | 狀態: ${report.status} | 時間: ${moment(report.timestamp).format('YYYY-MM-DD HH:mm:ss')}</div>
                <div>執行時間: ${formatDuration(performance.total_duration)} | 頁面載入: ${formatDuration(performance.page_load_time)}</div>
            </div>
        </div>
        
        <div class="content">
            <div class="status-grid">
                <div class="status-card ${results.website_accessible ? 'status-success' : 'status-error'}">
                    <h3>網站可訪問性</h3>
                    <div class="value">${results.website_accessible ? '✅ 正常' : '❌ 失敗'}</div>
                </div>
                <div class="status-card ${results.news_article_loaded ? 'status-success' : 'status-error'}">
                    <h3>文章載入</h3>
                    <div class="value">${results.news_article_loaded ? '✅ 成功' : '❌ 失敗'}</div>
                </div>
                <div class="status-card ${results.ai_section_found ? 'status-success' : 'status-error'}">
                    <h3>AI 區塊</h3>
                    <div class="value">${results.ai_section_found ? '✅ 找到' : '❌ 未找到'}</div>
                </div>
                <div class="status-card ${results.ai_questions_available ? 'status-success' : 'status-error'}">
                    <h3>AI 問題</h3>
                    <div class="value">${results.ai_questions_available ? '✅ 可用' : '❌ 不可用'}</div>
                </div>
                <div class="status-card ${results.ai_content_generated ? 'status-success' : 'status-error'}">
                    <h3>AI 內容生成</h3>
                    <div class="value">${results.ai_content_generated ? '✅ 成功' : '❌ 失敗'}</div>
                </div>
                <div class="status-card ${results.aigc_resources_loaded ? 'status-success' : 'status-error'}">
                    <h3>AIGC 資源</h3>
                    <div class="value">${results.aigc_resources_loaded ? '✅ 載入' : '❌ 未載入'}</div>
                </div>
            </div>
            
            <div class="section">
                <h2>AIGC 資源驗證（API）</h2>
                <table class="table">
                    <thead>
                        <tr>
                            <th>API 類型</th>
                            <th>狀態</th>
                            <th>詳情</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${generateApiVerificationRow('questions_html', 'Questions HTML', aigc_verification.questions_html_loaded)}
                        ${generateApiVerificationRow('answer_html', 'Answer HTML', aigc_verification.answer_html_loaded)}
                        ${generateApiVerificationRow('member_html', 'Member HTML', aigc_verification.member_html_loaded)}
                        ${generateApiVerificationRow('questions_ajax', 'Questions AJAX', aigc_verification.questions_ajax_loaded)}
                        ${generateApiVerificationRow('metadata_html', 'Metadata HTML', aigc_verification.metadata_html_loaded)}
                        <tr>
                            <td>Console 訊息</td>
                            <td><span class="badge ${aigc_verification.console_messages_found ? 'badge-success' : 'badge-error'}">${aigc_verification.console_messages_found ? '找到' : '未找到'}</span></td>
                            <td>AIGC 相關 console 輸出</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h2>網路請求統計</h2>
                <div class="status-grid">
                    <div class="status-card status-success">
                        <h3>總請求數</h3>
                        <div class="value">${analysis.network_stats.total_requests}</div>
                    </div>
                    <div class="status-card status-success">
                        <h3>成功請求</h3>
                        <div class="value">${analysis.network_stats.successful_requests}</div>
                    </div>
                    <div class="status-card ${analysis.network_stats.failed_requests > 0 ? 'status-warning' : 'status-success'}">
                        <h3>失敗請求</h3>
                        <div class="value">${analysis.network_stats.failed_requests}</div>
                    </div>
                    <div class="status-card status-success">
                        <h3>平均回應時間</h3>
                        <div class="value">${analysis.network_stats.avg_response_time}ms</div>
                    </div>
                </div>
            </div>
            
            ${generateAigcRequestsTable(analysis.aigc_requests)}
            
            ${generateScreenshotsSection(report.screenshots)}
            
            ${generateErrorsSection(report.errors)}
        </div>
        
        <div class="footer">
            <p>報告生成時間: ${moment(report.generated_at).format('YYYY-MM-DD HH:mm:ss')} | AIGC Monitor v${report.report_version}</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * 生成 AIGC 請求表格
 */
function generateAigcRequestsTable(aigcRequests) {
    if (!aigcRequests || aigcRequests.length === 0) {
        return '<div class="section"><h2>AIGC 相關請求</h2><p>未找到 AIGC 相關請求</p></div>';
    }
    
    const rows = aigcRequests.map(req => `
        <tr>
            <td>${req.method}</td>
            <td title="${req.url}">${req.url.length > 50 ? req.url.substring(0, 50) + '...' : req.url}</td>
            <td><span class="badge ${req.success ? 'badge-success' : 'badge-error'}">${req.status}</span></td>
            <td>${req.responseTime}ms</td>
            <td>${req.contentType}</td>
        </tr>
    `).join('');
    
    return `
        <div class="section">
            <h2>AIGC 相關請求</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>方法</th>
                        <th>URL</th>
                        <th>狀態</th>
                        <th>回應時間</th>
                        <th>內容類型</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * 生成截圖區塊
 */
function generateScreenshotsSection(screenshots) {
    if (!screenshots || screenshots.length === 0) {
        return '<div class="section"><h2>截圖</h2><p>無截圖</p></div>';
    }
    
    const screenshotCards = screenshots.map(screenshot => `
        <div class="screenshot">
            <img src="${screenshot.filename}" alt="${screenshot.name}" onerror="this.style.display='none'">
            <div class="info">
                <h4>${screenshot.name}</h4>
                <p>類型: ${screenshot.type} | 時間: ${moment(screenshot.timestamp).format('HH:mm:ss')}</p>
            </div>
        </div>
    `).join('');
    
    return `
        <div class="section">
            <h2>截圖</h2>
            <div class="screenshots">
                ${screenshotCards}
            </div>
        </div>
    `;
}

/**
 * 生成錯誤區塊
 */
function generateErrorsSection(errors) {
    if (!errors || errors.length === 0) {
        return '<div class="section"><h2>錯誤記錄</h2><p style="color: #10b981;">✅ 無錯誤</p></div>';
    }
    
    const errorRows = errors.map(error => `
        <tr>
            <td>${error.type || 'unknown'}</td>
            <td>${error.message}</td>
            <td>${moment(error.timestamp).format('HH:mm:ss')}</td>
        </tr>
    `).join('');
    
    return `
        <div class="section">
            <h2>錯誤記錄</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>類型</th>
                        <th>訊息</th>
                        <th>時間</th>
                    </tr>
                </thead>
                <tbody>
                    ${errorRows}
                </tbody>
            </table>
        </div>
    `;
}

// 產生 API 驗證列
function generateApiVerificationRow(key, label, loaded) {
    return `
        <tr>
            <td>${label}</td>
            <td><span class="badge ${loaded ? 'badge-success' : 'badge-error'}">${loaded ? '已載入' : '未載入'}</span></td>
            <td>api.aigc.mlytics.com/${key}</td>
        </tr>
    `;
}

/**
 * 生成摘要報告
 */
function generateSummaryReport(report) {
    const { results, analysis, performance } = report;
    
    return `
AIGC 監控摘要報告
================

基本信息:
- 站點: ${report.site}
- 基礎 URL: ${report.baseUrl}
- 執行時間: ${moment(report.timestamp).format('YYYY-MM-DD HH:mm:ss')}
- 總執行時長: ${formatDuration(performance.total_duration)}
- 狀態: ${report.status}

檢查結果:
- 網站可訪問性: ${results.website_accessible ? '✅' : '❌'}
- 文章載入: ${results.news_article_loaded ? '✅' : '❌'}
- AI 區塊找到: ${results.ai_section_found ? '✅' : '❌'}
- AI 問題可用: ${results.ai_questions_available ? '✅' : '❌'}
- AI 內容生成: ${results.ai_content_generated ? '✅' : '❌'}
- AIGC 資源載入: ${results.aigc_resources_loaded ? '✅' : '❌'}

AIGC 資源驗證:
- JavaScript 腳本: ${report.aigc_verification.script_loaded ? '✅' : '❌'}
- CSS 樣式: ${report.aigc_verification.css_loaded ? '✅' : '❌'}
- 追蹤器呼叫: ${report.aigc_verification.tracker_called ? '✅' : '❌'}
- Console 訊息: ${report.aigc_verification.console_messages_found ? '✅' : '❌'}

網路統計:
- 總請求數: ${analysis.network_stats.total_requests}
- 成功請求: ${analysis.network_stats.successful_requests}
- 失敗請求: ${analysis.network_stats.failed_requests}
- AIGC 請求: ${analysis.network_stats.aigc_requests}
- 平均回應時間: ${analysis.network_stats.avg_response_time}ms

效能指標:
- 頁面載入時間: ${formatDuration(performance.page_load_time)}
- AI 生成時間: ${formatDuration(performance.ai_generation_time || 0)}
- 成功率: ${analysis.success_rate}%

錯誤數量: ${report.errors.length}
截圖數量: ${report.screenshots.length}

報告生成時間: ${moment(report.generated_at).format('YYYY-MM-DD HH:mm:ss')}
`;
}

/**
 * 計算成功率
 */
function calculateSuccessRate(results) {
    const checks = [
        results.results.website_accessible,
        results.results.news_article_loaded,
        results.results.ai_section_found,
        results.results.ai_questions_available,
        results.results.ai_content_generated,
        results.results.aigc_resources_loaded
    ];
    
    const successCount = checks.filter(Boolean).length;
    return Math.round((successCount / checks.length) * 100);
}

/**
 * 計算效能指標
 */
function calculatePerformanceMetrics(results) {
    return {
        page_load_score: results.performance.page_load_time < 5000 ? 'good' : results.performance.page_load_time < 10000 ? 'fair' : 'poor',
        ai_generation_score: (results.performance.ai_generation_time || 0) < 30000 ? 'good' : (results.performance.ai_generation_time || 0) < 60000 ? 'fair' : 'poor',
        overall_score: results.status === 'success' ? 'pass' : 'fail'
    };
}

module.exports = {
    saveResults,
    generateDetailedReport,
    generateHtmlReport,
    generateSummaryReport,
    calculateSuccessRate,
    calculatePerformanceMetrics
};
