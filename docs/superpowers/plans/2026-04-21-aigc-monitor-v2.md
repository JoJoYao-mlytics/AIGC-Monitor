# AIGC Monitor v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重構 AIGC Monitor 為 Site Config + Functional Helpers 架構，新增 GVM 站台監控與 Smoke 測試層，透過 GitHub Actions 雙排程自動執行。

**Architecture:** 將 7 個 ~300 行的重複 spec 抽取為三個共用 helper（site-configs.ts / aigc-flow.ts / network-monitor.ts），每個 spec 縮減至 ~25 行；smoke 測試從 SITE_CONFIGS 陣列自動生成，新增站台只需加一筆 config。以 3 個獨立 PR 遞增交付，每個 PR 合入即有可見效益。

**Tech Stack:** Playwright @playwright/test, TypeScript, GitHub Actions (runner-amd64), Slack Webhook

---

## 檔案結構

```
AIGC-Monitor/
├── tests/
│   ├── helpers/
│   │   ├── site-configs.ts       ← PR1 新建
│   │   ├── aigc-flow.ts          ← PR1 新建
│   │   └── network-monitor.ts    ← PR1 新建
│   ├── smoke/
│   │   └── all-sites.smoke.ts    ← PR2 新建
│   └── sites/
│       ├── gvm.spec.ts           ← PR2 新建
│       ├── bnext.spec.ts         ← PR3 重構
│       ├── cmoney.spec.ts        ← PR3 重構
│       ├── cnyes.spec.ts         ← PR3 重構
│       ├── ucar.spec.ts          ← PR3 重構
│       ├── ucar-am.spec.ts       ← PR3 重構
│       ├── ucar-motor.spec.ts    ← PR3 重構
│       └── ucar-news.spec.ts     ← PR3 重構
├── reporters/
│   └── slack-reporter.ts         ← 不動
└── .github/workflows/
    └── ci.yml                    ← PR1 修正
```

---

## PR1：Helper 地基 + CI 修正

### Task 1: 建立 `tests/helpers/site-configs.ts`

**Files:**
- Create: `tests/helpers/site-configs.ts`

- [ ] **Step 1: 建立檔案，寫入 SiteConfig interface 與全部 8 筆 config**

