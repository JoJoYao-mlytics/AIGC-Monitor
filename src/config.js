const fs = require('fs-extra');
const path = require('path');

// 從環境變數或命令行參數獲取配置
const siteId = process.env.SITE_ID || 'gugu';
const baseUrl = process.env.BASE_URL;

// 從命令行參數中查找配置文件
let configFile = null;
const configArg = process.argv.find(arg => arg.startsWith('--config='));
if (configArg) {
    configFile = configArg.split('=')[1];
} else {
    // 默認配置文件
    configFile = `config.${siteId}.json`;
}

// 讀取配置文件
let config = {};
try {
    const configPath = path.resolve(configFile);
    if (fs.existsSync(configPath)) {
        config = fs.readJsonSync(configPath);
        console.log(`✅ 載入配置文件: ${configFile}`);
    } else {
        console.warn(`⚠️ 配置文件不存在: ${configFile}，使用默認配置`);
        // 使用默認配置
        config = {
            baseUrl: baseUrl || 'https://www.gugu.fund/',
            timeouts: {
                pageLoad: 60000,
                findNews: 15000,
                findAiSection: 10000,
                findQuestion: 10000,
                closeAds: 3000,
                aiInitialWait: 5000,
                aiContentWait: 60000,
                aigcScriptWait: 30000,
                aigcApiWait: 30000,
                networkWait: 5000
            },
            keywords: {
                ai: ["你可能也想知道", "AIGC", "Powered by Mlytics AI"]
            },
            selectors: {
                newsLinks: ["a[href*='/blog/']:first-of-type"],
                aiSection: ["h2:has-text('你可能也想知道')"],
                aiQuestions: ["a[href*='/ai/answer']:first-of-type"]
            },
            apiEndpoints: {
                aigc_app_js: "https://school.gugu.fund/ai/js/db_answer.min.js",
                tracker: "https://api.aigc.mlytics.com/tracker"
            }
        };
    }
} catch (error) {
    console.error(`❌ 讀取配置文件失敗: ${error.message}`);
    process.exit(1);
}

// 如果環境變數提供了 baseUrl，則覆蓋配置文件中的設定
if (baseUrl) {
    config.baseUrl = baseUrl;
    console.log(`🔄 使用環境變數 BASE_URL: ${baseUrl}`);
}

// 驗證必要的配置
if (!config.baseUrl) {
    console.error('❌ 缺少 baseUrl 配置');
    process.exit(1);
}

console.log(`🎯 監控站點: ${siteId} (${config.baseUrl})`);

module.exports = {
    config,
    siteId
};
