#!/usr/bin/env ts-node

/**
 * Slack 訊息測試腳本
 * 用於測試和預覽不同情境的 Slack 通知訊息
 * 
 * 使用方式：
 * 1. 設定 SLACK_WEBHOOK_URL 環境變數
 * 2. 執行: npx ts-node scripts/test-slack.ts
 */

import * as https from 'https';
import * as dotenv from 'dotenv';

dotenv.config();

interface SlackMessage {
  text: string;
  blocks: any[];
}

/**
 * 發送訊息到 Slack
 */
async function postToSlack(webhookUrl: string, payload: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
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
          console.log('✅ Slack 訊息發送成功');
          resolve();
        } else {
          console.error('❌ Slack 訊息發送失敗:', res.statusCode, data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', (err) => {
      console.error('❌ 請求錯誤:', err.message);
      reject(err);
    });
    req.write(JSON.stringify(payload));
    req.end();
  });
}

/**
 * 監控開始訊息
 */
function createMonitorStartMessage(): SlackMessage {
  const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  
  return {
    text: '🚀 AIGC 監控開始執行',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚀 AIGC 監控開始執行',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*開始時間*\n${timestamp}`
          },
          {
            type: 'mrkdwn',
            text: '*執行模式*\n定時監控'
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*測試網站清單*\n• CMoney 投資網誌\n• 數位時代 (BNext)\n• 鉅亨網 (Cnyes)\n• U-CAR 試車報告\n• U-CAR 機車頻道\n• U-CAR 售後市場'
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '📊 監控執行中... 完成後將通知測試結果'
          }
        ]
      }
    ]
  };
}

/**
 * 單一測試失敗訊息
 */
function createTestFailureMessage(siteName: string, testTitle: string, errorMessage: string, errorStack?: string): SlackMessage {
  const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  
  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '❌ AIGC 測試失敗警報',
        emoji: true
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*網站*\n${siteName}`
        },
        {
          type: 'mrkdwn',
          text: `*失敗時間*\n${timestamp}`
        }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*測試項目*\n${testTitle}`
      }
    },
    {
      type: 'divider'
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*錯誤訊息*\n\`\`\`${errorMessage.substring(0, 500)}\`\`\``
      }
    }
  ];

  if (errorStack) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Stack Trace*\n\`\`\`${errorStack.substring(0, 1000)}\`\`\``
      }
    });
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: '💡 *建議行動*: 檢查網站是否正常運作，查看測試報告了解詳細資訊'
      }
    ]
  });

  return {
    text: `❌ ${siteName} 測試失敗`,
    blocks
  };
}

/**
 * 監控完成摘要訊息
 */