```typescript
import type { Page } from '@playwright/test';

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

export const SITE_CONFIGS: SiteConfig[] = [
  {
    name: 'gvm',
    displayName: '遠見雜誌 (GVM)',
    articleListUrl: 'https://www.gvm.com.tw/list/all',
    articleLinkPattern: 'a[href*="/article/"]',
    widgetHeadingText: /你想知道哪些|AI來解答|你可能想知道|想要深入知道嗎/,
    questionLinkPattern: 'a.question-link',
    answerUrlPattern: /aigc\.gvm\.com\.tw\/answer\//,
    usesIframe: true,
    iframePattern: 'iframe[src*="aigc.gvm.com.tw"]',
    answerContentSelector: '#answer_area',
    dataSourceSelector: '#article_area',
    relatedQuestionsSelector: '#aigc-also-ask',
    loadingIndicatorSelector: '.loading-text',
    apiUrlPatterns: [/questions_ajax/, /answer_html/],
  },
  {
    name: 'bnext',
    displayName: '數位時代 (bnext)',
    articleListUrl: 'https://www.bnext.com.tw/articles',
    articleLinkPattern: 'a[href*="/articles/"]',
    widgetHeadingText: /你想知道哪些|AI來解答|你可能想知道/,
    questionLinkPattern: 'a[href*="ai.bnext.com.tw/answer"]',
    answerUrlPattern: /ai\.bnext\.com\.tw\/answer\//,
    usesIframe: false,
    answerContentSelector: 'p, li',
    dataSourceSelector: 'h2:has-text("資料來源"), h3:has-text("資料來源")',
    relatedQuestionsSelector: 'h2:has-text("你想知道"), h3:has-text("你想知道")',
    apiUrlPatterns: [/questions_ajax/],
  },
  {
    name: 'cmoney',
    displayName: 'CMoney',
    articleListUrl: 'https://www.cmoney.tw/notes/?navId=twstock_news',
    articleLinkPattern: 'a[href*="/notes/note-detail.aspx"]',
    widgetHeadingText: /你想知道哪些|AI來解答|你可能想知道/,
    questionLinkPattern: 'a[href*="aigc"]',
    answerUrlPattern: /aigc.*cmoney\.tw|cmoney\.tw.*aigc/,
    usesIframe: false,
    answerContentSelector: 'p, li',
    dataSourceSelector: '#source_area',
    relatedQuestionsSelector: '#question_area',
    apiUrlPatterns: [/questions_ajax/],
  },
  {
    name: 'cnyes',
    displayName: '鉅亨網 (cnyes)',
    articleListUrl: 'https://news.cnyes.com/news/cat/headline',
    articleLinkPattern: 'a[href^="/news/id/"]',
    widgetHeadingText: /你想知道哪些|AI來解答|你可能想知道/,
    questionLinkPattern: 'a[href*="/news/aigc/answer"], a[href*="aigc.cnyes.com/answer"]',
    answerUrlPattern: /news\.cnyes\.com\/news\/aigc\/answer|aigc\.cnyes\.com\/answer/,
    usesIframe: false,
    answerContentSelector: 'p, li',
    dataSourceSelector: 'h2:has-text("資料來源"), h3:has-text("資料來源")',
    relatedQuestionsSelector: 'h2:has-text("你想知道"), h3:has-text("你想知道")',
    apiUrlPatterns: [/questions_ajax/],
  },
  {
    name: 'ucar',
    displayName: 'U-CAR 試車',
    articleListUrl: 'https://roadtest.u-car.com.tw/roadtest/articles',
    articleLinkPattern: 'a[href*="/roadtest/article/"]',
    widgetHeadingText: /你想知道哪些|AI來解答|你可能想知道/,
    questionLinkPattern: 'a[href*="aigc.u-car.com.tw/answer"]',
    answerUrlPattern: /aigc\.u-car\.com\.tw\/answer\//,
    usesIframe: false,
    answerContentSelector: 'p, li',
    dataSourceSelector: 'h2:has-text("資料來源"), h3:has-text("資料來源")',
    relatedQuestionsSelector: 'h2:has-text("你想知道"), h3:has-text("你想知道")',
    apiUrlPatterns: [/questions_ajax/],
  },
  {
    name: 'ucar-am',
    displayName: 'U-CAR AM',
    articleListUrl: 'https://am.u-car.com.tw/am',
    articleLinkPattern: 'a[href*="/am/article/"]',
    widgetHeadingText: /你想知道哪些|AI來解答|你可能想知道/,
    questionLinkPattern: 'a[href*="aigc.u-car.com.tw/answer"]',
    answerUrlPattern: /aigc\.u-car\.com\.tw\/answer\//,
    usesIframe: false,
    answerContentSelector: 'p, li',
    dataSourceSelector: 'h2:has-text("資料來源"), h3:has-text("資料來源")',
    relatedQuestionsSelector: 'h2:has-text("你想知道"), h3:has-text("你想知道")',
    apiUrlPatterns: [/questions_ajax/],
  },
  {
    name: 'ucar-motor',
    displayName: 'U-CAR Motor',
    articleListUrl: 'https://motor.u-car.com.tw/motor/articles',
    articleLinkPattern: 'a[href*="/motor/article/"]',
    widgetHeadingText: /你想知道哪些|AI來解答|你可能想知道/,
    questionLinkPattern: 'a[href*="aigc.u-car.com.tw/answer"]',
    answerUrlPattern: /aigc\.u-car\.com\.tw\/answer\//,
    usesIframe: false,
    answerContentSelector: 'p, li',
    dataSourceSelector: 'h2:has-text("資料來源"), h3:has-text("資料來源")',
    relatedQuestionsSelector: 'h2:has-text("你想知道"), h3:has-text("你想知道")',
    apiUrlPatterns: [/questions_ajax/],
  },
  {
    name: 'ucar-news',
    displayName: 'U-CAR News',
    articleListUrl: 'https://news.u-car.com.tw/news/articles',
    articleLinkPattern: 'main a[href*="/news/article/"]',
    widgetHeadingText: /你想知道哪些|AI來解答|你可能想知道/,
    questionLinkPattern: 'a[href*="aigc.u-car.com.tw/answer"]',
    answerUrlPattern: /aigc\.u-car\.com\.tw\/answer\//,
    usesIframe: false,
    answerContentSelector: 'p, li',
    dataSourceSelector: 'h2:has-text("資料來源"), h3:has-text("資料來源")',
    relatedQuestionsSelector: 'h2:has-text("你想知道"), h3:has-text("你想知道")',
    apiUrlPatterns: [/questions_ajax/],
  },
];
```

