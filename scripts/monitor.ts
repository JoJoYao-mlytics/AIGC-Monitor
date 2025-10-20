#!/usr/bin/env ts-node

/**
 * AIGC 監控主腳本
 * 
 * 功能：
 * 1. 每小時自動執行所有 AIGC 測試
 * 2. 依序執行測試（一個完成才執行下一個）
 * 3. 失敗時發送 Slack 通知
 * 4. 記錄詳細執行日誌
 * 
 * 使用方式：
 * npm run monitor
 * 或
 * npx ts-node scripts/monitor.ts
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as dotenv from 'dotenv';

dotenv.config();

// 配置
const CONFIG = {
  INTERVAL_MS: 60 * 60 * 1000, // 1 小時
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
  LOG_DIR: path.join(__dirname, '../logs'),
  MAX_LOG_FILES: 30, // 保留最近 30 天的日誌
};

// 測試網站列表
const TEST_SITES = [
  { name: 'CMoney 投資網誌', command: 'test:cmoney', file: 'cmoney.spec.ts' },
  { name: '數位時代 (BNext)', command: 'test:bnext', file: 'bnext.spec.ts' },
  { name: '鉅亨網 (Cnyes)', command: 'test:cnyes', file: 'cnyes.spec.ts' },
  { name: 'U-CAR 試車報告', command: 'test:ucar', file: 'ucar.spec.ts' },
  { name: 'U-CAR 機車頻道', command: 'test:ucar-motor', file: 'ucar-motor.spec.ts' },
  { name: 'U-CAR 售後市場', command: 'test:ucar-am', file: 'ucar-am.spec.ts' },
];

interface TestResult {
  site: string;
  status: 'passed' | 'failed' | 'error';
  duration: number;
  error?: string;
  timestamp: string;
}

/**
 * 發送訊息到 Slack
 */
async function postToSlack(payload: any): Promise<void> {
  if (!CONFIG.SLACK_WEBHOOK_URL) {
    log('⚠️  未設定 SLACK_WEBHOOK_URL，跳過 Slack 通知');
    return;
  }

  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.SLACK_WEBHOOK_URL!);
    const req = https.request({
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

/**
 * 發送監控開始訊息
 */
async function notifyMonitorStart(): Promise<void> {
  const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  
  const message = {
    text: '🚀 AIGC 監控開始執行',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🚀 AIGC 監控開始執行', emoji: true }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*開始時間*\n${timestamp}` },
          { type: 'mrkdwn', text: `*測試數量*\n${TEST_SITES.length} 個網站` }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*測試清單*\n${TEST_SITES.map(s => `• ${s.name}`).join('\n')}`
        }
      }
    ]
  };

  try {
    await postToSlack(message);
    log('✅ 已發送監控開始通知到 Slack');
  } catch (error) {
    log(`⚠️  發送 Slack 通知失敗: ${error}`);
  }
}

/**
 * 發送測試失敗訊息
 */
async function notifyTestFailure(siteName: string, errorMessage: string): Promise<void> {
  const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  
  const message = {
    text: `❌ ${siteName} 測試失敗`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '❌ AIGC 測試失敗警報', emoji: true }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*網站*\n${siteName}` },
          { type: 'mrkdwn', text: `*失敗時間*\n${timestamp}` }
        ]
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*錯誤訊息*\n\`\`\`${errorMessage.substring(0, 2000)}\`\`\``
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '💡 *建議行動*: 檢查網站是否正常運作，查看測試報告了解詳細資訊'
          }
        ]
      }
    ]
  };

  try {
    await postToSlack(message);
    log(`✅ 已發送失敗通知到 Slack: ${siteName}`);
  } catch (error) {
    log(`⚠️  發送 Slack 通知失敗: ${error}`);
  }
}

/**
 * 發送監控完成摘要
 */
