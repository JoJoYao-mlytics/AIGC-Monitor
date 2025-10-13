# AIGC Monitor

一個專門用於監控 AIGC (AI Generated Content) 功能的自動化測試工具，基於 Playwright 構建。

## 功能特色

- 🔍 **全面監控**: 檢查 AIGC 功能的各個環節
- 🌐 **多站點支援**: 支援 GUGU、CMoney、BNext、CNYES (鉅亨網) 等多個網站監控
- 📊 **詳細報告**: 生成 HTML、JSON 和文字格式的詳細報告
- 🚀 **自動化執行**: 可集成到 CI/CD 流程中
- 📸 **截圖記錄**: 自動截圖記錄關鍵步驟
- 🔗 **網路監控**: 監控所有相關的 API 請求

## 監控項目

### 基礎功能檢查
- ✅ 網站可訪問性
- ✅ 文章頁面載入
- ✅ AI 區塊存在性（"你可能也想知道"）
- ✅ AI 問題連結可用性
- ✅ AI 內容生成功能
- ✅ AIGC 相關資源載入

### AIGC 資源驗證
- ✅ JavaScript 腳本載入 (`db_answer.min.js`)
- ✅ CSS 樣式載入 (`aigc-answer.css`)
- ✅ 追蹤器 API 呼叫 (`api.aigc.mlytics.com/tracker`)
- ✅ Console 訊息檢查
- ✅ 網路請求監控

### 功能流程測試
1. 開啟網站首頁
2. 尋找並點擊最新文章
3. 檢查 "你可能也想知道" 區塊
4. 點擊 AI 問題連結
5. 驗證新頁面標題與內容
6. 確認 AI 內容正確生成
7. 驗證所有 AIGC 相關資源載入

## 安裝與設置

### 環境需求
- Node.js >= 18
- npm 或 yarn

### 安裝步驟

```bash
# 克隆專案
git clone <repository-url>
cd AIGC-Monitor

# 安裝依賴
npm install

# 安裝 Playwright 瀏覽器
npx playwright install chromium
```

## 使用方法

### 基本使用

```bash
# 監控 GUGU 站點（使用預設 URL）
npm run monitor:gugu

# 監控 CMoney 站點
npm run monitor:cmoney

# 監控 BNext 站點
npm run monitor:bnext

# 監控 CNYES (鉅亨網) 站點
npm run monitor:cnyes

# 監控特定文章頁面
npm run monitor:gugu-article

# 使用配置文件
npm run monitor:gugu-config
npm run monitor:cmoney-config
npm run monitor:cnyes-config

# 執行示例腳本
npm run example:gugu
npm run example:cmoney
npm run example:cnyes
```

### 環境變數

```bash
# 設置站點 ID
export SITE_ID=gugu
# 或者
export SITE_ID=cmoney
# 或者
export SITE_ID=cnyes

# 設置基礎 URL
export BASE_URL=https://www.gugu.fund/
# 或者
export BASE_URL=https://www.cmoney.tw/index.html
# 或者
export BASE_URL=https://www.cnyes.com/

# 啟用調試模式
export DEBUG=true

# CI 模式（無頭瀏覽器）
export CI=true
```

### 執行測試

```bash
# 執行所有測試
npm test

# 執行特定站點測試
npm run test:gugu
npm run test:cmoney
npm run test:bnext
npm run test:cnyes

# 顯示測試報告
npm run show-report
```

## 配置文件

### 支援的站點

#### GUGU 站點配置 (`config.gugu.json`)

```json
{
  "baseUrl": "https://www.gugu.fund/",
  "timeouts": {
    "pageLoad": 60000,
    "findNews": 15000,
    "findAiSection": 10000,
    "aiContentWait": 60000
  },
  "keywords": {
    "ai": [
      "你可能也想知道",
      "AIGC",
      "Powered by Mlytics AI"
    ]
  },
  "selectors": {
    "newsLinks": [
      "a[href*='/blog/']:first-of-type"
    ],
    "aiSection": [
      "h2:has-text('你可能也想知道')"
    ],
    "aiQuestions": [
      "a[href*='/ai/answer']:first-of-type"
    ]
  },
  "apiEndpoints": {
    "aigc_app_js": "https://school.gugu.fund/ai/js/db_answer.min.js",
    "aigc_css": "https://school.gugu.fund/ai/css/aigc-answer.css",
    "tracker": "https://api.aigc.mlytics.com/tracker"
  }
}
```