- [ ] **Step 2: 型別檢查**

```bash
npx tsc --noEmit
```

Expected: 無錯誤

- [ ] **Step 3: Commit**

```bash
git add tests/helpers/site-configs.ts
git commit -m "feat(pr1): add SiteConfig interface and 8-site SITE_CONFIGS array"
```

---

### Task 2: 建立 `tests/helpers/network-monitor.ts`

**Files:**
- Create: `tests/helpers/network-monitor.ts`

- [ ] **Step 1: 建立檔案**

```typescript
import type { BrowserContext, TestInfo } from '@playwright/test';

export interface ApiRecord {
  url: string;
  status: number;
  durationMs: number;
}

export function attachNetworkMonitor(context: BrowserContext, filter: RegExp): ApiRecord[] {
  const records: ApiRecord[] = [];
  const startTimes = new Map<string, number>();

  context.on('request', (request) => {
    if (filter.test(request.url())) {
      startTimes.set(request.url(), Date.now());
    }
  });

  context.on('response', (response) => {
    const url = response.url();
    if (filter.test(url)) {
      const start = startTimes.get(url) ?? Date.now();
      records.push({
        url,
        status: response.status(),
        durationMs: Date.now() - start,
      });
    }
  });

  return records;
}

export function assertApiStatus(
  records: ApiRecord[],
  pattern: RegExp,
  expectedStatus = 200
): void {
  const matched = records.filter((r) => pattern.test(r.url));
  if (matched.length === 0) {
    throw new Error(`API pattern ${pattern} was never called during this test`);
  }
  for (const record of matched) {
    if (record.status !== expectedStatus) {
      throw new Error(
        `API ${record.url} returned ${record.status}, expected ${expectedStatus}`
      );
    }
  }
}

export async function attachNetworkLog(
  records: ApiRecord[],
  testInfo: TestInfo,
  filename = 'network-log.json'
): Promise<void> {
  await testInfo.attach(filename, {
    body: JSON.stringify(records, null, 2),
    contentType: 'application/json',
  });
}
```

- [ ] **Step 2: 型別檢查**

```bash
npx tsc --noEmit
```

Expected: 無錯誤

- [ ] **Step 3: Commit**

```bash
git add tests/helpers/network-monitor.ts
git commit -m "feat(pr1): add network-monitor helper with assertApiStatus"
```

---

### Task 3: 建立 `tests/helpers/aigc-flow.ts`

**Files:**
- Create: `tests/helpers/aigc-flow.ts`

- [ ] **Step 1: 建立檔案**

