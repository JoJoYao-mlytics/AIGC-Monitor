# AIGC Monitor 配置指南

本文檔詳細說明如何配置 AIGC Monitor 以監控不同的網站和 AIGC 功能。

## 配置文件結構

配置文件使用 JSON 格式，主要包含以下幾個部分：

```json
{
  "baseUrl": "網站基礎 URL",
  "timeouts": { "各種超時設置" },
  "keywords": { "關鍵字匹配規則" },
  "selectors": { "CSS 選擇器" },
  "apiEndpoints": { "API 端點" },
  "expectedConsoleMessages": [ "預期的 console 訊息" ],
  "profiles": { "多環境配置" }
}
```

## 詳細配置說明

### 1. 基礎設置 (baseUrl)

```json
{
  "baseUrl": "https://www.gugu.fund/"
}
```

指定要監控的網站基礎 URL。

### 2. 超時設置 (timeouts)

```json
{
  "timeouts": {
    "pageLoad": 60000,          // 頁面載入超時 (ms)
    "findNews": 15000,          // 尋找新聞連結超時
    "findAiSection": 10000,     // 尋找 AI 區塊超時
    "findQuestion": 10000,      // 尋找 AI 問題超時
    "closeAds": 3000,           // 關閉廣告超時
    "aiInitialWait": 5000,      // AI 初始等待時間
    "aiContentWait": 60000,     // AI 內容生成等待時間
    "aigcScriptWait": 30000,    // AIGC 腳本載入等待時間
    "aigcApiWait": 30000,       // AIGC API 回應等待時間
    "networkWait": 5000         // 網路請求等待時間
  }
}
```

### 3. 關鍵字匹配 (keywords)

```json
{
  "keywords": {
    "ai": [
      "你可能也想知道",
      "你可能也想知道...",
      "AIGC",
      "AI來解答",
      "AI解答",
      "智能問答",
      "Powered by Mlytics AI",
      "Answer / Powered by Mlytics AI"
    ]
  }
}
```

用於識別 AI 相關內容的關鍵字列表。

### 4. CSS 選擇器 (selectors)

#### 新聞區塊選擇器
```json
{
  "selectors": {
    "newsSection": [
      "text=最新發燒文章",
      ".hot-articles",
      ".news-section"
    ]
  }
}
```

#### 新聞連結選擇器
```json
{
  "newsLinks": [
    "link[href*='/blog/invest-news/']:first-of-type",
    "link[href*='/blog/concept-stocks/']:first-of-type", 
    "link[href*='/blog/']:first-of-type",
    "a[href*='/blog/invest-news/']:first-of-type",
    "a[href*='/blog/concept-stocks/']:first-of-type",
    "a[href*='/blog/']:first-of-type"
  ]
}
```

#### AI 區塊選擇器
```json
{
  "aiSection": [
    "h2:has-text('你可能也想知道')",
    "h2:has-text('你可能也想知道...')",
    "heading:has-text('你可能也想知道')",
    "heading:has-text('你可能也想知道...')",
    "[data-testid*='aigc']",
    ".ai-qa-section"
  ]
}
```

#### AI 問題選擇器
```json
{
  "aiQuestions": [
    "h2:has-text('你可能也想知道') ~ * a[href*='/ai/answer']:first-of-type",
    "h2:has-text('你可能也想知道...') ~ * a[href*='/ai/answer']:first-of-type",
    "heading:has-text('你可能也想知道') ~ * a[href*='/ai/answer']:first-of-type",
    "heading:has-text('你可能也想知道...') ~ * a[href*='/ai/answer']:first-of-type",
    "a[href*='/ai/answer']:first-of-type"
  ]
}
```

#### 載入狀態選擇器
```json
{
  "loadingTexts": [
    "text=解讀中",
    "text=載入中",
    "text=生成中",
    "text=Loading",
    "h5:has-text('解讀中')"
  ]
}
```

#### AI 內容選擇器
```json
{
  "aiContent": [
    "h1:has-text('月份亞洲製造業PMI')",
    "h3:has-text('亞洲8月製造業PMI')",
    "text=Powered by Mlytics AI",
    ".ai-answer-content"
  ]
}
```

### 5. API 端點 (apiEndpoints)