async function notifyMonitorSummary(results: TestResult[], totalDuration: number): Promise<void> {
  const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed' || r.status === 'error').length;
  const statusEmoji = failed === 0 ? '✅' : '⚠️';
  const statusText = failed === 0 ? '全部通過' : `${failed} 個失敗`;
  
  const detailsText = results.map(r => {
    const emoji = r.status === 'passed' ? '✅' : '❌';
    return `${emoji} *${r.site}* - ${r.status} (${r.duration}s)`;
  }).join('\n');

  const message = {
    text: `${statusEmoji} AIGC 監控完成 - ${statusText}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${statusEmoji} AIGC 監控完成`, emoji: true }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*總測試數*\n${results.length}` },
          { type: 'mrkdwn', text: `*通過*\n${passed}` },
          { type: 'mrkdwn', text: `*失敗*\n${failed}` },
          { type: 'mrkdwn', text: `*總時長*\n${totalDuration}s` }
        ]
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*測試詳情*\n${detailsText}` }
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*完成時間*\n${timestamp}` }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: failed === 0 
              ? '🎉 所有 AIGC 功能運作正常！' 
              : '⚠️ 請檢查失敗的測試項目，確保 AIGC 功能正常運作'
          }
        ]
      }
    ]
  };

  try {
    await postToSlack(message);
    log('✅ 已發送監控摘要到 Slack');
  } catch (error) {
    log(`⚠️  發送 Slack 通知失敗: ${error}`);
  }
}

/**
 * 日誌函數
 */
/**
 * 格式化本地時間 (台北時間)
 */
function formatLocalTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function log(message: string): void {
  const timestamp = formatLocalTime();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  // 寫入日誌檔案
  const logFile = path.join(CONFIG.LOG_DIR, `monitor-${getDateString()}.log`);
  try {
    fs.appendFileSync(logFile, logMessage + '\n');
  } catch (error) {
    console.error('寫入日誌失敗:', error);
  }
}

/**
 * 取得日期字串（YYYY-MM-DD）
 */
function getDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * 確保日誌目錄存在
 */
function ensureLogDir(): void {
  if (!fs.existsSync(CONFIG.LOG_DIR)) {
    fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
    log(`✅ 已創建日誌目錄: ${CONFIG.LOG_DIR}`);
  }
}

/**
 * 清理舊日誌檔案
 */
function cleanupOldLogs(): void {
  try {
    const files = fs.readdirSync(CONFIG.LOG_DIR);
    const logFiles = files
      .filter(f => f.startsWith('monitor-') && f.endsWith('.log'))
      .map(f => ({
        name: f,
        path: path.join(CONFIG.LOG_DIR, f),
        mtime: fs.statSync(path.join(CONFIG.LOG_DIR, f)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    // 刪除超過保留數量的日誌
    if (logFiles.length > CONFIG.MAX_LOG_FILES) {
      const filesToDelete = logFiles.slice(CONFIG.MAX_LOG_FILES);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        log(`🗑️  已刪除舊日誌: ${file.name}`);
      });
    }
  } catch (error) {
    log(`⚠️  清理日誌失敗: ${error}`);
  }
}

/**
 * 執行單一測試
 */
function runTest(site: typeof TEST_SITES[0]): Promise<TestResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    log(`\n🧪 開始測試: ${site.name}`);

    const testProcess = spawn('npm', ['run', site.command], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
      shell: true
    });

    let output = '';
    let errorOutput = '';

    testProcess.stdout?.on('data', (data) => {
      output += data.toString();
    });

    testProcess.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    testProcess.on('close', (code) => {
      const duration = Math.round((Date.now() - startTime) / 1000);
      const timestamp = new Date().toISOString();

      if (code === 0) {
        log(`✅ ${site.name} 測試通過 (${duration}s)`);
        resolve({
          site: site.name,
          status: 'passed',
          duration,
          timestamp
        });
      } else {
        const errorMsg = errorOutput || output.split('\n').slice(-20).join('\n');
        log(`❌ ${site.name} 測試失敗 (${duration}s)`);
        log(`錯誤訊息: ${errorMsg.substring(0, 500)}`);
        
        // 發送失敗通知
        notifyTestFailure(site.name, errorMsg).catch(err => {
          log(`發送失敗通知時出錯: ${err}`);
        });

        resolve({
          site: site.name,
          status: 'failed',
          duration,
          error: errorMsg,
          timestamp
        });
      }
    });

    testProcess.on('error', (error) => {
      const duration = Math.round((Date.now() - startTime) / 1000);
      log(`❌ ${site.name} 執行錯誤: ${error.message}`);
      
      notifyTestFailure(site.name, error.message).catch(err => {
        log(`發送失敗通知時出錯: ${err}`);
      });

      resolve({
        site: site.name,
        status: 'error',
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });
  });
}

/**
 * 執行所有測試（依序執行）
 */
async function runAllTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const site of TEST_SITES) {
    const result = await runTest(site);
    results.push(result);
    
    // 測試之間等待 5 秒
    if (site !== TEST_SITES[TEST_SITES.length - 1]) {
      log('⏳ 等待 5 秒後執行下一個測試...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  return results;
}

/**
 * 執行一次完整的監控流程
 */
async function runMonitorCycle(): Promise<void> {
  const cycleStartTime = Date.now();
  
  log('\n' + '='.repeat(80));
  log('🚀 開始新的監控週期');
  log('='.repeat(80));

  // 不再發送開始通知（根據用戶要求）
  // await notifyMonitorStart();

  // 執行所有測試
  const results = await runAllTests();

  // 計算總時長
  const totalDuration = Math.round((Date.now() - cycleStartTime) / 1000);

  // 不再發送完成摘要（根據用戶要求，只在失敗時已經發送過警報）
  // await notifyMonitorSummary(results, totalDuration);

  // 儲存結果到日誌
  const resultSummary = {
    timestamp: new Date().toISOString(),
    totalDuration,
    results
  };
  
  const resultFile = path.join(CONFIG.LOG_DIR, `results-${getDateString()}.json`);
  try {
    let allResults = [];
    if (fs.existsSync(resultFile)) {
      allResults = JSON.parse(fs.readFileSync(resultFile, 'utf-8'));
    }
    allResults.push(resultSummary);
    fs.writeFileSync(resultFile, JSON.stringify(allResults, null, 2));
    log(`✅ 測試結果已儲存: ${resultFile}`);
  } catch (error) {
    log(`⚠️  儲存測試結果失敗: ${error}`);
  }

  log('\n' + '='.repeat(80));
  log('✅ 監控週期完成');
  log(`📊 結果: ${results.filter(r => r.status === 'passed').length}/${results.length} 通過`);
  log(`⏱️  總時長: ${totalDuration}s`);
  log('='.repeat(80) + '\n');
}

/**
 * 發送每日健康報告
 */
async function sendDailyHealthReport(): Promise<void> {
  const today = getDateString();
  const resultFile = path.join(CONFIG.LOG_DIR, `results-${today}.json`);
  
  if (!fs.existsSync(resultFile)) {
    log('⚠️  今日尚無測試結果，跳過每日報告');
    return;
  }

  try {
    const allResults = JSON.parse(fs.readFileSync(resultFile, 'utf-8'));
    
    if (allResults.length === 0) {
      log('⚠️  今日測試結果為空，跳過每日報告');
      return;
    }

    // 計算統計數據
    const totalRuns = allResults.length;
    const totalTests = allResults.reduce((sum: number, r: any) => sum + r.results.length, 0);
    const passedTests = allResults.reduce((sum: number, r: any) => 
      sum + r.results.filter((t: any) => t.status === 'passed').length, 0);
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const avgDuration = Math.round(
      allResults.reduce((sum: number, r: any) => sum + r.totalDuration, 0) / totalRuns
    );

    // 收集問題
    const issues: string[] = [];
    const failedSites: { [key: string]: number } = {};
    
    allResults.forEach((run: any) => {
      run.results.forEach((result: any) => {
        if (result.status === 'failed' || result.status === 'error') {
          failedSites[result.site] = (failedSites[result.site] || 0) + 1;
        }
      });
    });

    // 生成問題描述
    Object.entries(failedSites).forEach(([site, count]) => {
      issues.push(`${site} 失敗 ${count} 次 (${((count / totalRuns) * 100).toFixed(1)}%)`);
    });

    // 發送報告
    const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    const healthEmoji = successRate >= 95 ? '💚' : successRate >= 80 ? '💛' : '❤️';
    
    const message = {
      text: `${healthEmoji} AIGC 監控每日健康報告`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `${healthEmoji} AIGC 監控每日健康報告`, emoji: true }
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*報告日期*\n${timestamp}` }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*執行次數*\n${totalRuns} 次` },
            { type: 'mrkdwn', text: `*成功率*\n${successRate.toFixed(1)}%` },
            { type: 'mrkdwn', text: `*平均時長*\n${avgDuration}s` },
            { type: 'mrkdwn', text: `*健康狀態*\n${successRate >= 95 ? '優秀 ✨' : successRate >= 80 ? '良好 👍' : '需關注 ⚠️'}` }
          ]
        },
        ...(issues.length > 0 ? [
          { type: 'divider' },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*發現的問題*\n${issues.map(i => `• ${i}`).join('\n')}`
            }
          }
        ] : [
          { type: 'divider' },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: '*今日無問題* ✨\n所有測試都順利通過！' }
          }
        ]),
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: '📊 此報告每日自動產生' }
          ]
        }
      ]
    };

    await postToSlack(message);
    log('✅ 已發送每日健康報告到 Slack');
    
  } catch (error) {
    log(`⚠️  發送每日報告失敗: ${error}`);
  }
}