```typescript
import { expect } from '@playwright/test';
import type { Page, BrowserContext, FrameLocator } from '@playwright/test';
import type { SiteConfig } from './site-configs';

export async function navigateToArticle(page: Page, config: SiteConfig): Promise<string> {
  await page.goto(config.articleListUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const articleLink = page.locator(config.articleLinkPattern).first();
  await expect(articleLink).toBeVisible({ timeout: 15_000 });
  await articleLink.click();
  await page.waitForLoadState('domcontentloaded');
  return page.title();
}

export async function findAndClickAigcQuestion(
  page: Page,
  context: BrowserContext,
  config: SiteConfig
): Promise<{ answerPage: Page; questionText: string }> {
  // 滾動找 Widget
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 1500);
  }
  await expect(page.getByText(config.widgetHeadingText).first()).toBeVisible({ timeout: 15_000 });

  // 問題數量 > 0
  const questionLinks = page.locator(config.questionLinkPattern);
  await expect(questionLinks.first()).toBeVisible({ timeout: 10_000 });
  const count = await questionLinks.count();
  expect(count).toBeGreaterThan(0);

  // 點擊第一個問題，等待新分頁
  const questionText = (await questionLinks.first().textContent()) ?? '';
  const [answerPage] = await Promise.all([
    context.waitForEvent('page'),
    questionLinks.first().click(),
  ]);
  await answerPage.waitForLoadState('domcontentloaded');

  return { answerPage, questionText };
}

export async function waitForAnswerReady(
  target: Page | FrameLocator,
  config: SiteConfig
): Promise<void> {
  if (config.loadingIndicatorSelector) {
    // 精確模式：等待 loading indicator 消失
    await expect(target.locator(config.loadingIndicatorSelector)).toBeHidden({ timeout: 30_000 });
  } else {
    // fallback：等待網路空閒
    if ('waitForLoadState' in target) {
      await (target as Page).waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {
        // soft timeout：網路未必完全空閒，繼續執行
      });
    }
  }
}

export async function assertAnswerSections(
  target: Page | FrameLocator,
  config: SiteConfig
): Promise<void> {
  const answerContent = target.locator(config.answerContentSelector).first();
  await answerContent.scrollIntoViewIfNeeded();
  await expect(answerContent).toBeVisible({ timeout: 10_000 });

  const dataSource = target.locator(config.dataSourceSelector).first();
  await dataSource.scrollIntoViewIfNeeded();
  await expect(dataSource).toBeVisible({ timeout: 10_000 });

  const relatedQuestions = target.locator(config.relatedQuestionsSelector).first();
  await relatedQuestions.scrollIntoViewIfNeeded();
  await expect(relatedQuestions).toBeVisible({ timeout: 10_000 });
}

export function getAnswerFrame(answerPage: Page, config: SiteConfig): FrameLocator | null {
  if (!config.usesIframe || !config.iframePattern) return null;
  return answerPage.frameLocator(config.iframePattern);
}
```

- [ ] **Step 2: 型別檢查**

```bash
npx tsc --noEmit
```

Expected: 無錯誤

- [ ] **Step 3: Commit**

```bash
git add tests/helpers/aigc-flow.ts
git commit -m "feat(pr1): add aigc-flow helpers (navigate, findAndClick, waitForReady, assertSections)"
```

---

### Task 4: 修正 `.github/workflows/ci.yml` + 更新 `package.json`

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `package.json`

- [ ] **Step 1: 讀取現有 ci.yml，確認路徑 bug**

```bash
cat .github/workflows/ci.yml
```

Expected: 看到 `cd AIGC-Monitor` 這一行（即路徑 bug）

- [ ] **Step 2: 覆寫 ci.yml（修正路徑 bug + 加雙排程）**

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

- [ ] **Step 3: 更新 package.json scripts 區塊**

在 `package.json` 的 `scripts` 加入（保留現有腳本，新增以下）：

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

- [ ] **Step 4: 型別檢查**

```bash
npx tsc --noEmit
```

Expected: 無錯誤

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml package.json
git commit -m "fix(pr1): remove cd bug in ci.yml, add dual-schedule smoke+monitor jobs, update package.json scripts"
```

---

## PR2：GVM spec + Smoke 測試

### Task 5: 建立 `tests/smoke/all-sites.smoke.ts`

**Files:**
- Create: `tests/smoke/all-sites.smoke.ts`

- [ ] **Step 1: 建立 smoke 目錄與檔案**

```bash
mkdir -p tests/smoke
```

```typescript
import { test, expect } from '@playwright/test';
import { SITE_CONFIGS } from '../helpers/site-configs';

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

- [ ] **Step 2: 驗證 smoke 測試可識別（不實際執行）**

```bash
npx playwright test tests/smoke/ --list
```

Expected: 列出 8 個 `[smoke] ... - widget visible` 測試名稱

- [ ] **Step 3: 型別檢查**

```bash
npx tsc --noEmit
```

Expected: 無錯誤

- [ ] **Step 4: Commit**

```bash
git add tests/smoke/all-sites.smoke.ts
git commit -m "feat(pr2): add all-sites smoke test auto-generated from SITE_CONFIGS"
```

---

### Task 6: 建立 `tests/sites/gvm.spec.ts`