```json
{
  "apiEndpoints": {
    "questions_html": "https://api.aigc.mlytics.com/api/questions_html",
    "answer_html": "https://api.aigc.mlytics.com/api/answer_html",
    "aigc_app_js": "https://school.gugu.fund/ai/js/db_answer.min.js",
    "aigc_css": "https://school.gugu.fund/ai/css/aigc-answer.css",
    "questions_ajax": "https://api.aigc.mlytics.com/api/questions_ajax",
    "tracker": "https://api.aigc.mlytics.com/tracker",
    "member_html": "https://api.aigc.mlytics.com/api/member_html",
    "metadata_html": "https://api.aigc.mlytics.com/api/metadata_html"
  }
}
```

### 8. BNEXT 配置（示例）

```json
{
  "baseUrl": "https://www.bnext.com.tw/articles",
  "clearOnStart": false,
  "timeouts": {
    "pageLoad": 60000,
    "findNews": 45000,
    "findAiSection": 20000,
    "findQuestion": 20000,
    "aiInitialWait": 5000,
    "aiContentWait": 60000
  },
  "keywords": {
    "ai": ["你想知道哪些？AI來解答", "AIGC", "Powered by Mlytics AI"]
  },
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
    ],
    "aiQuestions": [
      "a[href*='/answer/']",
      "a[href*='ai.bnext.com.tw/answer']"
    ],
    "aiContent": [
      "text=Powered by Mlytics AI",
      "[data-testid='ai-content']"
    ]
  },
  "apiEndpoints": {
    "metadata_html": "https://api.aigc.mlytics.com/api/metadata_html",
    "answer_html": "https://api.aigc.mlytics.com/api/answer_html",
    "questions_html": "https://api.aigc.mlytics.com/api/questions_html",
    "member_html": "https://api.aigc.mlytics.com/api/member_html",
    "questions_ajax": "https://api.aigc.mlytics.com/api/questions_ajax",
    "tracker": "https://api.aigc.mlytics.com/tracker"
  }
}
```

BNEXT 注意事項：
- 有彈窗時會在 30 秒內嘗試關閉 `#custom-popup-close`。
- 若需強制乾淨狀態，在 CI 或本機設定 `CLEAR_ON_START=true`。
- 列表導頁優先使用 `href → page.goto()` 避免點擊攔截。

### 6. 預期 Console 訊息 (expectedConsoleMessages)

```json
{
  "expectedConsoleMessages": [
    "AIGC 腳本加載完成",
    "🚀 Powered by Mlytics AI",
    "👉 Learn more or get a demo: https://www.mlytics.com/lp/get-a-demo/"
  ]
}
```

### 7. 多環境配置 (profiles)

```json
{
  "profiles": {
    "gugu": {
      "name": "股股知識庫",
      "baseUrl": "https://www.gugu.fund/",
      "articleUrl": "https://school.gugu.fund/blog/invest-news/5288080656",
      "keywords": {
        "ai": [
          "你可能也想知道",
          "AIGC",
          "Powered by Mlytics AI"
        ]
      },
      "selectors": {
        "newsLinks": [
          "link[href*='/blog/']:first-of-type",
          "a[href*='/blog/']:first-of-type"
        ],
        "aiSection": [
          "h2:has-text('你可能也想知道')",
          "heading:has-text('你可能也想知道')"
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
  }
}
```

## 選擇器編寫指南

### CSS 選擇器語法

1. **基本選擇器**
   ```css
   .class-name          /* 類別選擇器 */
   #element-id          /* ID 選擇器 */
   element              /* 元素選擇器 */
   [attribute]          /* 屬性選擇器 */
   [attribute="value"]  /* 屬性值選擇器 */
   ```

2. **組合選擇器**
   ```css
   parent > child       /* 直接子元素 */
   ancestor descendant  /* 後代元素 */
   element + next       /* 相鄰兄弟元素 */
   element ~ siblings   /* 一般兄弟元素 */
   ```

3. **偽選擇器**
   ```css
   :first-of-type       /* 第一個同類型元素 */
   :last-child          /* 最後一個子元素 */
   :nth-child(n)        /* 第 n 個子元素 */
   :has(selector)       /* 包含特定元素 */
   ```

### Playwright 特殊選擇器