function createMonitorSummaryMessage(
  totalSites: number,
  passedSites: number,
  failedSites: number,
  duration: number,
  details: { site: string; status: string; duration: number }[]
): SlackMessage {
  const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  const statusEmoji = failedSites === 0 ? '✅' : '⚠️';
  const statusText = failedSites === 0 ? '全部通過' : `${failedSites} 個失敗`;
  
  const detailsText = details.map(d => {
    const emoji = d.status === 'passed' ? '✅' : '❌';
    return `${emoji} *${d.site}* - ${d.status} (${d.duration}s)`;
  }).join('\n');

  return {
    text: `${statusEmoji} AIGC 監控完成 - ${statusText}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji} AIGC 監控完成`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*總測試數*\n${totalSites}`
          },
          {
            type: 'mrkdwn',
            text: `*通過*\n${passedSites}`
          },
          {
            type: 'mrkdwn',
            text: `*失敗*\n${failedSites}`
          },
          {
            type: 'mrkdwn',
            text: `*總時長*\n${duration}s`
          }
        ]
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*測試詳情*\n${detailsText}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*完成時間*\n${timestamp}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: failedSites === 0 
              ? '🎉 所有 AIGC 功能運作正常！' 
              : '⚠️ 請檢查失敗的測試項目，確保 AIGC 功能正常運作'
          }
        ]
      }
    ]
  };
}

/**
 * 每日健康報告訊息
 */
function createDailyHealthReport(
  totalRuns: number,
  successRate: number,
  avgDuration: number,
  issues: string[]
): SlackMessage {
  const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  const healthEmoji = successRate >= 95 ? '💚' : successRate >= 80 ? '💛' : '❤️';
  
  return {
    text: `${healthEmoji} AIGC 監控每日健康報告`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${healthEmoji} AIGC 監控每日健康報告`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*報告日期*\n${timestamp}`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*執行次數*\n${totalRuns} 次`
          },
          {
            type: 'mrkdwn',
            text: `*成功率*\n${successRate.toFixed(1)}%`
          },
          {
            type: 'mrkdwn',
            text: `*平均時長*\n${avgDuration}s`
          },
          {
            type: 'mrkdwn',
            text: `*健康狀態*\n${successRate >= 95 ? '優秀' : successRate >= 80 ? '良好' : '需關注'}`
          }
        ]
      },
      ...(issues.length > 0 ? [
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*發現的問題*\n${issues.map(i => `• ${i}`).join('\n')}`
          }
        }
      ] : []),
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '📊 此報告每日自動產生'
          }
        ]
      }
    ]
  };
}

/**
 * 主測試函數
 */
async function main() {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.error('❌ 錯誤: 請設定 SLACK_WEBHOOK_URL 環境變數');
    console.log('💡 使用方式: export SLACK_WEBHOOK_URL="your-webhook-url"');
    process.exit(1);
  }

  console.log('🧪 開始測試 Slack 訊息...\n');

  try {
    // 測試 1: 監控開始訊息
    console.log('📤 測試 1: 發送監控開始訊息...');
    await postToSlack(webhookUrl, createMonitorStartMessage());
    await delay(2000);

    // 測試 2: 測試失敗訊息
    console.log('\n📤 測試 2: 發送測試失敗訊息...');
    await postToSlack(webhookUrl, createTestFailureMessage(
      'CMoney 投資網誌',
      'End-to-end flow: News -> Article -> AIGC Answer',
      'expect(dataSourceFound).toBeTruthy()\n\nReceived: false',
      'at /Users/jojo.yao/Project/BMad/AIGC-Monitor/tests/sites/cmoney.spec.ts:220:29'
    ));
    await delay(2000);

    // 測試 3: 監控完成摘要（有失敗）
    console.log('\n📤 測試 3: 發送監控完成摘要（有失敗）...');
    await postToSlack(webhookUrl, createMonitorSummaryMessage(
      6, 5, 1, 180,
      [
        { site: 'CMoney 投資網誌', status: 'failed', duration: 35 },
        { site: '數位時代 (BNext)', status: 'passed', duration: 28 },
        { site: '鉅亨網 (Cnyes)', status: 'passed', duration: 32 },
        { site: 'U-CAR 試車報告', status: 'passed', duration: 30 },
        { site: 'U-CAR 機車頻道', status: 'passed', duration: 29 },
        { site: 'U-CAR 售後市場', status: 'passed', duration: 26 }
      ]
    ));
    await delay(2000);

    // 測試 4: 監控完成摘要（全部通過）
    console.log('\n📤 測試 4: 發送監控完成摘要（全部通過）...');
    await postToSlack(webhookUrl, createMonitorSummaryMessage(
      6, 6, 0, 175,
      [
        { site: 'CMoney 投資網誌', status: 'passed', duration: 34 },
        { site: '數位時代 (BNext)', status: 'passed', duration: 28 },
        { site: '鉅亨網 (Cnyes)', status: 'passed', duration: 32 },
        { site: 'U-CAR 試車報告', status: 'passed', duration: 30 },
        { site: 'U-CAR 機車頻道', status: 'passed', duration: 29 },
        { site: 'U-CAR 售後市場', status: 'passed', duration: 22 }
      ]
    ));
    await delay(2000);

    // 測試 5: 每日健康報告
    console.log('\n📤 測試 5: 發送每日健康報告...');
    await postToSlack(webhookUrl, createDailyHealthReport(
      24, 95.8, 175,
      [
        'Firefox 瀏覽器在 CMoney 測試中偶爾找不到資料來源區塊',
        'U-CAR 機車頻道載入時間較長（平均 35s）'
      ]
    ));

    console.log('\n✅ 所有測試訊息發送完成！');
    console.log('📱 請檢查你的 Slack 頻道確認訊息格式');
    
  } catch (error) {
    console.error('\n❌ 測試失敗:', error);
    process.exit(1);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 執行測試
main();

