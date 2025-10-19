# AIGC Monitor - E2E Testing Suite

自動化端到端測試套件，用於監控 AIGC（AI Generated Content）功能在各個網站的運作狀況。

## 📋 測試網站列表

| 網站 | 測試內容 | 測試命令 | 狀態 |
|------|---------|----------|------|
| **bnext.com.tw** | 數位時代 AIGC 測試 | `npm run test:bnext` | ✅ 已完成 |
| **motor.u-car.com.tw** | 機車文章 AIGC 測試 | `npm run test:ucar-motor` | ✅ 已完成 |
| **am.u-car.com.tw** | 售後市場 AIGC 測試 | `npm run test:ucar-am` | ✅ 已完成 |
| **roadtest.u-car.com.tw** | 試車報告 AIGC 測試 | `npm run test:ucar` | ✅ 已完成 |
| **cnyes.com** | 鉅亨網 AIGC 測試 | `npm run test:cnyes` | ✅ 已完成 |
| **cmoney.tw** | CMoney AIGC 測試 | `npm run test:cmoney` | ✅ 已完成 |

## 🚀 快速開始

### 安裝依賴

```bash
npm install
```

### 執行測試

```bash
# 執行所有測試
npm test

# 執行特定網站測試
npm run test:bnext         # 數位時代
npm run test:ucar-motor    # U-CAR 機車
npm run test:ucar-am       # U-CAR 售後市場
npm run test:ucar          # U-CAR 試車報告
npm run test:cnyes         # 鉅亨網
npm run test:cmoney        # CMoney

# 以 UI 模式執行（可視化）
npm run test:ui

# 查看測試報告
npm run report
```

## 🎯 測試目標

每個測試都會驗證以下 AIGC 功能流程：

1. ✅ **頁面載入** - 文章列表頁正確載入
2. ✅ **文章點擊** - 可點擊並開啟文章
3. ✅ **標題驗證** - 文章標題與連結相符
4. ✅ **AIGC 區塊** - 找到「你想知道哪些？AI來解答」區塊
5. ✅ **問題點擊** - 點擊 AIGC 問題開啟 Answer 頁面
6. ✅ **Answer 驗證** - Answer 頁面標題與問題相符
7. ✅ **內容載入** - Answer 內容完整載入
8. ✅ **資料來源** - 存在「資料來源」或 "Data Source" 區塊
9. ✅ **延伸問題** - 頁面底部有相關問題區塊

## 📊 測試報告

### 自動生成的產出

執行測試後會產生：

#### 截圖（每個測試 8 張）
```
test-results/
├── 01-articles-list.png          # 文章列表頁
├── 02-article-clicked.png        # 文章頁面
├── 03-aigc-section-found.png     # AIGC 問題區塊
├── 04-answer-page-opened.png     # Answer 頁面開啟
├── 05-answer-content.png         # Answer 內容
├── 06-data-source-section.png    # 資料來源區塊
├── 07-bottom-aigc-section.png    # 底部延伸問題
└── 08-answer-complete.png        # 完整頁面
```

#### 測試日誌
```
test-results/
├── test-summary.json    # 測試摘要
└── network-logs.json    # 網路請求記錄
```

#### HTML 報告
```bash
# 查看完整的 HTML 測試報告
npm run report
```

報告包含：
- 測試執行狀態
- 所有截圖
- Console 日誌
- 網路請求詳情
- 錯誤堆疊（如有）

## 🔍 監控項目

### 資源載入驗證

每個測試都會監控以下資源：

- ✅ **Mlytics CDN** (`mlytics.com`)
- ✅ **AIGC App 腳本** (`aigc_app.min.js`)
- ✅ **AIGC API** (`aigc.u-car.com.tw` 或對應網域)

### Console 日誌監控

監控並驗證 AIGC 初始化日誌：

```javascript
✅ AIGC widget 網域匹配，開始載入...
✅ AIGC 腳本加載完成
```

### 網路請求記錄

所有包含 `mlytics.com` 或 `aigc` 的網路請求都會被記錄，包括：
- 請求方法 (GET, POST, etc.)
- URL
- HTTP 狀態碼
- 資源類型 (script, xhr, fetch, etc.)

## 📁 專案結構

```
AIGC-Monitor/
├── README.md                           # 本文件
├── MOTOR_TEST_QUICK_START.md          # Motor 測試快速指南
├── package.json                        # 專案配置
├── playwright.config.ts                # Playwright 配置
├── tsconfig.json                       # TypeScript 配置
├── reporters/
│   └── slack-reporter.ts              # Slack 通知報告器
├── tests/
│   └── sites/
│       ├── bnext.spec.ts              # 數位時代測試 ⭐ 新增
│       ├── bnext.README.md            # 數位時代測試說明 ⭐ 新增
│       ├── ucar-motor.spec.ts         # U-CAR 機車測試
│       ├── ucar-motor.README.md       # Motor 測試詳細說明
│       ├── ucar-am.spec.ts            # U-CAR 售後市場測試
│       ├── ucar.spec.ts               # U-CAR 試車報告測試
│       ├── ucar.README.md             # U-CAR 測試說明
│       ├── cnyes.spec.ts              # 鉅亨網測試
│       └── cmoney.spec.ts             # CMoney 測試
├── test-results/                       # 測試結果輸出
└── playwright-report/                  # HTML 測試報告
```

## 🆕 最新更新

### 數位時代 (BNext) 測試（2025-10-19）

