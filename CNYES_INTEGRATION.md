# CNYES (鉅亨網) 整合說明

## 📝 概述

本文檔說明如何將鉅亨網 (CNYES) 的 AIGC 功能監控整合到 AIGC-Monitor 專案中。

## ✅ 已完成的工作

### 1. 配置文件 (`config.cnyes.json`)
- ✅ 創建了完整的站點配置
- ✅ 配置了所有必要的選擇器（newsLinks, aiSection, aiQuestions 等）
- ✅ 配置了 5 個 AIGC API 端點
- ✅ 設置了合理的超時時間

### 2. 檢測模組 (`src/cnyes-aigc.js`)
- ✅ 實現了 9 步完整測試流程：
  1. 驗證 AIGC 資源載入（5 個 API 端點）
  2. 檢查『想知道更多? AI來回答』區塊
  3. 點擊 AI 問題連結
  4. 驗證 AI 回答頁面標題
  5. 確認內容正確載入
  6. 等待載入指示器消失
  7. 驗證 AI 內容生成
  8. 檢查『資料來源』區塊
  9. 檢查底部『想知道更多? AI來回答』區塊

### 3. 核心監控器更新 (`src/monitor.js`)
- ✅ 導入 `checkCnyesAIGCFunctionality` 函數
- ✅ 添加 cnyes 站點檢測邏輯
- ✅ 支援 `/news/id/` URL 格式的文章識別

### 4. 測試規格 (`tests/cnyes.spec.js`)
- ✅ 創建了 3 個完整的測試案例：
  - 所有 AIGC 功能檢查
  - AIGC API 請求追蹤
  - 完整 AI 問答流程驗證
- ✅ 設置 3 分鐘超時以應對網路延遲
- ✅ 輸出詳細的測試結果摘要

### 5. NPM Scripts (`package.json`)
- ✅ 添加 `monitor:cnyes` - 基本監控命令
- ✅ 添加 `monitor:cnyes-config` - 使用配置文件
- ✅ 添加 `test:cnyes` - Playwright 測試
- ✅ 添加 `example:cnyes` - 示例腳本

### 6. 使用示例 (`example-cnyes.js`)
- ✅ 創建了詳細的範例腳本
- ✅ 包含完整的結果輸出格式
- ✅ 支援 DEBUG 模式
- ✅ 提供清晰的執行狀態反饋

### 7. 文檔更新 (`README.md`)
- ✅ 在功能特色中添加 CNYES 支持
- ✅ 在使用方法中添加相關命令
- ✅ 添加 CNYES 配置文件說明
- ✅ 詳細說明 9 步測試流程
- ✅ 更新支援站點列表
- ✅ 添加報告目錄結構示例

## 🚀 使用方式

### 快速開始

```bash
# 1. 確保已安裝依賴
npm install

# 2. 確保已安裝 Playwright 瀏覽器
npx playwright install chromium

# 3. 執行 CNYES 監控
npm run monitor:cnyes

# 4. 或執行 Playwright 測試
npm run test:cnyes

# 5. 查看測試報告
npm run show-report
```

### 環境變數配置

```bash
# 使用環境變數
SITE_ID=cnyes BASE_URL=https://www.cnyes.com/ node src/monitor.js

# 開啟 Debug 模式（顯示瀏覽器）
SITE_ID=cnyes DEBUG=true node src/monitor.js

# 執行示例腳本
npm run example:cnyes
```

### 使用配置文件

```bash
# 使用 config.cnyes.json
npm run monitor:cnyes-config

# 或直接指定配置文件
node src/monitor.js --config=config.cnyes.json
```

## 📊 測試流程詳解

### 第一階段：網站訪問與文章導航
1. **開啟首頁**: 訪問 `https://www.cnyes.com/`
2. **找到頭條區塊**: 使用配置的選擇器定位文章連結
3. **點擊文章**: 導航到文章詳情頁
4. **驗證標題**: 確認頁面標題與點擊的連結相符

### 第二階段：AIGC 資源驗證
5. **API 監控**: 檢查 5 個 AIGC API 端點是否成功響應
   - `metadata_html`
   - `answer_html`
   - `questions_html`
   - `member_html`
   - `questions_ajax`

### 第三階段：AI 區塊檢測
6. **滾動頁面**: 使用漸進式滾動確保內容載入
7. **定位 AI 區塊**: 找到『想知道更多? AI來回答』區塊
8. **截圖記錄**: 記錄找到 AI 區塊的狀態

