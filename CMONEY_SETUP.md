# CMoney AIGC 監控設置指南

本文檔說明如何使用 AIGC Monitor 來監控 CMoney 網站的 AIGC 功能。

## 🎯 功能概述

根據前面的手動測試步驟，我們已經為 CMoney 網站創建了完整的自動化監控腳本，包含以下測試步驟：

1. ✅ 清除瀏覽器數據 (cookies/storage)
2. ✅ 開啟 CMoney 首頁 (https://www.cmoney.tw/index.html)
3. ✅ 檢查並關閉任何 popup
4. ✅ 尋找 "每日精選" 並點擊第一則新聞
5. ✅ 確認文章頁中是否有 "你可能想知道" 區域
6. ✅ 點擊 "你可能想知道" 裡的任意連結
7. ✅ 驗證新分頁的標題與點擊的連結一致
8. ✅ 確認新分頁裡的內容有正確產出
9. ✅ 驗證所有與 AIGC 相關的 request 都正常載入

## 📁 創建的文件

### 1. 配置文件
- **`config.cmoney.json`** - CMoney 站點的完整配置
  - 包含所有選擇器、API 端點、超時設置
  - 針對 CMoney 網站結構優化

### 2. 核心功能腳本
- **`src/cmoney-aigc.js`** - CMoney AIGC 功能檢測核心邏輯
  - 實現所有測試步驟的自動化
  - 包含錯誤處理和重試機制
  - 支援截圖和詳細日誌記錄

### 3. 測試腳本
- **`tests/cmoney.spec.js`** - 完整的測試套件
  - 包含 6 個不同的測試場景
  - 支援 Playwright 測試框架
  - 包含效能基準測試和錯誤處理測試

### 4. 示例腳本
- **`example-cmoney.js`** - 使用示例和演示腳本
  - 詳細的執行步驟說明
  - 豐富的輸出格式和錯誤提示
  - 包含故障排除建議

### 5. 更新的配置
- **`src/monitor.js`** - 更新主監控類別以支援 CMoney
- **`package.json`** - 添加 CMoney 相關的 npm 腳本
- **`README.md`** - 更新文檔包含 CMoney 使用說明

## 🚀 快速開始

### 安裝依賴
```bash
npm install
npx playwright install chromium
```

### 執行監控

#### 方法 1: 使用 npm 腳本
```bash
# 執行 CMoney 監控
npm run monitor:cmoney

# 使用配置文件執行
npm run monitor:cmoney-config

# 執行示例腳本（包含詳細說明）
npm run example:cmoney
```

#### 方法 2: 使用環境變數
```bash
SITE_ID=cmoney BASE_URL=https://www.cmoney.tw/index.html DEBUG=true node src/monitor.js
```

#### 方法 3: 直接執行示例
```bash
node example-cmoney.js
```

### 執行測試
```bash
# 執行 CMoney 測試套件
npm run test:cmoney

# 執行所有測試
npm run test:all

# 查看測試報告
npm run show-report
```

## 📊 監控項目

### 基礎檢查
- ✅ 網站可訪問性
- ✅ 每日精選區域存在
- ✅ 新聞文章載入
- ✅ "你可能想知道" 區域發現
- ✅ AI 問題連結可用性
- ✅ AI 內容生成功能

### AIGC 資源驗證
監控以下 AIGC 相關 API 端點：
- ✅ `https://api.aigc.mlytics.com/tracker`
- ✅ `https://aigc-note.cmoney.tw/js/db_answer.min.js`
- ✅ `https://aigc-note.cmoney.tw/css/aigc-answer.css`
- ✅ `https://api.aigc.mlytics.com/api/member_html`
- ✅ `https://api.aigc.mlytics.com/api/questions_ajax`
- ✅ `https://api.aigc.mlytics.com/api/metadata_html`
- ✅ `https://api.aigc.mlytics.com/api/answer_html`
- ✅ `https://api.aigc.mlytics.com/api/questions_html`

## 🔧 配置說明

### 主要配置項目

```json
{
  "baseUrl": "https://www.cmoney.tw/index.html",
  "timeouts": {
    "pageLoad": 60000,        // 頁面載入超時
    "findNews": 15000,        // 尋找新聞超時
    "findAiSection": 10000,   // 尋找 AI 區域超時
    "aiContentWait": 60000    // AI 內容生成超時
  },
  "selectors": {
    "newsSection": ["text=每日精選"],
    "newsLinks": ["a[href*='/notes/note-detail.aspx']:first-of-type"],
    "aiSection": ["h2:has-text('你可能想知道')"],
    "aiQuestions": ["a[href*='aigc-note.cmoney.tw']:first-of-type"]
  }
}
```

### 環境變數
- `SITE_ID=cmoney` - 指定站點 ID
- `BASE_URL=https://www.cmoney.tw/index.html` - 基礎 URL
- `DEBUG=true` - 啟用詳細日誌
- `CI=true` - CI 模式（無頭瀏覽器）

## 📈 輸出報告

執行完成後會生成以下報告：

### 目錄結構
```
reports/cmoney/2025-01-15/
├── screenshots/
│   ├── daily-picks-found.png      # 找到每日精選
│   ├── news-article-loaded.png    # 新聞文章載入
│   ├── ai-section-found.png       # AI 區域發現
│   └── ai-answer-page.png         # AI 回答頁面
└── results/
    ├── results.json               # 詳細結果數據
    ├── report.html               # 視覺化報告
    └── summary.txt               # 文字摘要
```

### 報告內容
- **成功率統計**: 各項檢查的通過率
- **效能指標**: 頁面載入時間、API 回應時間
- **網路請求**: 所有 AIGC 相關請求的狀態
- **錯誤詳情**: 失敗步驟的詳細錯誤信息
- **截圖記錄**: 關鍵步驟的視覺化記錄

## 🧪 測試場景

### 1. 完整功能流程測試
驗證從首頁到 AI 回答頁面的完整流程

### 2. 網站基本可訪問性測試
檢查網站是否可正常訪問和載入

### 3. AIGC API 資源載入測試
驗證所有 AIGC 相關 API 端點的載入狀況

### 4. AI 內容品質測試
檢查 AI 生成內容的品質和完整性

### 5. 錯誤處理和恢復測試
測試系統在異常情況下的處理能力

### 6. 效能基準測試
監控系統效能指標和回應時間

### 7. 快速煙霧測試
用於 CI/CD 的快速驗證測試

## 🔍 故障排除

### 常見問題

#### 1. 找不到 "每日精選"
**原因**: 頁面結構可能變更
**解決方案**: 
- 檢查配置文件中的 `newsSection` 選擇器
- 啟用 DEBUG 模式查看頁面結構
- 更新選擇器配置

#### 2. AIGC 功能不可用
**原因**: 功能可能暫時關閉或 API 變更
**解決方案**:
- 檢查 AIGC 相關 API 端點是否正常
- 查看網路請求日誌
- 確認 AI 區域是否正確載入

#### 3. 載入超時
**原因**: 網路連接慢或頁面載入時間長
**解決方案**:
- 增加配置中的超時時間
- 檢查網路連接
- 使用 DEBUG 模式查看詳細日誌

### 調試技巧

#### 啟用詳細日誌
```bash
DEBUG=true npm run monitor:cmoney
```

#### 查看截圖
檢查 `reports/cmoney/` 目錄下的截圖文件

#### 檢查網路請求
查看生成的 JSON 報告中的 `api_requests` 部分

## 🔄 持續集成

### GitHub Actions 示例
```yaml
name: CMoney AIGC Monitor
on:
  schedule:
    - cron: '0 */6 * * *'  # 每 6 小時執行一次
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx playwright install chromium
      - run: npm run test:cmoney
        env:
          CI: true
```

## 📞 支援

如果遇到問題，請：
1. 查看本文檔的故障排除部分
2. 檢查生成的錯誤日誌和截圖
3. 啟用 DEBUG 模式獲取更多信息
4. 查看 GitHub Issues 或創建新的 Issue

## 🎉 總結

我們已經成功為 CMoney 網站創建了完整的 AIGC 功能監控系統，包括：

- ✅ 完整的配置文件和腳本
- ✅ 自動化的測試流程
- ✅ 詳細的報告生成
- ✅ 豐富的錯誤處理
- ✅ 完善的文檔說明

現在您可以使用這些腳本來定期監控 CMoney 網站的 AIGC 功能，確保服務的穩定性和可用性。
