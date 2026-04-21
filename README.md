# AIGC Monitor v2

自動化端到端測試套件，監控 AIGC（AI Generated Content）功能在各客戶站台的運作狀況。

## 監控站台

| 站台 | 網域 | 測試命令 |
|------|------|---------|
| 遠見雜誌 (GVM) | www.gvm.com.tw | `npm run test:gvm` |
| 數位時代 (bnext) | www.bnext.com.tw | `npm run test:bnext` |
| CMoney | www.cmoney.tw | `npm run test:cmoney` |
| 鉅亨網 (cnyes) | news.cnyes.com | `npm run test:cnyes` |
| U-CAR 試車 | roadtest.u-car.com.tw | `npm run test:ucar` |
| U-CAR AM | am.u-car.com.tw | `npm run test:ucar-am` |
| U-CAR Motor | motor.u-car.com.tw | `npm run test:ucar-motor` |
| U-CAR News | news.u-car.com.tw | `npm run test:ucar-news` |

## 快速開始

```bash
npm ci
npx playwright install --with-deps chromium

# Smoke 測試（所有站台 widget 可見性，約 3 分鐘）
npm run test:smoke

# Full monitor（完整 E2E，約 15 分鐘）
npm test

# 單一站台
npm run test:gvm

# UI 模式（可視化）
npm run test:ui

# 查看報告
npm run report
```

## 測試架構

```
tests/
├── helpers/
│   ├── site-configs.ts       ← 所有站台設定（SiteConfig interface + SITE_CONFIGS 陣列）
│   ├── aigc-flow.ts          ← 共用流程函數（navigate / findAndClick / waitForReady / assertSections）
│   └── network-monitor.ts    ← 網路監控與 API status 斷言
├── smoke/
│   └── all-sites.smoke.ts    ← 自動從 SITE_CONFIGS 生成，每站 widget 可見性檢查
└── sites/
    ├── gvm.spec.ts            ← 含 iframe 處理
    ├── bnext.spec.ts
    ├── cmoney.spec.ts
    ├── cnyes.spec.ts
    ├── ucar.spec.ts
    ├── ucar-am.spec.ts
    ├── ucar-motor.spec.ts
    └── ucar-news.spec.ts
```

## 新增站台

只需在 `tests/helpers/site-configs.ts` 的 `SITE_CONFIGS` 陣列新增一筆 config，smoke 測試會自動涵蓋新站台。

```typescript
{
  name: 'new-site',
  displayName: '新站台',
  articleListUrl: 'https://example.com/articles',
  articleLinkPattern: 'a[href*="/article/"]',
  widgetHeadingText: /你想知道哪些|AI來解答/,
  questionLinkPattern: 'a[href*="aigc"]',
  answerUrlPattern: /aigc\.example\.com\/answer\//,
  usesIframe: false,
  answerContentSelector: 'p, li',
  dataSourceSelector: 'h2:has-text("資料來源")',
  relatedQuestionsSelector: 'h2:has-text("你想知道")',
  apiUrlPatterns: [/questions_ajax/],
}
```

接著建立對應的 `tests/sites/new-site.spec.ts`（複製任一現有 spec，改 `name` 即可）。

## GitHub Actions 自動排程

| Job | 觸發時機 | Timeout |
|-----|---------|---------|
| **smoke** | 每 10 分鐘 + push/PR | 10 分鐘 |
| **monitor** | 每小時整點 | 30 分鐘 |

Runner：`runner-amd64`（自建 self-hosted runner）

Smoke 失敗代表站台不可用（widget 看不到）；monitor 失敗代表完整流程異常。

收到 Slack 告警時，若文章本身沒有 widget（部分類型文章不支援 AIGC），需人工確認是否為功能異常。

## 環境變數

| 變數 | 用途 | 必填 |
|------|------|------|
| `SLACK_WEBHOOK_URL` | 失敗時發送 Slack 通知 | CI 必填 |
| `PLAYWRIGHT_REPORT_URL` | HTML 報告的對外連結（附在 Slack 通知中） | 選填 |

## Timeout 設定

| 項目 | 值 |
|------|---|
| 整體測試 | 60 秒 |
| 操作 | 15 秒 |
| 導航 | 30 秒 |
| CI 重試 | 1 次 |

## Debug

```bash
# Headed 模式
npx playwright test tests/sites/gvm.spec.ts --headed

# Debug 模式（逐步執行）
npx playwright test tests/sites/gvm.spec.ts --debug

# 只執行上次失敗的測試
npx playwright test --last-failed
```

---

**版本**: 2.0.0 — 2026-04-21