### 第四階段：AI 問答互動
9. **點擊問題連結**: 點擊 AI 問題（可能開新分頁）
10. **等待頁面載入**: 等待 AI 回答頁面完全載入
11. **驗證標題**: 確認 AI 回答頁面標題
12. **等待內容生成**: 等待載入指示器消失
13. **驗證 AI 內容**: 確認『Powered by Mlytics AI』存在

### 第五階段：內容完整性檢查
14. **檢查資料來源**: 驗證『資料來源』區塊存在
15. **檢查底部 AI 區塊**: 確認底部也有『想知道更多? AI來回答』
16. **生成報告**: 保存截圖和詳細報告

## 📁 新增的文件

```
AIGC-Monitor/
├── config.cnyes.json              # CNYES 站點配置
├── src/
│   └── cnyes-aigc.js              # CNYES 專用檢測模組
├── tests/
│   └── cnyes.spec.js              # CNYES 測試規格
├── example-cnyes.js               # CNYES 使用示例
└── CNYES_INTEGRATION.md           # 本說明文件
```

## 🔧 技術細節

### 選擇器策略
- **多選擇器容錯**: 每個元素配置多個選擇器，按優先級嘗試
- **文字匹配**: 使用 Playwright 的 `has-text()` 精確匹配文字
- **CSS 選擇器**: 使用 `href` 屬性匹配特定 URL 模式

### 網路監控
- **API 過濾**: 只監控 `api.aigc.mlytics.com` 域名的請求
- **響應時間**: 記錄每個請求的完整時間統計
- **狀態驗證**: 驗證 HTTP 狀態碼在 200-299 範圍內

### 錯誤處理
- **漸進式降級**: 某些檢查失敗時標記為 warning 而非 failed
- **詳細錯誤記錄**: 記錄完整的錯誤堆疊和時間戳
- **截圖證據**: 失敗步驟自動截圖保存

### 性能優化
- **漸進式滾動**: 分段滾動觸發懶載入內容
- **智能等待**: 使用 Playwright 的智能等待機制
- **並行監控**: 網路和 Console 監控並行執行

## 📈 預期結果

### 成功案例
```json
{
  "status": "success",
  "results": {
    "website_accessible": true,
    "news_article_loaded": true,
    "aigc_resources_loaded": true,
    "ai_section_found": true,
    "ai_questions_available": true,
    "ai_content_generated": true
  },
  "performance": {
    "total_duration": 45000,
    "page_load_time": 3500,
    "api_avg_response_ms": 850
  }
}
```

### 警告案例
某些非關鍵檢查失敗（如底部 AI 區塊未找到），但核心功能正常：
```json
{
  "status": "warning",
  "results": {
    "website_accessible": true,
    "news_article_loaded": true,
    "aigc_resources_loaded": true,
    "ai_section_found": false,  // 警告
    "ai_questions_available": true,
    "ai_content_generated": true
  }
}
```

## 🐛 常見問題

### Q1: AI 區塊未找到
**原因**: 頁面結構變化或載入延遲
**解決**: 
- 增加 `findAiSection` 超時時間
- 檢查並更新選擇器配置

### Q2: AI 內容生成超時
**原因**: 網路延遲或 API 響應慢
**解決**:
- 增加 `aiContentWait` 超時時間
- 檢查網路連線品質

### Q3: 文章連結點擊失敗
**原因**: 元素被遮擋或 URL 格式變化
**解決**:
- 檢查 `newsLinks` 選擇器
- 確認文章 URL 格式仍為 `/news/id/`

## 🔮 未來改進

- [ ] 支援更多鉅亨網子域名（如財經新聞、股市新聞）
- [ ] 添加更詳細的 AI 內容品質檢查
- [ ] 實現自動化回歸測試
- [ ] 添加性能基準測試
- [ ] 支援批量監控多篇文章

## 📞 支援

如有問題或建議，請：
1. 查看 [README.md](README.md) 的故障排除章節
2. 查看 [CONFIG_GUIDE.md](CONFIG_GUIDE.md) 的配置指南
3. 檢查生成的報告文件中的錯誤詳情
4. 開啟 DEBUG 模式查看詳細執行日誌

---

**版本**: 1.0.0  
**最後更新**: 2025-10-13  
**維護者**: BMad Team