/**
 * 計算距離指定時間的毫秒數
 */
function getMillisecondsUntilTime(hour: number, minute: number = 0): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  
  // 如果目標時間已過，設定為明天
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  
  return target.getTime() - now.getTime();
}

/**
 * 主函數
 */
async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║          AIGC 監控系統 v1.0                              ║
║                                                          ║
║  監控間隔: ${CONFIG.INTERVAL_MS / 1000 / 60} 分鐘                                 ║
║  測試網站: ${TEST_SITES.length} 個                                      ║
║  Slack 通知: ${CONFIG.SLACK_WEBHOOK_URL ? '✅ 已啟用（僅失敗警報）' : '❌ 未啟用'}                   ║
║  每日報告: 每天 09:00                                    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);

  // 初始化
  ensureLogDir();
  cleanupOldLogs();

  log('🚀 監控系統啟動');
  log(`📁 日誌目錄: ${CONFIG.LOG_DIR}`);
  log(`⏰ 監控間隔: ${CONFIG.INTERVAL_MS / 1000 / 60} 分鐘`);
  log(`📊 測試網站: ${TEST_SITES.map(s => s.name).join(', ')}`);
  log(`📱 Slack 通知: 僅在測試失敗時發送警報`);
  log(`📊 每日報告: 每天 09:00 發送健康報告`);

  // 立即執行第一次監控
  log('\n⚡ 立即執行第一次監控...');
  await runMonitorCycle();

  // 設定定時執行監控
  log(`\n⏰ 已設定定時監控，每 ${CONFIG.INTERVAL_MS / 1000 / 60} 分鐘執行一次`);
  log('💡 按 Ctrl+C 可停止監控');

  setInterval(async () => {
    await runMonitorCycle();
    cleanupOldLogs(); // 每次執行後清理舊日誌
  }, CONFIG.INTERVAL_MS);

  // 設定每日報告（每天早上 9:00）
  const msUntilReport = getMillisecondsUntilTime(9, 0);
  const reportTime = new Date(Date.now() + msUntilReport).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  log(`\n📊 已設定每日報告，下次發送時間: ${reportTime}`);
  
  setTimeout(() => {
    sendDailyHealthReport();
    // 之後每 24 小時執行一次
    setInterval(() => {
      sendDailyHealthReport();
    }, 24 * 60 * 60 * 1000);
  }, msUntilReport);

  // 處理程序終止
  process.on('SIGINT', () => {
    log('\n\n👋 收到終止信號，正在關閉監控系統...');
    log('✅ 監控系統已停止');
    process.exit(0);
  });
}

// 執行主函數
main().catch(error => {
  console.error('❌ 監控系統錯誤:', error);
  process.exit(1);
});

