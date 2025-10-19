# AIGC Monitor - Site Tests

此目錄包含各個網站的 AIGC 功能端到端測試。

## 測試網站

### 1. CMoney (cmoney.spec.ts)

測試 CMoney 網站的 AIGC 整合功能。

**測試流程：**
1. 導航至 CMoney 網站
2. 悬停在「台股」選單項目
3. 驗證選單展開
4. 點擊「新聞快訊」
5. 驗證頁面正確載入
6. 點擊任意新聞文章
7. 驗證文章標題匹配
8. 確認「你可能想知道...」AIGC 區塊存在
9. 點擊 AIGC 問題（開啟新分頁）
10. 驗證 Answer 頁面標題與內容
11. 確認「資料來源」和「你想知道哪些？AI來解答」區塊

**網路資源監控：**
- 自動記錄所有 `mlytics.com` 相關請求
- 自動記錄所有 `aigc` 相關請求
- 生成 `network-cmoney-aigc.json` 檔案

**運行測試：**
```bash
npm run test:cmoney
```

### 2. Cnyes (cnyes.spec.ts)

測試鉅亨網的 AIGC 整合功能。

**運行測試：**
```bash
npm run test:cnyes
```

### 3. U-CAR (ucar.spec.ts)

測試 U-CAR 汽車網站的 AIGC 整合功能。

**測試流程：**
1. 導航至 U-CAR 新聞列表頁 (https://news.u-car.com.tw/news/articles)
2. 確認「車壇新聞」區塊存在
3. 點擊任意車壇新聞文章連結
4. 驗證文章頁面標題正確
5. 向下滾動找到「你想知道哪些？AI來解答」AIGC 區塊
6. 點擊 AIGC 區塊中的任意問題連結（開啟新分頁）
7. 驗證 Answer 頁面標題與點擊的連結相符
8. 確認 Answer 頁面內容正確載入
9. 確認頁面中間有「資料來源」區塊
10. 確認頁面下方有「你想知道哪些？AI來解答」推薦區塊

**包含測試：**
- **End-to-end flow with network capture**：完整測試流程並記錄網路請求
- **AIGC resource loading verification**：專門驗證 mlytics.com 和 AIGC 資源載入

**網路資源監控：**
- 自動記錄所有 `mlytics.com` 相關請求
- 自動記錄所有 `aigc` 相關請求
- 生成 `network-ucar-aigc.json` 檔案

**運行測試：**
```bash
npm run test:ucar
```

## 通用命令

### 運行所有測試
```bash
npm test
```

### 使用 UI 模式運行測試
```bash
npm run test:ui
```

### 查看測試報告
```bash
npm run report
```

## 測試輸出

每個測試都會生成：
- **截圖**：每個關鍵步驟的頁面截圖
- **網路日誌**：`network-{site}-aigc.json` 檔案，包含所有 mlytics.com 和 AIGC 相關請求
- **HTML 報告**：完整的測試執行報告（執行 `npm run report` 查看）

## 調試

如果測試失敗，可以：
1. 查看生成的截圖瞭解失敗的步驟
2. 檢查 `network-{site}-aigc.json` 檔案瞭解網路請求
3. 使用 `--headed` 模式查看瀏覽器執行過程：
   ```bash
   npx playwright test tests/sites/cmoney.spec.ts --headed
   ```
4. 使用 `--debug` 模式進行逐步調試：
   ```bash
   npx playwright test tests/sites/cmoney.spec.ts --debug
   ```

## 注意事項

- 測試需要網路連接
- 某些測試可能因網站內容變化而需要調整
- AIGC 區塊可能採用 lazy loading，測試中包含滾動以觸發載入
- 部分斷言使用 `expect.soft()` 以便收集所有失敗資訊而不立即停止測試