1. **文字內容選擇器**
   ```javascript
   "text=完整文字"           // 完全匹配
   "text*=部分文字"          // 部分匹配
   ":has-text('文字')"       // 包含文字
   ```

2. **角色選擇器**
   ```javascript
   "role=button"            // 按鈕角色
   "role=link"              // 連結角色
   "role=heading"           // 標題角色
   ```

3. **測試 ID 選擇器**
   ```javascript
   "[data-testid='test-id']"  // 測試 ID
   ```

## 配置最佳實踐

### 1. 選擇器優先級

建議按以下優先級排列選擇器：

1. **最具體的選擇器** - 使用唯一的 ID 或 data 屬性
2. **結構化選擇器** - 結合父子關係的選擇器
3. **內容選擇器** - 基於文字內容的選擇器
4. **通用選擇器** - 較寬泛的類別或元素選擇器

### 2. 超時設置建議

```json
{
  "timeouts": {
    "pageLoad": 60000,      // 較長，因為可能包含大量資源
    "findNews": 15000,      // 中等，新聞通常較快載入
    "findAiSection": 10000, // 中等，AI 區塊可能需要滾動觸發
    "aiContentWait": 60000  // 較長，AI 生成需要時間
  }
}
```

### 3. 容錯處理

- 提供多個備選選擇器
- 設置合理的超時時間
- 使用寬鬆的匹配條件

```json
{
  "selectors": {
    "aiSection": [
      "h2:has-text('你可能也想知道')",     // 精確匹配
      "heading:has-text('你可能也想知道')", // 更寬泛的匹配
      "[data-testid*='aigc']",           // 備用選擇器
      ".ai-qa-section"                   // 最後備選
    ]
  }
}
```

## 新站點配置步驟

### 1. 創建配置文件

```bash
cp config.gugu.json config.newsite.json
```

### 2. 修改基礎設置

```json
{
  "baseUrl": "https://newsite.com/",
  "profiles": {
    "newsite": {
      "name": "新站點名稱",
      "baseUrl": "https://newsite.com/"
    }
  }
}
```

### 3. 調整選擇器

根據新站點的 HTML 結構調整選擇器：

1. 使用瀏覽器開發者工具檢查元素
2. 找到對應的 CSS 選擇器
3. 測試選擇器的穩定性
4. 添加備選選擇器

### 4. 設置 API 端點

```json
{
  "apiEndpoints": {
    "aigc_app_js": "https://newsite.com/js/aigc.js",
    "tracker": "https://api.newsite.com/tracker"
  }
}
```

### 5. 測試配置

```bash
SITE_ID=newsite node src/monitor.js --config=config.newsite.json
```

## 故障排除

### 常見配置問題

1. **選擇器無效**
   - 檢查 HTML 結構是否變更
   - 使用瀏覽器開發者工具驗證選擇器
   - 添加更多備選選擇器

2. **超時問題**
   - 增加相應的超時時間
   - 檢查網路連接
   - 確認元素是否真的存在

3. **API 端點錯誤**
   - 驗證 URL 是否正確
   - 檢查網路請求是否成功
   - 確認 API 是否可訪問

### 調試技巧

1. **啟用調試模式**
   ```bash
   DEBUG=true npm run monitor:gugu
   ```

2. **檢查截圖**
   查看 `reports/` 目錄下的截圖文件

3. **查看網路請求**
   檢查生成的 JSON 報告中的 `api_requests` 部分

4. **Console 訊息**
   查看 `console_messages` 部分的輸出

## 進階配置

### 條件配置

可以根據環境變數使用不同的配置：

```javascript
// 在 config.js 中
const environment = process.env.NODE_ENV || 'production';
const configFile = `config.${siteId}.${environment}.json`;
```

### 動態選擇器

對於動態內容，可以使用更靈活的選擇器：

```json
{
  "selectors": {
    "dynamicContent": [
      "[data-component='ai-section']",
      ".content:has(h2:contains('AI'))",
      "section:has(.ai-indicator)"
    ]
  }
}
```

### 自定義驗證

可以在配置中添加自定義驗證規則：

```json
{
  "validation": {
    "minAiQuestions": 3,
    "maxLoadTime": 30000,
    "requiredKeywords": ["AIGC", "AI"]
  }
}
```

---

如需更多幫助，請查看 [README.md](README.md) 或提交 Issue。
