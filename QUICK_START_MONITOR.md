# 🚀 監控系統快速啟動指南

## 步驟 1: 設定 Slack Webhook（3 分鐘）

1. **前往 Slack API 網站**
   ```
   https://api.slack.com/messaging/webhooks
   ```

2. **創建 Slack App**
   - 點擊 "Create your Slack app"
   - 選擇 "From scratch"
   - 應用名稱: `AIGC Monitor`
   - 選擇你的工作區

3. **啟用 Incoming Webhooks**
   - 左側選單 → "Incoming Webhooks"
   - 開啟 "Activate Incoming Webhooks"
   - 點擊 "Add New Webhook to Workspace"
   - 選擇接收通知的頻道（建議創建專用頻道如 `#aigc-monitor`）

4. **複製 Webhook URL**
   ```
   https://hooks.slack.com/services/T.../B.../...
   ```

## 步驟 2: 創建環境變數檔案（1 分鐘）

在專案根目錄創建 `.env` 文件：

```bash
cd /Users/jojo.yao/Project/BMad/AIGC-Monitor
cat > .env << 'EOF'
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
EOF
```

或使用編輯器創建：

```bash
# 使用 nano
nano .env

# 使用 vim
vim .env

# 使用 VS Code
code .env
```

在文件中輸入：
```
SLACK_WEBHOOK_URL=你的Webhook_URL
```

## 步驟 3: 測試 Slack 通知（1 分鐘）

```bash
npm run test-slack
```

你應該會在 Slack 頻道收到 5 則測試訊息：
- 🚀 監控開始訊息
- ❌ 測試失敗訊息
- ⚠️ 監控完成摘要（有失敗）
- ✅ 監控完成摘要（全部通過）
- 📊 每日健康報告

## 步驟 4: 啟動監控系統（完成！）

```bash
npm run monitor
```

系統會：
1. ✅ 立即執行第一次完整測試
2. ⏰ 每小時自動執行一次
3. 📱 失敗時發送 Slack 通知
4. 📝 記錄所有執行日誌到 `logs/` 目錄

## 🎯 快速命令參考

```bash
# 測試 Slack 通知
npm run test-slack

# 啟動監控（前台運行）
npm run monitor

# 查看監控日誌
tail -f logs/monitor-$(date +%Y-%m-%d).log

# 查看測試結果
cat logs/results-$(date +%Y-%m-%d).json | jq .
```

## 🖥️ 使用 PM2 背景運行（推薦）

### 安裝 PM2
```bash
npm install -g pm2
```

### 啟動監控
```bash
cd /Users/jojo.yao/Project/BMad/AIGC-Monitor
pm2 start npm --name "aigc-monitor" -- run monitor
```

### PM2 常用命令
```bash
pm2 status              # 查看狀態
pm2 logs aigc-monitor   # 查看日誌
pm2 stop aigc-monitor   # 停止
pm2 restart aigc-monitor # 重啟
pm2 delete aigc-monitor  # 刪除

# 設定開機自動啟動
pm2 startup
pm2 save
```

## 🔍 監控運作確認

### 檢查監控是否正常運作

1. **查看進程狀態**
   ```bash
   # 使用 PM2
   pm2 status
   
   # 或查看進程
   ps aux | grep monitor
   ```

2. **查看最新日誌**
   ```bash
   # PM2 日誌
   pm2 logs aigc-monitor --lines 50
   
   # 或直接查看檔案
   tail -n 50 logs/monitor-$(date +%Y-%m-%d).log
   ```

3. **確認 Slack 通知**
   - 監控開始時應收到通知
   - 每次監控完成應收到摘要
   - 測試失敗應立即收到警報

### 驗證測試執行

```bash
# 手動執行單一測試
npm run test:cmoney

# 查看測試報告
npm run report
```

## 🐛 常見問題

### Q: Slack 沒收到通知？

**解決方案:**
```bash
# 1. 檢查環境變數
cat .env

# 2. 測試 Webhook
npm run test-slack

# 3. 檢查 Slack App 權限
# 前往 Slack API 網站確認 App 狀態
```

### Q: 監控沒有自動執行？

**解決方案:**
```bash
# 1. 確認進程運行中
pm2 status

# 2. 查看錯誤日誌
pm2 logs aigc-monitor --err

# 3. 重啟監控
pm2 restart aigc-monitor
```

### Q: 測試一直失敗？

**解決方案:**
```bash
# 1. 手動執行測試確認問題
npm run test:cmoney

# 2. 查看詳細報告
npm run report

# 3. 檢查網路連線
ping www.cmoney.tw
```

## 📊 監控數據位置

```
logs/
├── monitor-2025-10-19.log      # 執行日誌
├── results-2025-10-19.json     # 測試結果（JSON）
└── ...

test-results/                    # Playwright 測試結果
playwright-report/               # HTML 測試報告
```

## 🎉 完成！

監控系統現在已經在背景運行，會：
- ⏰ 每小時自動測試所有 AIGC 功能
- 📱 失敗時立即通知你
- 📊 記錄所有執行歷史

詳細文件請參考：
- [完整監控說明](MONITOR_README.md)
- [環境變數設定](ENV_SETUP.md)
- [專案 README](README.md)

