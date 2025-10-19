# 🔍 AIGC 本機監控系統

本機持續監控系統，定時執行所有 AIGC E2E 測試並在失敗時發送 Slack 通知。

## 📋 功能特色

- ⏰ **定時執行** - 每小時自動執行所有測試
- 🔄 **順序執行** - 測試依序執行，確保資源不衝突
- 📱 **Slack 通知** - 失敗時立即發送詳細通知
- 📊 **完整日誌** - 記錄所有執行歷史與結果
- 🎯 **即時反饋** - 測試開始/完成都有通知
- 🗂️ **自動清理** - 保留最近 30 天的日誌

## 🚀 快速開始

### 1. 設定 Slack Webhook

1. 前往 [Slack API](https://api.slack.com/messaging/webhooks)
2. 創建一個新的 Incoming Webhook
3. 選擇要接收通知的頻道
4. 複製 Webhook URL

### 2. 配置環境變數

```bash
# 複製環境變數範例檔案
cp .env.example .env

# 編輯 .env 文件，設定你的 Slack Webhook URL
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 3. 測試 Slack 訊息（推薦）

在啟動監控前，先測試 Slack 通知是否正常：

```bash
npm run test-slack
```

這會發送 5 種不同類型的測試訊息到你的 Slack 頻道：
- 🚀 監控開始訊息
- ❌ 測試失敗訊息
- ⚠️ 監控完成摘要（有失敗）
- ✅ 監控完成摘要（全部通過）
- 📊 每日健康報告

### 4. 啟動監控系統

```bash
npm run monitor
```

系統會：
1. 立即執行第一次完整監控
2. 每小時自動執行一次
3. 失敗時發送 Slack 通知
4. 記錄所有執行日誌

### 5. 停止監控

按 `Ctrl+C` 即可優雅停止監控系統。

## 📸 Slack 訊息預覽

### 監控開始通知

```
🚀 AIGC 監控開始執行

開始時間: 2025-10-19 14:00:00
測試數量: 6 個網站

測試清單:
• CMoney 投資網誌
• 數位時代 (BNext)
• 鉅亨網 (Cnyes)
• U-CAR 試車報告
• U-CAR 機車頻道
• U-CAR 售後市場
```

### 測試失敗警報

```
❌ AIGC 測試失敗警報

網站: CMoney 投資網誌
失敗時間: 2025-10-19 14:15:23

錯誤訊息:
expect(dataSourceFound).toBeTruthy()
Received: false

💡 建議行動: 檢查網站是否正常運作，查看測試報告了解詳細資訊
```

### 監控完成摘要

```
✅ AIGC 監控完成

總測試數: 6
通過: 6
失敗: 0
總時長: 175s

測試詳情:
✅ CMoney 投資網誌 - passed (34s)
✅ 數位時代 (BNext) - passed (28s)
✅ 鉅亨網 (Cnyes) - passed (32s)
✅ U-CAR 試車報告 - passed (30s)
✅ U-CAR 機車頻道 - passed (29s)
✅ U-CAR 售後市場 - passed (22s)

完成時間: 2025-10-19 14:20:15

🎉 所有 AIGC 功能運作正常！
```

## 📁 監控數據

### 日誌目錄結構

```
logs/
├── monitor-2025-10-19.log          # 執行日誌
├── monitor-2025-10-20.log
├── results-2025-10-19.json         # 測試結果
├── results-2025-10-20.json
└── ...
```

### 日誌檔案格式

**執行日誌** (`monitor-YYYY-MM-DD.log`):
```
[2025-10-19T14:00:00.000Z] 🚀 開始新的監控週期
[2025-10-19T14:00:05.123Z] 🧪 開始測試: CMoney 投資網誌
[2025-10-19T14:00:39.456Z] ✅ CMoney 投資網誌 測試通過 (34s)
...
```

**測試結果** (`results-YYYY-MM-DD.json`):
```json
[
  {
    "timestamp": "2025-10-19T14:00:00.000Z",
    "totalDuration": 175,
    "results": [
      {
        "site": "CMoney 投資網誌",
        "status": "passed",
        "duration": 34,
        "timestamp": "2025-10-19T14:00:39.456Z"
      }
    ]
  }
]
```

## 🔧 進階配置

### 調整監控間隔

編輯 `scripts/monitor.ts` 中的配置：

```typescript
const CONFIG = {
  INTERVAL_MS: 60 * 60 * 1000, // 1 小時 = 60 分鐘 * 60 秒 * 1000 毫秒
  // 改為 30 分鐘：30 * 60 * 1000
  // 改為 2 小時：2 * 60 * 60 * 1000
};
```

### 調整日誌保留天數

```typescript
const CONFIG = {
  MAX_LOG_FILES: 30, // 保留 30 天
  // 改為保留 7 天：MAX_LOG_FILES: 7
  // 改為保留 90 天：MAX_LOG_FILES: 90
};
```

### 自訂測試清單

編輯 `scripts/monitor.ts` 中的測試清單：

```typescript
const TEST_SITES = [
  { name: 'CMoney 投資網誌', command: 'test:cmoney', file: 'cmoney.spec.ts' },
  // 註解掉不需要監控的網站
  // { name: '數位時代 (BNext)', command: 'test:bnext', file: 'bnext.spec.ts' },
];
```

## 🖥️ 使用 PM2 管理（推薦）

使用 PM2 可以讓監控系統在背景持續運行，即使關閉終端機也不受影響。

### 安裝 PM2

```bash
npm install -g pm2
```

### 啟動監控

```bash
pm2 start npm --name "aigc-monitor" -- run monitor
```

### 常用 PM2 命令

```bash
# 查看狀態
pm2 status

# 查看日誌
pm2 logs aigc-monitor

# 停止監控
pm2 stop aigc-monitor

# 重啟監控
pm2 restart aigc-monitor

# 刪除監控
pm2 delete aigc-monitor

# 設定開機自動啟動
pm2 startup
pm2 save
```

### PM2 監控介面

```bash
# 啟動 Web 介面（可選）
pm2 web
# 然後訪問 http://localhost:9615
```

## 🐛 疑難排解

### Q: Slack 通知沒有發送？

**A:** 檢查以下項目：
1. `.env` 文件中的 `SLACK_WEBHOOK_URL` 是否正確
2. Webhook URL 是否有效（可使用 `npm run test-slack` 測試）
3. Slack 工作區的 Webhook 應用是否被禁用
4. 檢查日誌檔案中是否有錯誤訊息

### Q: 測試一直失敗？

**A:** 可能原因：
1. 網路連線問題
2. 目標網站暫時無法訪問
3. AIGC 功能異常
4. 測試腳本需要更新

建議：
- 手動執行單一測試確認：`npm run test:cmoney`
- 查看詳細測試報告：`npm run report`
- 檢查測試截圖和錯誤日誌

### Q: 如何查看歷史執行記錄？

**A:** 所有記錄都存在 `logs/` 目錄：
```bash
# 查看今天的日誌
cat logs/monitor-$(date +%Y-%m-%d).log

# 查看今天的測試結果
cat logs/results-$(date +%Y-%m-%d).json | jq .

# 搜尋特定錯誤
grep "失敗" logs/monitor-*.log
```

### Q: 系統資源占用過高？

**A:** 優化建議：
1. 增加監控間隔（改為 2 小時或更長）
2. 減少同時監控的網站數量
3. 確保有足夠的磁碟空間（測試會產生截圖）
4. 定期清理 `test-results/` 和 `playwright-report/` 目錄

## 📊 監控最佳實踐

### 1. 監控間隔建議

- **開發/測試環境**: 15-30 分鐘
- **生產環境**: 1-2 小時
- **離峰時段**: 可降低至 3-6 小時

### 2. 通知管理

- 為監控設定專用的 Slack 頻道
- 設定頻道通知規則（例如只在失敗時通知）
- 定期檢視每日健康報告

### 3. 日誌管理

- 定期備份重要的測試結果
- 分析失敗趨勢，找出潛在問題
- 使用日誌分析工具（如 ELK Stack）進行深度分析

### 4. 團隊協作

- 文件化所有測試失敗的處理流程
- 建立值班輪替制度
- 定期檢視監控效能和調整策略

## 🔗 相關連結

- [主要 README](README.md) - 專案總覽
- [CMoney 測試說明](tests/sites/cmoney.README.md) - CMoney 測試詳情
- [Playwright 文件](https://playwright.dev/) - Playwright 官方文件
- [Slack API 文件](https://api.slack.com/) - Slack Webhook 設定

## 📅 更新歷史

- **2025-10-19** - v1.0.0
  - 初始版本
  - 支援 6 個網站監控
  - Slack 通知整合
  - 詳細日誌記錄

## 👥 維護者

- AIGC Team
- QA Team

## 📄 授權

此專案供內部監控使用。