**Files:**
- Create: `tests/sites/gvm.spec.ts`

- [ ] **Step 1: 建立檔案**

```typescript
import { test, expect } from '@playwright/test';
import { SITE_CONFIGS } from '../helpers/site-configs';
import {
  navigateToArticle,
  findAndClickAigcQuestion,
  waitForAnswerReady,
  assertAnswerSections,
  getAnswerFrame,
} from '../helpers/aigc-flow';
import {
  attachNetworkMonitor,
  assertApiStatus,
  attachNetworkLog,
} from '../helpers/network-monitor';

const config = SITE_CONFIGS.find((c) => c.name === 'gvm')!;

test.describe(`${config.displayName} AIGC verification`, () => {
  test('End-to-end flow: Article -> Widget -> Answer (iframe)', async ({ context, page }, testInfo) => {
    const records = attachNetworkMonitor(context, /mlytics\.com|aigc/);

    await navigateToArticle(page, config);
    const { answerPage } = await findAndClickAigcQuestion(page, context, config);

    // GVM 答案頁需等待 iframe 載入
    await answerPage.waitForLoadState('domcontentloaded');
    const frame = getAnswerFrame(answerPage, config);
    if (!frame) throw new Error('GVM iframe not found — check iframePattern in site-configs.ts');

    const target = frame;
    await waitForAnswerReady(target, config);
    await assertAnswerSections(target, config);

    // GVM 額外驗證：「觀看原始文章」CTA
    await expect(answerPage.locator('a[href*="returnarticle"]').first()).toBeVisible({ timeout: 5_000 });

    // API status 斷言
    for (const pattern of config.apiUrlPatterns) {
      assertApiStatus(records, pattern);
    }

    await attachNetworkLog(records, testInfo);
  });
});
```

- [ ] **Step 2: 型別檢查**

```bash
npx tsc --noEmit
```

Expected: 無錯誤

- [ ] **Step 3: 在本地執行 GVM spec（需要 chromium 已安裝）**

```bash
npm run test:gvm
```

Expected: 1 passed（或明確失敗訊息；若 iframe selector 不符，需對照瀏覽器 DevTools 調整 `iframePattern`）

- [ ] **Step 4: Commit**

```bash
git add tests/sites/gvm.spec.ts
git commit -m "feat(pr2): add gvm.spec.ts with iframe support and dual-API assertion"
```

---

## PR3：重構現有 7 個 spec

> PR3 目標：行為不變，內部改用 helpers。每個 spec 改寫後立即 commit；若某 spec 本地測試失敗需先修正再 commit。

### Task 7: 重構 `tests/sites/bnext.spec.ts`

**Files:**
- Modify: `tests/sites/bnext.spec.ts`

- [ ] **Step 1: 讀取現有檔案確認現有 test 名稱**

```bash
grep -n "test\." tests/sites/bnext.spec.ts | head -20
```

- [ ] **Step 2: 覆寫為 helper 版本（~25 行）**

```typescript
import { test } from '@playwright/test';
import { SITE_CONFIGS } from '../helpers/site-configs';
import {
  navigateToArticle,
  findAndClickAigcQuestion,
  waitForAnswerReady,
  assertAnswerSections,
  getAnswerFrame,
} from '../helpers/aigc-flow';
import {
  attachNetworkMonitor,
  assertApiStatus,
  attachNetworkLog,
} from '../helpers/network-monitor';

const config = SITE_CONFIGS.find((c) => c.name === 'bnext')!;

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

- [ ] **Step 3: 型別檢查 + 執行**

```bash
npx tsc --noEmit && npm run test:bnext
```

Expected: 1 passed

- [ ] **Step 4: Commit**

```bash
git add tests/sites/bnext.spec.ts
git commit -m "refactor(pr3): rewrite bnext.spec.ts using helpers (300 → 25 lines)"
```

---

### Task 8: 重構 `tests/sites/cmoney.spec.ts`

**Files:**
- Modify: `tests/sites/cmoney.spec.ts`

- [ ] **Step 1: 覆寫為 helper 版本**

```typescript
import { test } from '@playwright/test';
import { SITE_CONFIGS } from '../helpers/site-configs';
import {
  navigateToArticle,
  findAndClickAigcQuestion,
  waitForAnswerReady,
  assertAnswerSections,
  getAnswerFrame,
} from '../helpers/aigc-flow';
import {
  attachNetworkMonitor,
  assertApiStatus,
  attachNetworkLog,
} from '../helpers/network-monitor';

