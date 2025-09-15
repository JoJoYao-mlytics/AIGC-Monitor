const moment = require('moment');

/**
 * 設置網路請求監控
 * 只監控指定的 AIGC API 端點
 */
function setupNetworkMonitoring(page, results) {
    console.log('🌐 設置 AIGC API 監控...');
    
    // 只監控 AIGC 相關請求
    page.on('request', request => {
        const url = request.url();
        
        // 只處理 AIGC 相關請求
        if (isAigcRelatedRequest(url)) {
            const requestInfo = {
                url: url,
                method: request.method(),
                timestamp: moment().toISOString(),
                headers: request.headers(),
                resourceType: request.resourceType()
            };
            
            console.log(`📤 AIGC 請求: ${request.method()} ${url}`);
            
            // 存儲請求信息（用於後續匹配響應）
            results._pendingRequests = results._pendingRequests || new Map();
            results._pendingRequests.set(url, {
                ...requestInfo,
                startTime: Date.now()
            });
        }
    });
    
    // 監控網路響應（只處理 AIGC 相關響應）
    page.on('response', response => {
        const url = response.url();
        
        // 只處理 AIGC 相關響應
        if (isAigcRelatedRequest(url)) {
            const pendingRequest = results._pendingRequests?.get(url);
            
            if (pendingRequest) {
                const responseTime = Date.now() - pendingRequest.startTime;
                
                const responseInfo = {
                    ...pendingRequest,
                    status: response.status(),
                    statusText: response.statusText(),
                    responseTimeMs: responseTime,
                    size: response.headers()['content-length'] || 0,
                    contentType: response.headers()['content-type'] || 'unknown'
                };
                
                results.api_requests.push(responseInfo);
                
                console.log(`📥 AIGC 響應: ${response.status()} ${url} (${responseTime}ms)`);
                
                // 標記特定的 AIGC API 端點
                if (url.includes('/api/metadata_html')) {
                    results.aigc_verification.metadata_html_loaded = response.status() === 200;
                }
                if (url.includes('/api/answer_html')) {
                    results.aigc_verification.answer_html_loaded = response.status() === 200;
                }
                if (url.includes('/api/questions_html')) {
                    results.aigc_verification.questions_html_loaded = response.status() === 200;
                }
                if (url.includes('/api/member_html')) {
                    results.aigc_verification.member_html_loaded = response.status() === 200;
                }
                if (url.includes('/api/questions_ajax')) {
                    results.aigc_verification.questions_ajax_loaded = response.status() === 200;
                }
                
                // 清理已處理的請求
                results._pendingRequests.delete(url);
            }
        }
    });
    
    // 監控網路錯誤（只處理 AIGC 相關錯誤）
    page.on('requestfailed', request => {
        const url = request.url();
        
        // 只處理 AIGC 相關請求失敗
        if (isAigcRelatedRequest(url)) {
            const failure = request.failure();
            
            console.error(`❌ AIGC 請求失敗: ${url} - ${failure?.errorText}`);
            
            results.api_requests.push({
                url,
                method: request.method(),
                status: 0,
                statusText: failure?.errorText || 'Request Failed',
                timestamp: moment().toISOString(),
                responseTimeMs: 0,
                error: true
            });
            
            results.errors.push({
                type: 'network_error',
                message: `AIGC 資源載入失敗: ${url}`,
                details: failure?.errorText,
                timestamp: moment().toISOString()
            });
        }
    });
}

/**
 * 判斷是否為指定的 AIGC API 端點
 * 只監控以下 5 個特定的 API 端點：
 * - https://api.aigc.mlytics.com/api/metadata_html
 * - https://api.aigc.mlytics.com/api/answer_html
 * - https://api.aigc.mlytics.com/api/questions_html
 * - https://api.aigc.mlytics.com/api/member_html
 * - https://api.aigc.mlytics.com/api/questions_ajax
 */
function isAigcRelatedRequest(url) {
    const targetEndpoints = [
        '/api/metadata_html',
        '/api/answer_html',
        '/api/questions_html',
        '/api/member_html',
        '/api/questions_ajax'
    ];
    
    // 必須是 api.aigc.mlytics.com 域名下的指定端點
    return url.includes('api.aigc.mlytics.com') && 
           targetEndpoints.some(endpoint => url.includes(endpoint));
}

/**
 * 分析網路請求統計
 */
function analyzeNetworkStats(results) {
    const requests = results.api_requests || [];
    
    const stats = {
        total_requests: requests.length,
        successful_requests: requests.filter(r => r.status >= 200 && r.status < 300).length,
        failed_requests: requests.filter(r => r.status >= 400 || r.error).length,
        aigc_requests: requests.filter(r => isAigcRelatedRequest(r.url)).length,
        avg_response_time: 0,
        max_response_time: 0,
        min_response_time: 0
    };
    
    const responseTimes = requests
        .map(r => r.responseTimeMs)
        .filter(t => typeof t === 'number' && t > 0);
    
    if (responseTimes.length > 0) {
        stats.avg_response_time = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
        stats.max_response_time = Math.max(...responseTimes);
        stats.min_response_time = Math.min(...responseTimes);
    }
    
    return stats;
}

/**
 * 獲取 AIGC 相關請求的詳細信息
 */
function getAigcRequestDetails(results) {
    const aigcRequests = results.api_requests.filter(r => isAigcRelatedRequest(r.url));
    
    return aigcRequests.map(req => ({
        url: req.url,
        method: req.method,
        status: req.status,
        responseTime: req.responseTimeMs,
        contentType: req.contentType,
        size: req.size,
        timestamp: req.timestamp,
        success: req.status >= 200 && req.status < 300
    }));
}

/**
 * 檢查關鍵 AIGC 資源是否載入成功
 */
function checkCriticalAigcResources(results, expectedEndpoints) {
    const criticalResources = {};
    
    for (const [key, expectedUrl] of Object.entries(expectedEndpoints)) {
        const found = results.api_requests.find(req => 
            req.url.includes(expectedUrl) || expectedUrl.includes(req.url)
        );
        
        criticalResources[key] = {
            expected: expectedUrl,
            found: !!found,
            status: found?.status || 0,
            responseTime: found?.responseTimeMs || 0,
            success: found && found.status >= 200 && found.status < 300
        };
    }
    
    return criticalResources;
}

module.exports = {
    setupNetworkMonitoring,
    isAigcRelatedRequest,
    analyzeNetworkStats,
    getAigcRequestDetails,
    checkCriticalAigcResources
};