#### CMoney 站點配置 (`config.cmoney.json`)

```json
{
  "baseUrl": "https://www.cmoney.tw/index.html",
  "timeouts": {
    "pageLoad": 60000,
    "findNews": 15000,
    "findAiSection": 10000,
    "aiContentWait": 60000
  },
  "keywords": {
    "ai": [
      "你可能想知道",
      "AIGC",
      "Powered by Mlytics AI"
    ]
  },
  "selectors": {
    "newsSection": [
      "text=每日精選"
    ],
    "newsLinks": [
      "a[href*='/notes/note-detail.aspx']:first-of-type"
    ],
    "aiSection": [
      "h2:has-text('你可能想知道')"
    ],
    "aiQuestions": [
      "a[href*='aigc-note.cmoney.tw']:first-of-type"
    ]
  },
  "apiEndpoints": {
    "aigc_app_js": "https://aigc-note.cmoney.tw/js/db_answer.min.js",
    "aigc_css": "https://aigc-note.cmoney.tw/css/aigc-answer.css",
    "tracker": "https://api.aigc.mlytics.com/tracker",
    "member_html": "https://api.aigc.mlytics.com/api/member_html",
    "questions_ajax": "https://api.aigc.mlytics.com/api/questions_ajax"
  }
}
```

#### CNYES (鉅亨網) 站點配置 (`config.cnyes.json`)

```json
{
  "baseUrl": "https://www.cnyes.com/",
  "timeouts": {
    "pageLoad": 60000,
    "findNews": 30000,
    "findAiSection": 20000,
    "aiContentWait": 60000
  },
  "keywords": {
    "ai": [
      "想知道更多? AI來回答",
      "AI來回答",
      "AIGC",
      "Powered by Mlytics AI"
    ]
  },
  "selectors": {
    "newsLinks": [
      "a[href*='/news/id/']:first-of-type"
    ],
    "aiSection": [
      "h2:has-text('想知道更多? AI來回答')"
    ],
    "aiQuestions": [
      "a[href*='/aigc/answer']:first-of-type"
    ]
  },
  "apiEndpoints": {
    "metadata_html": "https://api.aigc.mlytics.com/api/metadata_html",
    "answer_html": "https://api.aigc.mlytics.com/api/answer_html",
    "questions_html": "https://api.aigc.mlytics.com/api/questions_html",
    "member_html": "https://api.aigc.mlytics.com/api/member_html",
    "questions_ajax": "https://api.aigc.mlytics.com/api/questions_ajax"
  }
}
```

#### CNYES 測試流程
1. 開啟 `https://www.cnyes.com/` 首頁
2. 找到『頭條區塊』並點擊任意文章連結
3. 確認開啟的文章頁面的 title 與剛剛點擊的連結相符
4. 確認文章頁面中下方有『想知道更多? AI來回答』的區塊與內容
5. 點擊『想知道更多? AI來回答』中任意連結（會開啟新頁面）
6. 確認 AI 回答頁面 title 與剛剛點擊的相符
7. 確認內容有正確載入（等待載入指示器消失）
8. 確認 Answer 頁面中間有『資料來源』的區塊與內容
9. 確認 Answer 頁面中下方有『想知道更多? AI來回答』的區塊與內容

## 報告格式

### 輸出目錄結構
```
reports/
├── gugu/
│   └── 2025-01-15/
│       ├── screenshots/
│       │   ├── 2025-01-15-10-30-00-website-loaded.png
│       │   ├── 2025-01-15-10-30-15-ai-section-found.png
│       │   └── 2025-01-15-10-30-30-ai-content-generated.png
│       └── results/
│           ├── 2025-01-15-10-30-00-results.json
│           ├── 2025-01-15-10-30-00-report.html
│           └── 2025-01-15-10-30-00-summary.txt
├── cmoney/
│   └── 2025-01-15/
│       ├── screenshots/
│       │   ├── 2025-01-15-11-00-00-daily-picks-found.png
│       │   ├── 2025-01-15-11-00-15-ai-section-found.png
│       │   └── 2025-01-15-11-00-30-ai-answer-page.png
│       └── results/
│           ├── 2025-01-15-11-00-00-results.json
│           ├── 2025-01-15-11-00-00-report.html
│           └── 2025-01-15-11-00-00-summary.txt
└── cnyes/
    └── 2025-01-15/
        ├── screenshots/
        │   ├── 2025-01-15-14-00-00-website-loaded.png
        │   ├── 2025-01-15-14-00-15-article-loaded.png
        │   ├── 2025-01-15-14-00-30-ai-section-found.png
        │   ├── 2025-01-15-14-00-45-ai-answer-page.png
        │   └── 2025-01-15-14-01-00-ai-content-generated.png
        └── results/
            ├── 2025-01-15-14-00-00-results.json
            ├── 2025-01-15-14-00-00-report.html
            └── 2025-01-15-14-00-00-summary.txt
```

