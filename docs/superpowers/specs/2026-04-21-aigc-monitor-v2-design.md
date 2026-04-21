# AIGC Monitor v2 設計文件

**日期**: 2026-04-21  
**版本**: v2.0  
**作者**: JoJo Yao  
**狀態**: 已確認，待實作

---

## 背景與問題

現有 AIGC Monitor（v1.x）監控 6 個客戶站台（bnext / cnyes / cmoney / ucar / ucar-am / ucar-motor / ucar-news），每個站台各有一個約 300 行的巨型 `test()`，每小時透過本地 `monitor.ts` 依序執行。

**已確認問題：**

| 問題 | 影響 |
|-----|------|
| 每個 spec 各自複製 9 步驟流程 | 維護成本高，locator 改一處要改 7 處 |
| `waitForTimeout(2000~3000)` 大量使用 | 脆弱且緩慢，不反映真實完成狀態 |
| API 監控只過濾 URL，不驗證 `status === 200` | `questions_ajax` 502 也被當成正常 |
| 未等待 AI 串流完成，只算 `p/li count` | 回答仍在 streaming 時可能誤判為 pass |
| GVM（遠見雜誌）完全缺席 | 核心客戶無任何監控覆蓋 |
| CI workflow 路徑 bug（`cd AIGC-Monitor`） | CI 從未成功執行 |
| 無分層（smoke vs full monitor） | 無快速可用性檢查機制 |

---

## 目標

1. **新增 GVM 站台**：完整 user journey，含 iframe 處理
2. **建立 Smoke 層**：每 10 分鐘快速驗各站 widget 可見性
3. **重構現有 spec**：抽取共用 helper，消除重複，換掉 `waitForTimeout`
4. **強化 API 斷言**：明確驗證關鍵 API `status === 200`
5. **全面移轉至 GitHub Actions**：smoke + full monitor 兩個排程，`runner-amd64` 自建 runner

---

## 架構設計

### 目錄結構（v2 最終狀態）

```
AIGC-Monitor/
├── tests/
│   ├── helpers/
│   │   ├── site-configs.ts       ← 所有站台設定（PR1）
│   │   ├── aigc-flow.ts          ← 共用流程函數（PR1）
│   │   └── network-monitor.ts    ← 網路監控與 API 斷言（PR1）
│   ├── smoke/
│   │   └── all-sites.smoke.ts    ← 自動從 site-configs 生成（PR2）
│   └── sites/
│       ├── gvm.spec.ts           ← 新增，含 iframe 處理（PR2）
│       ├── bnext.spec.ts         ← 重構使用 helpers（PR3）
│       ├── cmoney.spec.ts        ← 重構（PR3）
│       ├── cnyes.spec.ts         ← 重構（PR3）
│       ├── ucar.spec.ts          ← 重構（PR3）
│       ├── ucar-am.spec.ts       ← 重構（PR3）
│       ├── ucar-motor.spec.ts    ← 重構（PR3）
│       └── ucar-news.spec.ts     ← 重構（PR3）
├── reporters/
│   └── slack-reporter.ts         ← 不動
└── .github/workflows/
    └── ci.yml                    ← 修正路徑 + 加排程（PR1）
```

### PR 切分

| PR | 內容 | 合入後立即效益 |
|----|------|-------------|
| **PR1** | `helpers/` 三個檔案 + `ci.yml` 修正 | CI 路徑 bug 修復；helper 地基就位 |
| **PR2** | `gvm.spec.ts` + `smoke/all-sites.smoke.ts` + CI 排程啟用 | GVM 開始受監控；smoke 每 10 分鐘自動跑 |
| **PR3** | 7 個現有 spec 重構為使用 helpers | 消除重複；`waitForTimeout` 全面換掉 |

PR3 對外行為不變，純粹是內部品質提升，風險最低。

---

## `helpers/site-configs.ts`

### Interface

```typescript
export interface SiteConfig {
  name: string;
  displayName: string;

  // 入口
  articleListUrl: string;
  articleLinkPattern: string;

  // Widget
  widgetHeadingText: RegExp;
  questionLinkPattern: string;

  // 答案頁
  answerUrlPattern: RegExp;
  usesIframe: boolean;
  iframePattern?: string;

  // 答案頁內容區塊 selector
  answerContentSelector: string;
  dataSourceSelector: string;
  relatedQuestionsSelector: string;

  // 串流完成信號（可選）
  loadingIndicatorSelector?: string;

  // 要斷言 status=200 的 API URL patterns
  apiUrlPatterns: RegExp[];
}

export const SITE_CONFIGS: SiteConfig[] = [ ... ];
```