const config = SITE_CONFIGS.find((c) => c.name === 'cmoney')!;

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

- [ ] **Step 2: 型別檢查 + 執行**

```bash
npx tsc --noEmit && npm run test:cmoney
```

Expected: 1 passed

- [ ] **Step 3: Commit**

```bash
git add tests/sites/cmoney.spec.ts
git commit -m "refactor(pr3): rewrite cmoney.spec.ts using helpers"
```

---

### Task 9: 重構 `tests/sites/cnyes.spec.ts`

**Files:**
- Modify: `tests/sites/cnyes.spec.ts`

> cnyes 原有 iframe fallback 邏輯。v2 中 `usesIframe: false`，`getAnswerFrame` 回傳 null，target 為 answerPage 本身。若測試失敗需確認答案頁是否需要 iframe 處理。

- [ ] **Step 1: 覆寫為 helper 版本**

```typescript
import { test } from '@playwright/test';
import { SITE_CONFIGS } from '../helpers/site-configs';
import {
  navigateToArticle,
  findAndClickAigcQuestion,
  waitForAnswerReady,
  assertAnswerSections,
  getAnswerFrame,
} from '../helpers/aigc-flow';
import {
  attachNetworkMonitor,
  assertApiStatus,
  attachNetworkLog,
} from '../helpers/network-monitor';

const config = SITE_CONFIGS.find((c) => c.name === 'cnyes')!;

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

- [ ] **Step 2: 型別檢查 + 執行**

```bash
npx tsc --noEmit && npm run test:cnyes
```

Expected: 1 passed（如失敗且 iframe 為根因，在 site-configs.ts 將 cnyes `usesIframe` 改為 `true` 並加上 `iframePattern`）

- [ ] **Step 3: Commit**

```bash
git add tests/sites/cnyes.spec.ts
git commit -m "refactor(pr3): rewrite cnyes.spec.ts using helpers"
```

---

### Task 10: 重構 `tests/sites/ucar.spec.ts`

**Files:**
- Modify: `tests/sites/ucar.spec.ts`

- [ ] **Step 1: 覆寫為 helper 版本**

```typescript
import { test } from '@playwright/test';
import { SITE_CONFIGS } from '../helpers/site-configs';
import {
  navigateToArticle,
  findAndClickAigcQuestion,
  waitForAnswerReady,
  assertAnswerSections,
  getAnswerFrame,
} from '../helpers/aigc-flow';
import {
  attachNetworkMonitor,
  assertApiStatus,
  attachNetworkLog,
} from '../helpers/network-monitor';

const config = SITE_CONFIGS.find((c) => c.name === 'ucar')!;

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

- [ ] **Step 2: 型別檢查 + 執行**

```bash
npx tsc --noEmit && npm run test:ucar
```

Expected: 1 passed

- [ ] **Step 3: Commit**

```bash
git add tests/sites/ucar.spec.ts
git commit -m "refactor(pr3): rewrite ucar.spec.ts using helpers"
```

---

### Task 11: 重構 `tests/sites/ucar-am.spec.ts`

**Files:**
- Modify: `tests/sites/ucar-am.spec.ts`

- [ ] **Step 1: 覆寫為 helper 版本**