新增 **bnext.com.tw**（數位時代）的完整 AIGC E2E 測試：

**特點：**
- ✨ 完整 11 步驟驗證流程
- 📸 8 張自動截圖記錄
- 🔍 網路資源監控（Mlytics & AIGC）
- 📝 詳細測試日誌
- ✅ 彈性關鍵字匹配驗證
- 🎯 彈窗自動處理機制

**快速執行：**
```bash
npm run test:bnext
```

**詳細文件：**
- [BNext 測試說明](tests/sites/bnext.README.md)

---

### U-CAR Motor 測試（2025-10-18）

新增 **motor.u-car.com.tw**（機車頻道）的完整 AIGC E2E 測試：

**特點：**
- ✨ 完整 9 步驟驗證流程
- 📸 8 張自動截圖記錄
- 🔍 網路資源監控
- 📝 詳細測試日誌
- ✅ 關鍵字匹配驗證（更靈活的標題驗證）

**快速執行：**
```bash
npm run test:ucar-motor
```

**詳細文件：**
- [快速開始指南](MOTOR_TEST_QUICK_START.md)
- [完整測試說明](tests/sites/ucar-motor.README.md)

## 🛠️ 進階使用

### Debug 模式

```bash
# Headed 模式（可視化瀏覽器）
npx playwright test tests/sites/ucar-motor.spec.ts --headed

# Debug 模式（逐步執行）
npx playwright test tests/sites/ucar-motor.spec.ts --debug

# 只執行失敗的測試
npx playwright test --last-failed
```

### 指定瀏覽器 / 專案矩陣

```bash
# 桌面瀏覽器
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# 行動裝置（示例：Pixel 7 模擬）
npx playwright test --project=mobile-chrome
```

### 並行執行

```bash
# 指定 worker 數量
npx playwright test --workers=4

# 完全並行
npx playwright test --fully-parallel
```

### 測試報告輸出（JSON / JUnit）

執行後將在 `playwright-report/` 內生成：

- `report.json`（JSON Reporter）
- `junit.xml`（JUnit Reporter，便於 CI 彙整）

## 📋 測試配置

### Timeout 設定

```typescript
// playwright.config.ts
{
  timeout: 60_000,              // 整體測試超時：60秒
  actionTimeout: 15_000,        // 操作超時：15秒
  navigationTimeout: 30_000,    // 導航超時：30秒
}
```

### 重試機制

```typescript
// CI 環境會自動重試 1 次
retries: process.env.CI ? 1 : 0
```

## 🔔 通知設定

測試支援 Slack 通知（可選）：

```bash
# 設定環境變數
export SLACK_WEBHOOK_URL="your-webhook-url"
export SLACK_ENABLE=1                    # 啟用通知（1/true）
# optional：在 CI 中提供報告連結
export PLAYWRIGHT_REPORT_URL="https://ci.example.com/artifacts/playwright-report/index.html"
export PLAYWRIGHT_REPORT_DIR="playwright-report"

# 執行測試（會自動發送通知）
npm test
```

完成後會在測試結束時送出總結：Total/Passed/Failed/Skipped/Flaky/Duration，並附上報告連結或目錄位置。

## 🐛 疑難排解

### 常見問題

**Q: 測試找不到 AIGC 區塊？**
- A: AIGC widget 是 lazy-loaded，測試會自動滾動頁面觸發載入

**Q: Answer 頁面載入慢？**
- A: 測試設定 3 秒等待時間，如仍有問題可在 spec 中增加 `waitForTimeout`

**Q: 網路請求監控沒有捕捉到資源？**
- A: 確認網路連線正常，檢查防火牆或廣告攔截器設定

**Q: 截圖在哪裡？**
- A: 查看 `test-results/` 目錄或使用 `npm run report` 查看 HTML 報告

### 清理測試產出

```bash
# 清理測試結果
rm -rf test-results/

# 清理測試報告
rm -rf playwright-report/
```

## 📈 CI/CD 整合

### GitHub Actions 範例

```yaml
name: AIGC E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 📚 相關資源

- [Playwright 官方文件](https://playwright.dev/)
- [TypeScript 文件](https://www.typescriptlang.org/)
- [U-CAR 機車頻道](https://motor.u-car.com.tw/)
- [AIGC Answer 平台](https://aigc.u-car.com.tw/)

## 🤝 貢獻指南

### 新增測試網站

1. 在 `tests/sites/` 創建新的 `.spec.ts` 文件
2. 參考 `ucar-motor.spec.ts` 的測試結構
3. 在 `package.json` 添加測試命令
4. 創建對應的 README 文件

### 測試模板結構

```typescript
import { test, expect } from '@playwright/test';

test.describe('網站名稱 AIGC verification', () => {
  test('End-to-end flow: Article -> AIGC -> Answer', async ({ context, page }, testInfo) => {
    // 1. 設定監控
    // 2. 導航到文章列表
    // 3. 點擊文章
    // 4. 找到 AIGC 區塊
    // 5. 點擊問題
    // 6. 驗證 Answer 頁面
    // 7. 驗證資料來源
    // 8. 驗證延伸問題
    // 9. 記錄結果
  });
});
```

## 📄 授權

此專案供內部監控使用。

## 👥 維護者

- AIGC Team
- QA Team

---

**最後更新**: 2025-10-19  
**版本**: 1.3.0  
**新增**: 數位時代 (BNext) AIGC 測試