### 設計決策

- `widgetHeadingText` 用 `RegExp`：各站文案略有差異（「你想知道哪些？AI來解答」/ 「AI來回答」/ 「你可能想知道」）
- `loadingIndicatorSelector` 為 optional：只有 GVM 有打字機動畫，有值時等 hidden，無值時 fallback `networkidle`
- `apiUrlPatterns` 為陣列：每個 pattern 各自斷言，一個 API 掛掉就 fail

---

## `helpers/aigc-flow.ts`

```typescript
// 步驟 1-3：導航至文章列表頁，點進第一篇文章，回傳標題
export async function navigateToArticle(page: Page, config: SiteConfig): Promise<string>

// 步驟 4-5：滾動找 Widget，斷言問題數量 > 0，點擊第一個問題，等待新分頁
export async function findAndClickAigcQuestion(
  page: Page, context: BrowserContext, config: SiteConfig
): Promise<{ answerPage: Page; questionText: string }>

// 步驟 6：等待答案串流完成
// loadingIndicatorSelector 有值 → 等 hidden；無值 → networkidle（15s soft timeout）
export async function waitForAnswerReady(
  target: Page | FrameLocator, config: SiteConfig
): Promise<void>

// 步驟 7-9：斷言 answerContent / 資料來源 / 延伸問題三個區塊可見
export async function assertAnswerSections(
  target: Page | FrameLocator, config: SiteConfig
): Promise<void>

// GVM 專用：取得 FrameLocator；usesIframe=false 回傳 null
export function getAnswerFrame(answerPage: Page, config: SiteConfig): FrameLocator | null
```

---

## `helpers/network-monitor.ts`

```typescript
export interface ApiRecord {
  url: string;
  status: number;
  durationMs: number;
}

// 掛載監聽器，回傳 live reference 陣列
export function attachNetworkMonitor(context: BrowserContext, filter: RegExp): ApiRecord[]

// 斷言指定 pattern 的 API 回傳 status 200（找不到 record 即 fail）
export function assertApiStatus(records: ApiRecord[], pattern: RegExp, expectedStatus?: number): void

// 儲存 network log 為 test attachment
export async function attachNetworkLog(records: ApiRecord[], testInfo: TestInfo, filename?: string): Promise<void>
```

---

## `smoke/all-sites.smoke.ts`

從 `SITE_CONFIGS` 自動生成，不需手動維護：

```typescript
for (const config of SITE_CONFIGS) {
  test(`[smoke] ${config.displayName} - widget visible`, async ({ page }) => {
    await page.goto(config.articleListUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const articleLink = page.locator(config.articleLinkPattern).first();
    await expect(articleLink).toBeVisible({ timeout: 10_000 });
    await articleLink.click();
    await page.waitForLoadState('domcontentloaded');
    for (let i = 0; i < 5; i++) await page.mouse.wheel(0, 1500);
    await expect(page.getByText(config.widgetHeadingText).first()).toBeVisible({ timeout: 15_000 });
  });
}
```

新增站台只需在 `site-configs.ts` 加一筆 config，smoke 自動涵蓋。

---

## `tests/sites/gvm.spec.ts`

GVM 與其他站的差異：

| | 其他站 | GVM |
|--|--|--|
| 答案頁結構 | 直接 `answerPage` | `answerPage` 內 `iframeLocator` |
| 串流完成判斷 | `networkidle` fallback | `.loading-text` hidden（精確） |
| `assertAnswerSections` 傳入 | `answerPage` | `iframeLocator` |
| 額外驗證 | 無 | 回原文 CTA `a[href*="returnarticle"]` |
| `apiUrlPatterns` | 1 個 | 2 個（questions_ajax + answer_html） |

`waitForAnswerReady` 和 `assertAnswerSections` 皆接受 `Page | FrameLocator`，GVM 傳 `iframeLocator` 不需 if/else。

---

## `.github/workflows/ci.yml`