```typescript
import { test } from '@playwright/test';
import { SITE_CONFIGS } from '../helpers/site-configs';
import {
  navigateToArticle,
  findAndClickAigcQuestion,
  waitForAnswerReady,
  assertAnswerSections,
  getAnswerFrame,
} from '../helpers/aigc-flow';
import {
  attachNetworkMonitor,
  assertApiStatus,
  attachNetworkLog,
} from '../helpers/network-monitor';

const config = SITE_CONFIGS.find((c) => c.name === 'ucar-am')!;

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

- [ ] **Step 2: 型別檢查 + 執行**

```bash
npx tsc --noEmit && npm run test:ucar-am
```

Expected: 1 passed

- [ ] **Step 3: Commit**

```bash
git add tests/sites/ucar-am.spec.ts
git commit -m "refactor(pr3): rewrite ucar-am.spec.ts using helpers"
```

---

### Task 12: 重構 `tests/sites/ucar-motor.spec.ts`

**Files:**
- Modify: `tests/sites/ucar-motor.spec.ts`

- [ ] **Step 1: 覆寫為 helper 版本**

```typescript
import { test } from '@playwright/test';
import { SITE_CONFIGS } from '../helpers/site-configs';
import {
  navigateToArticle,
  findAndClickAigcQuestion,
  waitForAnswerReady,
  assertAnswerSections,
  getAnswerFrame,
} from '../helpers/aigc-flow';
import {
  attachNetworkMonitor,
  assertApiStatus,
  attachNetworkLog,
} from '../helpers/network-monitor';

const config = SITE_CONFIGS.find((c) => c.name === 'ucar-motor')!;

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

- [ ] **Step 2: 型別檢查 + 執行**

```bash
npx tsc --noEmit && npm run test:ucar-motor
```

Expected: 1 passed

- [ ] **Step 3: Commit**

```bash
git add tests/sites/ucar-motor.spec.ts
git commit -m "refactor(pr3): rewrite ucar-motor.spec.ts using helpers"
```

---

### Task 13: 重構 `tests/sites/ucar-news.spec.ts`

**Files:**
- Modify: `tests/sites/ucar-news.spec.ts`

- [ ] **Step 1: 覆寫為 helper 版本**

```typescript
import { test } from '@playwright/test';
import { SITE_CONFIGS } from '../helpers/site-configs';
import {
  navigateToArticle,
  findAndClickAigcQuestion,
  waitForAnswerReady,
  assertAnswerSections,
  getAnswerFrame,
} from '../helpers/aigc-flow';
import {
  attachNetworkMonitor,
  assertApiStatus,
  attachNetworkLog,
} from '../helpers/network-monitor';

const config = SITE_CONFIGS.find((c) => c.name === 'ucar-news')!;

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

- [ ] **Step 2: 型別檢查 + 執行**

```bash
npx tsc --noEmit && npm run test:ucar-news
```

Expected: 1 passed

- [ ] **Step 3: Commit 並驗證所有 sites 測試通過**

```bash
git add tests/sites/ucar-news.spec.ts
git commit -m "refactor(pr3): rewrite ucar-news.spec.ts using helpers"

# 執行全部 sites 確認無迴歸
npm test
```

Expected: 8 passed (含 gvm)

---

## 常見問題排查

| 症狀 | 排查方向 |
|------|---------|
| `widgetHeadingText` timeout | 文章本身可能無 widget；換一篇有 AIGC 的文章確認 selector |
| `iframePattern` 找不到 | 用 DevTools 確認 iframe 的 `src` attribute pattern |
| `assertApiStatus` 找不到 API record | `attachNetworkMonitor` 的 filter 正規式需涵蓋該 API domain |
| cnyes 答案頁 selector 失效 | 確認是否需要 `usesIframe: true`；若有 iframe，更新 site-configs.ts |
| CI 排程不觸發 smoke | `github.event.schedule` 字串必須與 cron expression 完全一致 |

---

## PR 交付檢查清單

### PR1 合入前確認
- [ ] `npx tsc --noEmit` 無錯誤
- [ ] `tests/helpers/` 三個檔案已建立
- [ ] `ci.yml` 無 `cd AIGC-Monitor` 行
- [ ] `package.json` 含 `test:smoke` script

### PR2 合入前確認
- [ ] `npx playwright test tests/smoke/ --list` 顯示 8 個 smoke test
- [ ] `npm run test:gvm` 本地通過
- [ ] GVM iframe locator 已驗證

### PR3 合入前確認
- [ ] `npm test` 全部 8 個 sites spec 通過
- [ ] 所有 spec 行數 ≤ 30 行
- [ ] 無任何 `waitForTimeout` 殘留

```bash
grep -r "waitForTimeout" tests/sites/
```

Expected: 無輸出
