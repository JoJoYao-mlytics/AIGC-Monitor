# 環境變數設定說明

## 必要設定

### SLACK_WEBHOOK_URL

Slack Webhook URL，用於發送監控通知。

**取得方式:**
1. 前往 https://api.slack.com/messaging/webhooks
2. 點擊 "Create your Slack app"
3. 選擇 "From scratch"
4. 輸入應用名稱（例如：AIGC Monitor）和選擇工作區
5. 在左側選單選擇 "Incoming Webhooks"
6. 啟用 "Activate Incoming Webhooks"
7. 點擊 "Add New Webhook to Workspace"
8. 選擇要接收通知的頻道
9. 複製產生的 Webhook URL

**設定方式:**

創建 `.env` 文件在專案根目錄：

```bash
# 複製以下內容到 .env 文件
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## 選用設定

### SLACK_ENABLE

是否啟用 Slack 通知（預設：如果有設定 SLACK_WEBHOOK_URL 則自動啟用）

```bash
SLACK_ENABLE=1        # 啟用
SLACK_ENABLE=0        # 停用
```

### PLAYWRIGHT_REPORT_URL

CI 環境中的測試報告 URL（選用）

```bash
PLAYWRIGHT_REPORT_URL=https://ci.example.com/artifacts/playwright-report/index.html
```

### PLAYWRIGHT_REPORT_DIR

測試報告目錄（預設：playwright-report）

```bash
PLAYWRIGHT_REPORT_DIR=playwright-report
```

## 完整範例

創建 `.env` 文件：

```bash
# Slack 通知設定
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX

# 啟用通知（選用，預設會根據 SLACK_WEBHOOK_URL 自動判斷）
SLACK_ENABLE=1

# CI 環境設定（選用）
# PLAYWRIGHT_REPORT_URL=https://your-ci-server.com/reports
# PLAYWRIGHT_REPORT_DIR=playwright-report
```

## 安全注意事項

⚠️ **重要**: 不要將 `.env` 文件提交到 Git！

`.env` 文件已經在 `.gitignore` 中被排除，但請確保：

1. 不要在公開的地方分享 Webhook URL
2. 定期更換 Webhook URL
3. 如果 Webhook URL 洩漏，立即在 Slack 中撤銷並重新生成
4. 團隊成員各自使用自己的 `.env` 文件

## 驗證設定

設定完成後，執行以下命令測試：

```bash
# 測試 Slack 通知
npm run test-slack
```

如果設定正確，你應該會在 Slack 頻道收到 5 則測試訊息。