```yaml
name: AIGC Monitor

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '*/10 * * * *'   # smoke：每 10 分鐘
    - cron: '0 * * * *'      # full monitor：每小時整點
  workflow_dispatch:

jobs:
  smoke:
    if: >
      github.event_name == 'push' ||
      github.event_name == 'pull_request' ||
      github.event_name == 'workflow_dispatch' ||
      github.event.schedule == '*/10 * * * *'
    runs-on: runner-amd64
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Run smoke tests
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        run: npx playwright test tests/smoke/ --reporter=list,./reporters/slack-reporter.ts

  monitor:
    if: github.event.schedule == '0 * * * *'
    runs-on: runner-amd64
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Run full monitor tests
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          PLAYWRIGHT_REPORT_URL: ${{ vars.PLAYWRIGHT_REPORT_URL }}
        run: npm test -- --reporter=list,html,./reporters/slack-reporter.ts
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ github.run_id }}
          path: playwright-report/
          retention-days: 7
```

---

## `package.json` 更新

```json
{
  "scripts": {
    "test": "playwright test tests/sites/",
    "test:smoke": "playwright test tests/smoke/",
    "test:gvm": "playwright test tests/sites/gvm.spec.ts",
    "test:bnext": "playwright test tests/sites/bnext.spec.ts",
    "test:cnyes": "playwright test tests/sites/cnyes.spec.ts",
    "test:cmoney": "playwright test tests/sites/cmoney.spec.ts",
    "test:ucar": "playwright test tests/sites/ucar.spec.ts",
    "test:ucar-news": "playwright test tests/sites/ucar-news.spec.ts",
    "test:ucar-motor": "playwright test tests/sites/ucar-motor.spec.ts",
    "test:ucar-am": "playwright test tests/sites/ucar-am.spec.ts",
    "test:ui": "playwright test --ui",
    "report": "playwright show-report"
  }
}
```

---

## 重構後 spec 範例（bnext）

```typescript
// 重構後：~25 行（原本 ~300 行）
import { test } from '@playwright/test';
import { SITE_CONFIGS } from '../helpers/site-configs';
import { navigateToArticle, findAndClickAigcQuestion,
         waitForAnswerReady, assertAnswerSections, getAnswerFrame } from '../helpers/aigc-flow';
import { attachNetworkMonitor, assertApiStatus, attachNetworkLog } from '../helpers/network-monitor';

const config = SITE_CONFIGS.find(c => c.name === 'bnext')!;

test.describe(`${config.displayName} AIGC verification`, () => {
  test('End-to-end flow: Article -> Widget -> Answer', async ({ context, page }, testInfo) => {
    const records = attachNetworkMonitor(context, /mlytics\.com|aigc/);
    await navigateToArticle(page, config);
    const { answerPage } = await findAndClickAigcQuestion(page, context, config);
    const target = getAnswerFrame(answerPage, config) ?? answerPage;
    await waitForAnswerReady(target, config);
    await assertAnswerSections(target, config);
    for (const pattern of config.apiUrlPatterns) assertApiStatus(records, pattern);
    await attachNetworkLog(records, testInfo);
  });
});
```

---

## 已知限制

- **動態文章選取的 false fail 風險**：smoke 與 full monitor 均動態選文章列表第一篇。若該篇文章未部署 AIGC widget（例如特定類型文章不支援），測試會在「找 Widget」步驟 timeout fail。收到 Slack 告警時需人工確認是功能異常還是文章本身無 widget。未來可透過在 `site-configs.ts` 新增 `preferredArticleUrlPattern` 來指定偏好的文章類型，降低此風險。

---

## 改善效益總結

| 指標 | v1 | v2 |
|-----|----|----|
| GVM 站台覆蓋 | ❌ 無 | ✅ 完整 E2E |
| Smoke 可用性檢查 | ❌ 無 | ✅ 每 10 分鐘 |
| 新增站台所需改動 | 複製 ~300 行 | 加一筆 config |
| `waitForTimeout` | 大量使用 | 全面移除 |
| API status 驗證 | ❌ 未驗證 | ✅ 明確斷言 200 |
| 串流完成判斷 | p/li count | `.loading-text` hidden |
| CI 執行 | ❌ 路徑 bug | ✅ 修正 |
| 各 spec 行數 | ~300 行 | ~25 行 |