### 報告內容
- **HTML 報告**: 包含完整的視覺化結果和截圖
- **JSON 報告**: 機器可讀的詳細數據
- **摘要報告**: 簡潔的文字格式摘要

## 支援的站點

### 目前支援
- ✅ **GUGU** (`gugu`): 股股知識庫 - https://www.gugu.fund/
- ✅ **CMoney** (`cmoney`): CMoney 投資網誌 - https://www.cmoney.tw/
- ✅ **BNext** (`bnext`): 數位時代 - https://www.bnext.com.tw/
- ✅ **CNYES** (`cnyes`): 鉅亨網 - https://www.cnyes.com/

#### BNext 注意事項
- 首頁可能在 30 秒內顯示彈窗，會自動等待並嘗試關閉 `#custom-popup-close`。
- 可用 `CLEAR_ON_START=true` 於 CI 或本機啟動時清空 cookie/localStorage（避免彈窗狀態干擾）。
- 列表導頁優先以 `href → page.goto()`，避免 click 被攔截；`newsLinks` 選擇器採用寬鬆匹配。
- 相關設定於 `config.bnext.json`。

範例（節選）：

```json
{
  "baseUrl": "https://www.bnext.com.tw/articles",
  "timeouts": { "findNews": 45000 },
  "selectors": {
    "newsLinks": [
      "a[href*='/article/']",
      "a:has(h2)",
      "section a[href*='/article/']",
      "h2 a[href*='/article/']",
      "a[href*='/articles/']"
    ],
    "aiSection": [
      "h2:has-text('你想知道哪些？AI來解答')",
      "text=你想知道哪些？AI來解答"
    ]
  }
}
```

## 開發指南

### 專案結構
```
src/
├── monitor.js          # 主要監控類別
├── config.js           # 配置管理
├── gugu-aigc.js        # GUGU 專用 AIGC 檢測
├── cmoney-aigc.js      # CMoney 專用 AIGC 檢測
├── network.js          # 網路請求監控
├── utils.js            # 工具函數
└── reporter.js         # 報告生成

tests/
├── gugu.spec.js        # GUGU 站點測試規格
└── cmoney.spec.js      # CMoney 站點測試規格

config.gugu.json        # GUGU 站點配置
config.cmoney.json      # CMoney 站點配置
```

### 新增站點支援

1. 創建站點配置文件 `config.{site}.json`
2. 在 `src/` 目錄下創建站點專用模組 `{site}-aigc.js`
3. 在 `tests/` 目錄下創建測試規格 `{site}.spec.js`
4. 更新 `package.json` 中的 scripts

### 自定義檢查項目

可以通過修改配置文件來自定義：
- 超時設置
- 選擇器
- API 端點
- 關鍵字匹配
- 預期的 Console 訊息

## 故障排除

### 常見問題

**Q: 瀏覽器啟動失敗**
```bash
# 重新安裝瀏覽器
npx playwright install chromium --force
```

**Q: 找不到 AI 區塊**
- 檢查網站是否有變更
- 調整配置文件中的選擇器
- 增加等待時間

**Q: 網路請求失敗**
- 檢查網路連接
- 確認 API 端點是否正確
- 查看防火牆設置

### 調試模式

```bash
# 啟用調試模式（顯示瀏覽器）
DEBUG=true npm run monitor:gugu

# 查看詳細日誌
DEBUG=true npm test
```

## 貢獻指南

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

## 授權

MIT License - 詳見 [LICENSE](LICENSE) 文件

## 聯絡資訊

- 專案維護者: BMad Team
- 問題回報: [GitHub Issues](https://github.com/your-org/AIGC-Monitor/issues)

---

**注意**: 此工具僅用於監控和測試目的，請遵守目標網站的使用條款和 robots.txt 規則。
