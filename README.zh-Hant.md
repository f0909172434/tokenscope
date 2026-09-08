# TokenScope｜語言模型實驗桌

**改一個條件，直接看計算怎麼變。**

三個在瀏覽器中運算的互動實驗，幫助你理解因果注意力、token 取樣和 BPE 合併。提供繁中／英文介面、逐項數值與 JSON 匯出，無須帳號或 API 金鑰。

[開始實驗](https://f0909172434.github.io/tokenscope/?lang=zh-Hant) · [English](README.md) · [數學慣例](docs/MATH.md)

![TokenScope 注意力實驗桌](docs/screenshots/attention.png)

## 可以做什麼

| 實驗     | 動手調整                               | 觀察結果                                         |
| -------- | -------------------------------------- | ------------------------------------------------ |
| 注意力   | 查詢位置、Q 向量、因果遮罩、最後一個 V | 訊號連線、完整權重矩陣、分數、輸出向量與擾動差值 |
| 生成取樣 | logits、溫度、top-k、top-p、隨機種子   | 篩選前後機率、熵、候選數和可重現的獨立抽樣       |
| BPE 分詞 | 英文、繁中、重疊配對範例或自訂語料     | 配對頻率、逐步合併、復原、符號數與完整合併歷史   |

每個實驗都有一道觀念題。切換語言或實驗不會清除目前設定；重新整理則會重設。網址只保留語言與實驗分頁，不包含你輸入的語料。

## 先試這個

1. 在注意力實驗選第三個 token。
2. 開啟「因果遮罩」，再開啟「擾動最後一個 V」：目前輸出保持不變。
3. 關閉遮罩：未來位置開始參與計算，輸出也跟著改變。
4. 匯出 JSON，檢查同一次實驗的輸入向量與權重。

## 本機執行

需要 Node.js **22.12 以上**；也支援 Node 24。

```sh
git clone https://github.com/f0909172434/tokenscope.git
cd tokenscope
npm ci
npm run dev
```

開啟 Vite 印出的本機網址。正式建置用 `npm run build`，預覽用 `npm run preview`。

Release 另提供已建置的靜態網站 ZIP。解壓縮後，可用 `python3 -m http.server 8080` 啟動；不支援直接以 `file://` 開啟 HTML。字型隨網站提供，執行時不需要外部 API 或字型服務。第一次安裝套件需要網路。

## 驗證方式

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run format:check
```

包含 43 項數值／演算法測試，以及桌面和手機尺寸的瀏覽器測試。後者檢查實際操作、種子重現、舊結果清除、Unicode、空語料、匯出、語言切換、鍵盤分頁、水平溢出與 axe 自動可及性規則。手機測試使用 Chromium 模擬視窗，不是 Safari 實機測試；自動掃描通過也不等於完整 WCAG 認證。

## 使用邊界

- **注意力**是單頭、五個位置、手工設定的二維向量；沒有訓練、位置編碼或完整 Transformer。詞語標籤不代表學到的語意。
- **取樣**對固定 logits 反覆獨立抽樣，每次不更新上下文；不是完整的自回歸生成器。
- **BPE**從 Unicode code point 開始，在空白分隔的詞內合併；沒有空白 token 或詞尾標記，不等同 GPT 的 byte-level tokenizer。介面限制 2,000 個 UTF-16 code units 和 50 步合併。
- 所有設定保存在目前頁面的記憶體中；重新整理會重設。匯出內容包含你輸入的語料，v0.1 尚未提供匯入介面。

原始文獻與程式結構見 [英文 README](README.md)。這是獨立教育專案，與 Stanford 或模型供應商無隸屬關係。

## 開源

原始程式與教學文字採 [MIT License](LICENSE)。字型保留 SIL Open Font License，詳見 [第三方授權](docs/THIRD_PARTY.md)。歡迎依 [貢獻說明](CONTRIBUTING.md) 回報問題或提交修改。
